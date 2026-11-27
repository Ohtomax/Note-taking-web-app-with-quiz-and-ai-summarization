import { useEffect, useId, useRef, type ReactNode } from 'react';

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
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/30"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          className="rounded border border-slate-300 px-3 py-1"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
