/** Local-only resume text extraction. File bytes never leave this browser module. */
export const RESUME_IMPORT_LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  textCharacters: 100_000,
  pdfPages: 20,
  zipEntries: 256,
  zipExpandedBytes: 12 * 1024 * 1024,
  documentXmlBytes: 2 * 1024 * 1024,
  pdfMilliseconds: 15_000,
} as const;

export type ResumeFileType = 'txt' | 'docx' | 'pdf';
export interface ImportedResume {
  fileName: string;
  fileType: ResumeFileType;
  text: string;
  warnings: string[];
  pageCount: number | null;
}
export type ResumeFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;
export class ResumeImportError extends Error {
  constructor(message: string) { super(message); this.name = 'ResumeImportError'; }
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Resume import cancelled.', 'AbortError');
}

function usableText(value: string): string {
  const text = value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  if (text.length > RESUME_IMPORT_LIMITS.textCharacters) throw new ResumeImportError('This document contains too much text. Use a resume with at most 100,000 characters.');
  if (text.replace(/\s/g, '').length < 40 || (text.match(/\p{L}/gu)?.length ?? 0) < 20 || (text.match(/\S+/g)?.length ?? 0) < 5) {
    throw new ResumeImportError('No usable resume text was found. Scanned or image-only PDFs need selectable text; export a text-based PDF, DOCX or TXT instead.');
  }
  return text;
}

function decodeText(bytes: Uint8Array): string {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  let text: string;
  try { text = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw new ResumeImportError('This text file has an unsupported encoding. Save it as UTF-8 TXT and try again.'); }
  const controls = [...text].filter(character => { const code = character.charCodeAt(0); return code < 32 && ![9, 10, 13].includes(code); }).length;
  if (text.includes(String.fromCharCode(0)) || controls > text.length * 0.005) throw new ResumeImportError('This does not look like a plain-text file. Choose a TXT, DOCX or text-based PDF resume.');
  return text;
}

interface ZipDocumentEntry { compressedSize: number; expandedSize: number; crc: number; }

