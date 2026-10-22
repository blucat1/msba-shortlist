import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { importResumeFile, RESUME_IMPORT_LIMITS, type ResumeFile } from '../../src/lib/resume-import';

const pdf = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: '' } }));
vi.mock('pdfjs-dist', () => pdf);
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/local-pdf-worker.mjs' }));
const text = 'Example Student\nEducation\nMaster of Science in Business Analytics, expected May 2027\nSkills\nSQL, Python, Tableau\nProjects\n- Built a SQL dashboard that reduced reporting time by 30%.\n';
const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml = (inside: string) => `<w:document xmlns:w="${wordNamespace}"><w:body>${inside}</w:body></w:document>`;
const paragraph = (value: string) => `<w:p><w:r><w:t>${value}</w:t></w:r></w:p>`;
const body = xml(paragraph('Example Student') + paragraph('Education: Business Analytics') + paragraph('Skills: SQL, Python and Tableau') + paragraph('Built a dashboard to reduce reporting time by 30%.'));
const file = (name: string, bytes: Uint8Array = strToU8(text)): ResumeFile => ({ name, size: bytes.length, arrayBuffer: async () => new Uint8Array(bytes).buffer });
const docx = (documentXml = body, extra: Record<string, Uint8Array> = {}) => zipSync({ '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8(documentXml), ...extra });
const pdfFile = () => file('resume.pdf', strToU8('%PDF-1.7\nsynthetic test input; PDF parsing is mocked only in these unit cases'));
let destroy: ReturnType<typeof vi.fn>, cleanup: ReturnType<typeof vi.fn>, getPage: ReturnType<typeof vi.fn>;
beforeEach(() => {
  destroy = vi.fn(async () => {}); cleanup = vi.fn();
  getPage = vi.fn(async () => ({ getTextContent: async () => ({ items: [{ str: text, hasEOL: true }] }), cleanup }));
  pdf.getDocument.mockReset().mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage }), destroy });
});
afterEach(() => { vi.useRealTimers(); });

function centralOffset(bytes: Uint8Array, name: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length - 46; offset++) if (view.getUint32(offset, true) === 0x02014b50) {
    const length = view.getUint16(offset + 28, true);
    if (new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + length)) === name) return offset;
  }
  throw new Error('Synthetic ZIP fixture entry missing');
}

