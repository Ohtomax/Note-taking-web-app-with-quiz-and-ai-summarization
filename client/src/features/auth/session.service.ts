import { queryClient } from '@/config/queryClient';
import { cancelSessionRequests } from '@/api/client';
import { useSession, type SessionUser } from '@/store/session';
import { useDrafts } from '@/store/drafts';

export const resolveSession = (user: SessionUser | null): void => {
  cancelSessionRequests();
  void queryClient.cancelQueries();
  queryClient.clear();
  useDrafts.getState().clear();
  useSession.getState().resolve(user);
};
