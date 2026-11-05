import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Ícones simples, desenhados em linha (sem marcas de terceiros).
const I = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
export const IconRoute = () => <I d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />;
export const IconChat = () => <I d="M4 20l1.6-4A8 8 0 1 1 9 19.4L4 20z" />;
export const IconCamera = () => <I d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
export const IconShare = () => <I d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />;
export const IconBell = () => <I d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />;
export const IconCheck = () => <I d="M5 12.5l4.5 4.5L19 7.5" />;
export const IconPhone = () => <I d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />;
export const IconDice = () => <I d="M4 4h16v16H4zM8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01" />;

// ------------------------------------------------------------ toast
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

// ------------------------------------------------------------ modal
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, src, className = '' }: { name: string; src?: string; className?: string }) {
  if (src) return <img className={`avatar ${className}`} src={src} alt="" />;
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {ini}
    </span>
  );
}

export function useTitle(t: string) {
  useEffect(() => {
    document.title = t ? `${t} · Sertão em 2 Rodas` : 'Sertão em 2 Rodas · Agenda de eventos de motociclismo';
  }, [t]);
}
