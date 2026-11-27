import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import { dashboardApi } from '@/api/dashboard';
export function useNoteOpen(projectId: string, noteId: string) {
  const uid = useSession((s) => s.user!.uid),
    cache = useQueryClient(),
    opened = useRef('');
  const { mutate, isError } = useMutation({
    mutationFn: () => dashboardApi.open(projectId, noteId),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [uid, 'dashboard'] });
    },
  });
  useEffect(() => {
    const key = uid + ':' + projectId + ':' + noteId;
    if (opened.current !== key) {
      opened.current = key;
      mutate();
    }
  }, [uid, projectId, noteId, mutate]);
  return { isError, retry: mutate };
}
