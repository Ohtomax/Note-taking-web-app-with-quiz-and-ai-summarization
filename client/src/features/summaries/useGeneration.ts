import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studyApi, type GenerateInput } from '@/api/study';
import { useSession } from '@/store/session';
export function useGeneration(projectId: string) {
  const uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const [id, setId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: { key: string; request: GenerateInput }) =>
      studyApi.generate(projectId, input.key, input.request),
    onSuccess: (response) => {
      if (useSession.getState().user?.uid === uid) {
        cache.setQueryData([uid, 'generation', response.data.id], response);
        setId(response.data.id);
      }
    },
    onSettled: () => {
      void cache.invalidateQueries({ queryKey: [uid, 'ai-usage'] });
      void cache.invalidateQueries({ queryKey: [uid, 'dashboard'] });
    },
  });
  const status = useQuery({
    queryKey: [uid, 'generation', id],
    queryFn: ({ signal }) => studyApi.status(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data && ['RESERVED', 'RUNNING'].includes(query.state.data.data.status)
        ? 1000
        : false,
  });
  const generate = (request: GenerateInput, fresh = false) => {
    const signature = JSON.stringify({ projectId, ...request });
    if (fresh || attempt.current?.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    setId(null);
    mutation.mutate({ key: attempt.current!.key, request });
  };
  return {
    generate,
    data: status.data?.data ?? mutation.data?.data,
    error: mutation.error ?? status.error,
    pending:
      mutation.isPending ||
      Boolean(status.data && ['RESERVED', 'RUNNING'].includes(status.data.data.status)),
    retryStatus: () => void status.refetch(),
  };
}