describe('bounded local resume input', () => {
  it('reads UTF-8 text, normalizes line endings and preserves literal untrusted markup', async () => {
    const imported = await importResumeFile(file('Resume.TXT', strToU8(text.replace(/\n/g, '\r\n') + '<script>not executed</script>')));
    expect(imported.fileType).toBe('txt'); expect(imported.text).not.toContain('\r');
    expect(imported.text).toContain('<script>not executed</script>'); expect(imported.pageCount).toBeNull();
  });
  it('accepts BOM-marked UTF-16 without interpreting it as binary', async () => {
    const bytes = new Uint8Array(2 + text.length * 2); bytes.set([0xff, 0xfe]);
    for (let index = 0; index < text.length; index++) new DataView(bytes.buffer).setUint16(2 + index * 2, text.charCodeAt(index), true);
    expect((await importResumeFile(file('resume.txt', bytes))).text).toContain('Business Analytics');
  });
  it('rejects unsupported files, empty inputs and files over5MiB before reading', async () => {
    await expect(importResumeFile(file('resume.doc'))).rejects.toThrow('Older .doc');
    await expect(importResumeFile(file('resume.txt', new Uint8Array()))).rejects.toThrow('empty');
    const read = vi.fn();
    await expect(importResumeFile({ name: 'resume.pdf', size: RESUME_IMPORT_LIMITS.fileBytes + 1, arrayBuffer: read })).rejects.toThrow('5 MiB');
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects invalid encoding, binary control characters and insufficient text', async () => {
    await expect(importResumeFile(file('resume.txt', new Uint8Array([0xff, 0xfd, 0xab])))).rejects.toThrow('encoding');
    await expect(importResumeFile(file('resume.txt', strToU8(text + String.fromCharCode(0))))).rejects.toThrow('plain-text');
    await expect(importResumeFile(file('resume.txt', strToU8('SQL Python')))).rejects.toThrow('No usable resume text');
  });
  it('rejects excessive text, changed sizes and already-cancelled reads', async () => {
    await expect(importResumeFile(file('resume.txt', strToU8('Resume skills '.repeat(9000))))).rejects.toThrow('100,000');
    await expect(importResumeFile({ ...file('resume.txt'), size: text.length + 10 })).rejects.toThrow('size changed');
    const controller = new AbortController(); controller.abort();
    await expect(importResumeFile(file('resume.txt'), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('DOCX archive and XML extraction', () => {
  it('extracts actual zipped Word body text and warns about unparsed layout/headers', async () => {
    const imported = await importResumeFile(file('resume.docx', docx()));
    expect(imported.text).toContain('Skills: SQL, Python and Tableau\nBuilt a dashboard');
    expect(imported.warnings[0]).toContain('headers, footers'); expect(imported.fileType).toBe('docx');
  });
  it('preserves breaks/tabs and literal text but omits tracked deleted content', async () => {
    const source = xml(paragraph('Example Student Business Analytics resume') + '<w:p><w:r><w:t>SQL</w:t><w:tab/><w:t>Python</w:t><w:br/><w:t>&lt;script&gt;literal&lt;/script&gt;</w:t></w:r><w:del><w:r><w:delText>DELETED</w:delText></w:r></w:del></w:p>');
    const imported = await importResumeFile(file('resume.docx', docx(source)));
    expect(imported.text).toContain('SQL\tPython\n<script>literal</script>'); expect(imported.text).not.toContain('DELETED');
  });
  it('rejects missing Word parts, damaged archives and older/encrypted compound Word files', async () => {
    await expect(importResumeFile(file('resume.docx', zipSync({ 'other.txt': strToU8(text) })))).rejects.toThrow('not a supported DOCX');
    await expect(importResumeFile(file('resume.docx', docx().subarray(0, 40)))).rejects.toThrow('incomplete or damaged');
    await expect(importResumeFile(file('resume.docx', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])))).rejects.toThrow('encrypted or uses the older');
  });
  it('rejects encrypted ZIP metadata and unsupported compression before expansion', async () => {
    const encrypted = docx(), offset = centralOffset(encrypted, 'word/document.xml');
    new DataView(encrypted.buffer).setUint16(offset + 8, 1, true);
    await expect(importResumeFile(file('resume.docx', encrypted))).rejects.toThrow('Password-protected');
    const unsupported = docx(); new DataView(unsupported.buffer).setUint16(centralOffset(unsupported, 'word/document.xml') + 10, 99, true);
    await expect(importResumeFile(file('resume.docx', unsupported))).rejects.toThrow('unsupported compression');
  });
  it('rejects declared ZIP bombs and actual expansion beyond forged metadata', async () => {
    const bomb = docx(); new DataView(bomb.buffer).setUint32(centralOffset(bomb, 'word/document.xml') + 24, RESUME_IMPORT_LIMITS.zipExpandedBytes + 1, true);
    await expect(importResumeFile(file('resume.docx', bomb))).rejects.toThrow('safe import limit');
    const forged = docx(); new DataView(forged.buffer).setUint32(centralOffset(forged, 'word/document.xml') + 24, 10, true);
    await expect(importResumeFile(file('resume.docx', forged))).rejects.toThrow('declared text limit');
  });
  it('rejects too many ZIP entries, excessive document XML and ZIP64 archives', async () => {
    const many = docx(body, Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`extra/${index}.txt`, new Uint8Array()])));
    await expect(importResumeFile(file('resume.docx', many))).rejects.toThrow('too many parts');
    const big = docx(); new DataView(big.buffer).setUint32(centralOffset(big, 'word/document.xml') + 24, RESUME_IMPORT_LIMITS.documentXmlBytes + 1, true);
    await expect(importResumeFile(file('resume.docx', big))).rejects.toThrow('document text exceeds');
    const zip64 = docx(); new DataView(zip64.buffer).setUint32(zip64.length - 22 + 16, 0xffffffff, true);
    await expect(importResumeFile(file('resume.docx', zip64))).rejects.toThrow('ZIP64');
  });
  it('rejects CRC corruption and malformed/entity-declaring XML', async () => {
    const corrupted = docx(); new DataView(corrupted.buffer).setUint32(centralOffset(corrupted, 'word/document.xml') + 16, 0, true);
    await expect(importResumeFile(file('resume.docx', corrupted))).rejects.toThrow('integrity check');
    await expect(importResumeFile(file('resume.docx', docx('<!DOCTYPE x [<!ENTITY bad "oops">]>' + body)))).rejects.toThrow('XML declarations');
    await expect(importResumeFile(file('resume.docx', docx(body.slice(0, -10))))).rejects.toThrow('XML is damaged');
    await expect(importResumeFile(file('resume.docx', docx('<document>' + paragraph(text) + '</document>')))).rejects.toThrow('XML is damaged');
  });
  it('rejects excessively deep XML without recursively exhausting the reader', async () => {
    const deep = xml('<w:p>'.repeat(140) + '<w:t>Example Student SQL Python resume with many details</w:t>' + '</w:p>'.repeat(140));
    await expect(importResumeFile(file('resume.docx', docx(deep)))).rejects.toThrow('too complex');
  });
});

describe('PDF selectable-text reader and lifecycle', () => {
  it('lazy-loads the local worker, extracts text and cleans every page/document', async () => {
    const result = await importResumeFile(pdfFile());
    expect(result.text).toContain('Business Analytics'); expect(result.pageCount).toBe(1);
    expect(pdf.GlobalWorkerOptions.workerSrc).toBe('/local-pdf-worker.mjs');
    expect(pdf.getDocument).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Uint8Array), useWorkerFetch: false, useWasm: false, disableFontFace: true, verbosity: 0 }));
    expect(cleanup).toHaveBeenCalledOnce(); expect(destroy).toHaveBeenCalled();
  });
  it('rejects false PDF signatures without initializing PDFJS', async () => {
    await expect(importResumeFile(file('resume.pdf', strToU8(text)))).rejects.toThrow('not a readable PDF');
    expect(pdf.getDocument).not.toHaveBeenCalled();
  });
  it('rejects scans and password protection with clear local errors', async () => {
    getPage.mockResolvedValue({ getTextContent: async () => ({ items: [] }), cleanup });
    await expect(importResumeFile(pdfFile())).rejects.toThrow('Scanned or image-only');
    expect(destroy).toHaveBeenCalled();
    pdf.getDocument.mockReturnValue({ promise: Promise.reject({ name: 'PasswordException' }), destroy });
    await expect(importResumeFile(pdfFile())).rejects.toThrow('Password-protected PDFs');
  });
  it('rejects page/text limits and releases resources on extraction errors', async () => {
    pdf.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 21, getPage }), destroy });
    await expect(importResumeFile(pdfFile())).rejects.toThrow('at most 20 pages'); expect(getPage).not.toHaveBeenCalled();
    pdf.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage }), destroy });
    getPage.mockResolvedValue({ getTextContent: async () => ({ items: [{ str: 'x'.repeat(100_001), hasEOL: false }] }), cleanup });
    await expect(importResumeFile(pdfFile())).rejects.toThrow('too much text'); expect(cleanup).toHaveBeenCalled(); expect(destroy).toHaveBeenCalled();
  });
  it('warns about partially image-only PDFs rather than pretending every page was analyzed', async () => {
    pdf.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage }), destroy });
    getPage.mockResolvedValueOnce({ getTextContent: async () => ({ items: [{ str: text, hasEOL: true }] }), cleanup }).mockResolvedValueOnce({ getTextContent: async () => ({ items: [] }), cleanup });
    const result = await importResumeFile(pdfFile()); expect(result.warnings.join(' ')).toContain('1 PDF page had no selectable text');
  });
  it('aborts a pending PDF and destroys its worker task', async () => {
    pdf.getDocument.mockReturnValue({ promise: new Promise(() => {}), destroy });
    const controller = new AbortController(), result = importResumeFile(pdfFile(), { signal: controller.signal });
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(pdf.getDocument).toHaveBeenCalled()); controller.abort(); await assertion;
    expect(destroy).toHaveBeenCalled();
  });
  it('times out a stalled PDF task without retaining the task', async () => {
    vi.useFakeTimers(); pdf.getDocument.mockReturnValue({ promise: new Promise(() => {}), destroy });
    const result = importResumeFile(pdfFile()), assertion = expect(result).rejects.toThrow('took too long');
    await vi.waitFor(() => expect(pdf.getDocument).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(RESUME_IMPORT_LIMITS.pdfMilliseconds); await assertion; expect(destroy).toHaveBeenCalled();
  });
});
