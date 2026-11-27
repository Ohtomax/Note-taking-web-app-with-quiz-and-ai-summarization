import { useQuery } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
// Player data never shares the authoring cache, even for the same version.
export function useAttempt(id: string) {
  const uid = useSession((state) => state.user!.uid);
  return useQuery({
    queryKey: [uid, 'player-attempt', id],
    queryFn: ({ signal }) => attemptsApi.find(id, signal),
    enabled: Boolean(id),
    staleTime: 10000,
  });
}
