import { Modal } from '@/components/ui/Modal';
import type { Project, ProjectInput } from '@/types/workspace';

interface ProjectFormProps {
  project?: Project;
  busy: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (input: ProjectInput) => void;
}

export function ProjectForm({
  project,
  busy,
  error,
  onClose,
  onSubmit,
}: ProjectFormProps) {
  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose} busy={busy}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSubmit({
            title: String(data.get('title')).trim(),
            description: String(data.get('description')),
            color: String(data.get('color')) as Project['color'],
            icon: String(data.get('icon')) as Project['icon'],
          });
        }}
      >
        <label className="grid gap-1 text-sm">
          Project name
          <input
            className="rounded border border-slate-300 dark:border-slate-600 p-2"
            name="title"
            required
            maxLength={200}
            defaultValue={project?.title ?? ''}
            autoFocus
          />
        </label>
        <label className="grid gap-1 text-sm">
          Description
          <textarea
            className="rounded border border-slate-300 dark:border-slate-600 p-2"
            name="description"
            rows={3}
            maxLength={5000}
            defaultValue={project?.description ?? ''}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            Color
            <select
              className="rounded border border-slate-300 dark:border-slate-600 p-2"
              name="color"
              defaultValue={project?.color ?? 'slate'}
            >
              {['slate', 'blue', 'green', 'purple', 'rose', 'amber'].map((color) => (
                <option key={color}>{color}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Icon
            <select
              className="rounded border border-slate-300 dark:border-slate-600 p-2"
              name="icon"
              defaultValue={project?.icon ?? 'folder'}
            >
              {['folder', 'book', 'code', 'science', 'language'].map((icon) => (
                <option key={icon}>{icon}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Saving…' : project ? 'Save project' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
