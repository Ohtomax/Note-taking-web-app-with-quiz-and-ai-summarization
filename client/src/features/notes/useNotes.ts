import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { useSession } from '@/store/session';
import type { ListQuery } from '@/types/workspace';
export function useNotes(projectId: string, query: ListQuery, enabled = true) {
  const uid = useSession((state) => state.user!.uid);
  return useQuery({
    queryKey: [uid, 'notes', projectId, query],
    enabled,
    queryFn: ({ signal }) => notesApi.list(projectId, query, signal),
  });
}
export function useNote(projectId: string, noteId: string) {
  const uid = useSession((state) => state.user!.uid);
  return useQuery({
    queryKey: [uid, 'note', projectId, noteId],
    queryFn: ({ signal }) => notesApi.find(projectId, noteId, signal),
  });
}
export function useNoteMutation<T, R>(mutationFn: (input: T) => Promise<R>) {
  const uid = useSession((state) => state.user!.uid);
  const cache = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(
        ['notes', 'note', 'project', 'projects'].map((domain) =>
          cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
    },
  });
}