/** Reject ZIP64, split/encrypted archives and excessive declared expansion before inflating. */
function inspectDocxArchive(bytes: Uint8Array): ZipDocumentEntry {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
  }
  if (end < 0) throw new ResumeImportError('The DOCX archive is incomplete or damaged. Export a fresh DOCX or TXT file.');
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || count === 0xffff || size === 0xffffffff || start === 0xffffffff) {
    throw new ResumeImportError('Split or ZIP64 DOCX archives are not supported. Export a standard DOCX or TXT file.');
  }
  if (!count || count > RESUME_IMPORT_LIMITS.zipEntries || start + size > end) throw new ResumeImportError('The DOCX archive has too many parts or invalid archive metadata.');
  let offset = start, expanded = 0, document: ZipDocumentEntry | null = null, contentTypes = false;
  const names = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > start + size || view.getUint32(offset, true) !== 0x02014b50) throw new ResumeImportError('The DOCX archive metadata is damaged.');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true), expandedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > start + size || compressedSize > bytes.length || expandedSize === 0xffffffff) throw new ResumeImportError('The DOCX archive contains invalid part sizes.');
    if (flags & 0x41) throw new ResumeImportError('Password-protected DOCX files are not supported. Save an unprotected copy or use TXT.');
    if (method !== 0 && method !== 8) throw new ResumeImportError('This DOCX uses unsupported compression. Export a standard DOCX or TXT file.');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (names.has(name)) throw new ResumeImportError('The DOCX archive contains duplicate parts. Export a fresh copy.');
    names.add(name);
    expanded += expandedSize;
    if (expanded > RESUME_IMPORT_LIMITS.zipExpandedBytes) throw new ResumeImportError('This DOCX expands beyond the safe import limit. Remove large embedded content or export TXT.');
    if (name === '[Content_Types].xml') contentTypes = true;
    if (name === 'word/document.xml') {
      if (!expandedSize || expandedSize > RESUME_IMPORT_LIMITS.documentXmlBytes) throw new ResumeImportError('This DOCX document text exceeds the safe import limit. Export a shorter TXT resume.');
      document = { compressedSize, expandedSize, crc: view.getUint32(offset + 16, true) };
    }
    offset = next;
  }
  if (offset !== start + size || !contentTypes || !document) throw new ResumeImportError('This is not a supported DOCX document. Older .doc files need to be saved as .docx or .txt.');
  return document;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function docxText(bytes: Uint8Array, signal?: AbortSignal): Promise<string> {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new ResumeImportError('This Word file is encrypted or uses the older .doc format. Save an unprotected .docx or .txt copy.');
  const expected = inspectDocxArchive(bytes);
  const { Unzip, UnzipInflate } = await import('fflate');
  checkAborted(signal);
  const chunks: Uint8Array[] = [];
  let actualSize = 0, completed = false, found = false;
  const unzip = new Unzip(file => {
    if (file.name !== 'word/document.xml') return;
    if (found) throw new ResumeImportError('The DOCX archive contains duplicate document text.');
    found = true;
    file.ondata = (error, chunk, final) => {
      // fflate forwards errors thrown by its synchronous output handler back to
      // ondata. Preserve our bound/cancellation error instead of obscuring it.
      if (error instanceof ResumeImportError || (error instanceof DOMException && error.name === 'AbortError')) throw error;
      if (error) throw new ResumeImportError('The DOCX document text is damaged. Export a fresh copy.');
      checkAborted(signal);
      actualSize += chunk.length;
      if (actualSize > RESUME_IMPORT_LIMITS.documentXmlBytes || actualSize > expected.expandedSize) throw new ResumeImportError('The DOCX expands beyond its declared text limit. Export a fresh TXT copy.');
      chunks.push(chunk);
      completed = final;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    // Small compressed chunks also bound each synchronous inflater output allocation.
    for (let offset = 0; offset < bytes.length; offset += 4096) {
      checkAborted(signal);
      unzip.push(bytes.subarray(offset, Math.min(bytes.length, offset + 4096)), offset + 4096 >= bytes.length);
    }
  } catch (error) {
    if (error instanceof ResumeImportError || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    throw new ResumeImportError('The DOCX archive could not be read. Export a fresh DOCX or TXT copy.');
  }
  if (!found || !completed || actualSize !== expected.expandedSize) throw new ResumeImportError('The DOCX text is incomplete. Export a fresh copy.');
  const xmlBytes = new Uint8Array(actualSize);
  let offset = 0;
  for (const chunk of chunks) { xmlBytes.set(chunk, offset); offset += chunk.length; }
  if (crc32(xmlBytes) !== expected.crc) throw new ResumeImportError('The DOCX text failed its integrity check. Export a fresh copy.');
  let xml: string;
  try { xml = new TextDecoder('utf-8', { fatal: true }).decode(xmlBytes); }
  catch { throw new ResumeImportError('The DOCX text uses an unsupported encoding. Export UTF-8 TXT instead.'); }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new ResumeImportError('This DOCX contains unsupported XML declarations. Export a plain DOCX or TXT resume.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  const namespaces = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
  if (document.getElementsByTagName('parsererror').length || root.localName !== 'document' || !namespaces.has(root.namespaceURI || '')) throw new ResumeImportError('The DOCX document XML is damaged or unsupported.');
  const parts: string[] = [];
  let nodes = 0;
  const walk = (element: Element, depth = 0) => {
    if (++nodes > 100_000 || depth > 128) throw new ResumeImportError('The DOCX text structure is too complex. Export a plain TXT resume.');
    const word = namespaces.has(element.namespaceURI || '');
    if (word && element.localName === 'del') return;
    if (word && element.localName === 't') { parts.push(element.textContent || ''); return; }
    if (word && ['tab', 'br', 'cr'].includes(element.localName)) parts.push(element.localName === 'tab' ? '\t' : '\n');
    for (const child of element.children) walk(child, depth + 1);
    if (word && ['p', 'tr'].includes(element.localName)) parts.push('\n');
  };
  walk(root);
  return parts.join('');
}

async function pdfText(bytes: Uint8Array, signal?: AbortSignal): Promise<{ text: string; pageCount: number; emptyPages: number }> {
  if (!new TextDecoder('ascii').decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new ResumeImportError('This file is not a readable PDF. Export a text-based PDF, DOCX or TXT copy.');
  const [pdf, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  checkAborted(signal);
  pdf.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdf.getDocument({
    data: bytes, disableFontFace: true, useSystemFonts: true,
    useWorkerFetch: false, useWasm: false, isImageDecoderSupported: false,
    stopAtErrors: true, maxImageSize: 0, disableAutoFetch: true, disableStream: true, verbosity: 0,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new ResumeImportError('PDF extraction took too long. Export a simpler text-based PDF or TXT resume.')); void task.destroy().catch(() => {}); }, RESUME_IMPORT_LIMITS.pdfMilliseconds);
    abort = () => { reject(new DOMException('Resume import cancelled.', 'AbortError')); void task.destroy().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
  const extract = async () => {
    const document = await task.promise;
    if (document.numPages > RESUME_IMPORT_LIMITS.pdfPages) throw new ResumeImportError('Choose a resume PDF with at most 20 pages.');
    let text = '', emptyPages = 0;
    for (let number = 1; number <= document.numPages; number++) {
      checkAborted(signal);
      const page = await document.getPage(number);
      try {
        const content = await page.getTextContent();
        let pageText = '';
        for (const item of content.items) {
          if ('str' in item) pageText += item.str + (item.hasEOL ? '\n' : ' ');
          if (text.length + pageText.length > RESUME_IMPORT_LIMITS.textCharacters) throw new ResumeImportError('This PDF contains too much text. Use a resume with at most 100,000 characters.');
        }
        if (!pageText.trim()) emptyPages++;
        text += pageText + '\n\n';
      } finally { page.cleanup(); }
    }
    return { text, pageCount: document.numPages, emptyPages };
  };
  try { return await Promise.race([extract(), interrupted]); }
  catch (error) {
    if (error instanceof ResumeImportError || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') throw new ResumeImportError('Password-protected PDFs are not supported. Save an unprotected copy or use DOCX/TXT.');
    throw new ResumeImportError('This PDF could not be read. It may be damaged, protected or use unsupported text encoding. Export a text-based PDF, DOCX or TXT copy.');
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
    await task.destroy().catch(() => {});
  }
}

export async function importResumeFile(file: ResumeFile, options: { signal?: AbortSignal } = {}): Promise<ImportedResume> {
  const { signal } = options;
  checkAborted(signal);
  if (!file.size) throw new ResumeImportError('This file is empty. Choose a TXT, DOCX or text-based PDF resume.');
  if (file.size > RESUME_IMPORT_LIMITS.fileBytes) throw new ResumeImportError('Choose a resume smaller than 5 MiB.');
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  if (!extension || !['txt', 'docx', 'pdf'].includes(extension)) throw new ResumeImportError('Choose a .txt, .docx or .pdf resume. Older .doc files and images are not supported.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkAborted(signal);
  if (bytes.length !== file.size || bytes.length > RESUME_IMPORT_LIMITS.fileBytes) throw new ResumeImportError('The file size changed or exceeded 5 MiB. Choose the file again.');
  const fileType = extension as ResumeFileType, warnings: string[] = [];
  let text: string, pageCount: number | null = null;
  if (fileType === 'txt') text = decodeText(bytes);
  else if (fileType === 'docx') {
    text = await docxText(bytes, signal);
    warnings.push('DOCX extraction reads the document body. Check headers, footers, lists and text boxes in the editable text before confirming.');
  } else {
    const result = await pdfText(bytes, signal);
    text = result.text; pageCount = result.pageCount;
    warnings.push('PDF text order can differ from the visual layout, especially with columns and tables. Review the extracted text.');
    if (result.emptyPages) warnings.push(`${result.emptyPages} PDF page${result.emptyPages === 1 ? ' had' : 's had'} no selectable text. Image content was not analyzed.`);
  }
  checkAborted(signal);
  return { fileName: file.name.slice(0, 240), fileType, text: usableText(text), warnings, pageCount };
}
