import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { projectsApi } from '@/api/projects';
import { useProjects, useProjectMutation } from './useProjects';
import { ProjectForm } from './ProjectForm';
import { Modal } from '@/components/ui/Modal';
import { AsyncState } from '@/components/ui/AsyncState';
import { Pagination } from '@/components/ui/Pagination';
import { initialQuery, projectColors, projectIcons } from './project-display';
import type {
  Project,
  ProjectInput,
  DeletionPreview,
  ListQuery,
} from '@/types/workspace';

export default function ProjectLibrary() {
  const [params, setParams] = useSearchParams();
  const [filters, setQuery] = useState(initialQuery);
  const term = params.get('search') ?? '';
  const query = {
    ...filters,
    search: term,
    page: filters.search === term ? filters.page : 1,
  };
  const projects = useProjects(query);
  const [editing, setEditing] = useState<Project | null>(null);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [actionError, setActionError] = useState('');
  const creating = params.get('create') === 'true';
  const closeForm = () => {
    setEditing(null);
    setParams({});
  };
  const save = useProjectMutation((input: ProjectInput) =>
    editing
      ? projectsApi.update(editing.id, input, editing.revision)
      : projectsApi.create(input),
  );
  const archive = useProjectMutation((project: Project) =>
    projectsApi.archive(project.id, !project.archivedAt, project.revision),
  );
  const remove = useProjectMutation(projectsApi.remove);
  const previewDeletion = async (project: Project) => {
    setActionError('');
    try {
      setPreview((await projectsApi.preview(project.id)).data);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Unable to preview deletion.',
      );
    }
  };
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">My projects</h1>
        <button
          className="action action-primary"
          onClick={() => {
            save.reset();
            setParams({ create: 'true' });
          }}
        >
          New project
        </button>
      </div>
      <div className="my-6 flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">Search projects</span>
          <input
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3"
            type="search"
            placeholder="Search projects"
            value={query.search}
            onChange={(event) => {
              const search = event.target.value;
              setQuery({ ...query, search, page: 1 });
              setParams(search ? { search } : {}, { replace: true });
            }}
          />
        </label>
        <label>
          <span className="sr-only">Sort projects</span>
          <select
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3"
            value={query.sort}
            onChange={(event) =>
              setQuery({
                ...query,
                sort: event.target.value as ListQuery['sort'],
                page: 1,
              })
            }
          >
            <option value="updatedAt">Last edited</option>
            <option value="createdAt">Date created</option>
            <option value="title">Title</option>
          </select>
        </label>
        <button
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3"
          onClick={() =>
            setQuery({ ...query, order: query.order === 'asc' ? 'desc' : 'asc', page: 1 })
          }
        >
          {query.order === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>
      <div role="group" aria-label="Project state" className="mb-5 flex gap-3">
        <button
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-2 aria-pressed:bg-teal-100"
          aria-pressed={!query.archived}
          onClick={() => setQuery({ ...query, archived: false, page: 1 })}
        >
          Active
        </button>
        <button
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-2 aria-pressed:bg-teal-100"
          aria-pressed={query.archived}
          onClick={() => setQuery({ ...query, archived: true, page: 1 })}
        >
          Archived
        </button>
      </div>
      <AsyncState
        loading={projects.isPending}
        error={projects.error}
        retry={() => void projects.refetch()}
        empty={
          projects.data?.total === 0
            ? 'No projects found. Create a project to begin.'
            : undefined
        }
      />
      {(actionError || archive.error) && (
        <p role="alert" className="my-4 text-red-700 dark:text-red-300">
          {actionError || archive.error?.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.data?.data.map((project) => (
          <article
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
            key={project.id}
          >
            <span
              className={`inline-block rounded px-2 py-1 text-xs ${projectColors[project.color]}`}
            >
              {projectIcons[project.icon]}
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              <Link className="hover:underline" to={`/projects/${project.id}`}>
                {project.title}
              </Link>
            </h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
              {project.description}
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {project.noteCount ?? 0} notes
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Created {new Date(project.createdAt).toLocaleDateString()} · Edited{' '}
              {new Date(project.updatedAt).toLocaleDateString()}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              {!project.archivedAt && (
                <button
                  className="underline"
                  onClick={() => {
                    save.reset();
                    setEditing(project);
                  }}
                >
                  Edit
                </button>
              )}
              <button
                className="underline disabled:opacity-50"
                disabled={archive.isPending}
                onClick={() => archive.mutate(project)}
              >
                {project.archivedAt ? 'Restore' : 'Archive'}
              </button>
              <button
                className="text-red-700 dark:text-red-300 underline"
                onClick={() => {
                  remove.reset();
                  void previewDeletion(project);
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {projects.data && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={projects.data.total}
          onChange={(page) => setQuery({ ...query, page })}
        />
      )}
      {(creating || editing) && (
        <ProjectForm
          {...(editing ? { project: editing } : {})}
          busy={save.isPending}
          error={save.error}
          onClose={closeForm}
          onSubmit={(input) => save.mutate(input, { onSuccess: closeForm })}
        />
      )}
      {preview && (
        <Modal
          title={`Delete ${preview.title}?`}
          busy={remove.isPending}
          onClose={() => setPreview(null)}
        >
          <p className="text-sm leading-6">
            This removes {preview.notes} notes, {preview.summaries} summaries and{' '}
            {preview.quizzes} quizzes from the workspace. {preview.retainedAttempts}{' '}
            historical attempts will be retained.
          </p>
          {remove.error && (
            <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
              {remove.error.message} Close this dialog and preview again.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2"
              disabled={remove.isPending}
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(preview, { onSuccess: () => setPreview(null) })
              }
            >
              Confirm deletion
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
