import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import { useSession } from '@/store/session';
import type { ListQuery } from '@/types/workspace';
export function useProjects(query: ListQuery) {
  const uid = useSession((state) => state.user!.uid);
  return useQuery({
    queryKey: [uid, 'projects', query],
    queryFn: ({ signal }) => projectsApi.list(query, signal),
  });
}
export function useProject(id: string) {
  const uid = useSession((state) => state.user!.uid);
  return useQuery({
    queryKey: [uid, 'project', id],
    queryFn: ({ signal }) => projectsApi.find(id, signal),
    enabled: Boolean(id),
  });
}
export function useProjectMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const uid = useSession((state) => state.user!.uid);
  const cache = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: [uid, 'projects'] }),
        cache.invalidateQueries({ queryKey: [uid, 'project'] }),
      ]);
    },
  });
}
