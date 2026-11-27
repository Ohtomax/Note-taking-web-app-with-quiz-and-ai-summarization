import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/api/client';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';

export default function WorkspacePage() {
  const uid = useSession((state) => state.user!.uid);
  const projects = useQuery({
    queryKey: [uid, 'projects', 'count'],
    queryFn: () => apiRequest<{ total: number }>('/projects?pageSize=1'),
  });
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">My projects</h1>
        <Link className="rounded-lg bg-teal-800 px-4 py-2 text-white" to="/projects/new">
          New project
        </Link>
      </div>
      <AsyncState
        loading={projects.isPending}
        error={projects.error}
        retry={() => void projects.refetch()}
      />
      {projects.data && (
        <p className="mt-6 text-slate-600 dark:text-slate-300">
          {projects.data.total} projects in your workspace
        </p>
      )}
    </section>
  );
}
