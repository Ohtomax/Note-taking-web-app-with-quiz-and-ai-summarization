import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}

export function Modal({ title, children, onClose, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="surface m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-5 text-ink shadow-xl backdrop:bg-slate-950/50 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 id={id} className="pt-1 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <button
          className="action w-10 shrink-0 px-0"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
