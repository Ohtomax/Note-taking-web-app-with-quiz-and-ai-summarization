import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AsyncState } from '@/components/ui/AsyncState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useProjects } from '@/features/projects/useProjects';
import { initialQuery } from '@/features/projects/project-display';
import { notesApi } from '@/api/notes';
import { useNoteMutation } from '@/features/notes/useNotes';
export function CreateStudyNote({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState(initialQuery),
    projects = useProjects(query),
    create = useNoteMutation(notesApi.create),
    navigate = useNavigate();
  return (
    <Modal
      title="Choose a project for your note"
      onClose={onClose}
      busy={create.isPending}
    >
      <label>
        Find project
        <input
          type="search"
          className="field mt-2 w-full"
          value={query.search}
          onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
        />
      </label>
      <AsyncState
        loading={projects.isPending}
        error={projects.error || create.error}
        retry={() => void projects.refetch()}
      />
      <ul className="my-4 space-y-2">
        {projects.data?.data
          .filter((p) => !p.archivedAt)
          .map((p) => (
            <li key={p.id}>
              <button
                className="action w-full justify-start text-left"
                disabled={create.isPending}
                onClick={() =>
                  create.mutate(p.id, {
                    onSuccess: (response) => {
                      onClose();
                      void navigate('/projects/' + p.id + '/notes/' + response.data.id);
                    },
                  })
                }
              >
                {p.title}
              </button>
            </li>
          ))}
      </ul>
      {projects.data && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={projects.data.total}
          onChange={(page) => setQuery({ ...query, page })}
        />
      )}
      <Link
        className="font-semibold text-brand-text underline"
        onClick={onClose}
        to="/projects/new"
      >
        Create a project first
      </Link>
    </Modal>
  );
}
