import * as Dialog from '@radix-ui/react-dialog';
import { StudioGlass } from './glass/StudioGlass';
import { X, LoaderCircle } from 'lucide-react';
import { cloneElement, createContext, isValidElement, useContext, useId, useRef, type ReactElement, type ReactNode } from 'react';
export const NoticeContext = createContext('');
export function Modal({ open, onClose, title, description, children, wide = false, drawer = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean; drawer?: boolean }) {
  const notice = useContext(NoticeContext);
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={v => !v && onClose()}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className={`modal ${wide ? 'modal-wide' : ''} ${drawer ? 'drawer' : ''}`}
    onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
    onCloseAutoFocus={event => { if (returnFocus.current?.isConnected && returnFocus.current !== document.body) { event.preventDefault(); returnFocus.current.focus(); } }}>
    <div className="modal-heading studio-surface studio-panel"><StudioGlass tone="panel" /><div><Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div><Dialog.Close className="icon-button" aria-label="Close dialog"><X size={20} /></Dialog.Close></div>
    {!description && <Dialog.Description className="sr-only">View and update your job search details.</Dialog.Description>}
    <div className="modal-body">{children}{notice && <p className="dialog-feedback" role="status">{notice}</p>}</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state"><div className="empty-symbol">↗</div><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function Busy() { return <div className="page-loading" role="status"><LoaderCircle className="spin" /> Loading your workspace…</div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { const id = useId(); return <div className="field"><label htmlFor={id}>{label}</label>{isValidElement(children) ? cloneElement(children as ReactElement<{ id: string; 'aria-describedby'?: string }>, { id, 'aria-describedby': hint ? `${id}-hint` : undefined }) : children}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>; }
export function CompanyMark({ company, size = '' }: { company: string; size?: string }) { const words = company.match(/[\p{L}\p{N}]+/gu) || []; const initials = words[0] && /^[A-Z0-9]{2,3}$/.test(words[0]) ? words[0] : words.map(word => word[0]).slice(0, 2).join('').toUpperCase(); const colors = ['mint', 'peach', 'lavender', 'blue', 'cream']; const index = [...company].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length; return <span className={`company-mark ${colors[index]} ${size}`} aria-hidden="true">{initials}</span>; }
export function StageBadge({ stage }: { stage: string }) { return <span className={`stage-badge stage-${stage.toLowerCase()}`}><span />{stage}</span>; }
export function safeUrl(value: string | null | undefined) { try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
export function download(name: string, content: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
export function formatDate(date: string | null | undefined) { if (!date) return 'Not set'; return new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
export function dateToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
