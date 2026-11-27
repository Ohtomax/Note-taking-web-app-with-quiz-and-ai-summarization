import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/api/profile';
import { useSession } from '@/store/session';
import { profileInputSchema, type Profile } from '@/types/profile';
import { AsyncState } from '@/components/ui/AsyncState';

function EditProfile({ profile, uid }: { profile: Profile; uid: string }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [validation, setValidation] = useState('');
  const cache = useQueryClient();
  const version = useSession((state) => state.version);
  const update = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (response) => {
      if (useSession.getState().version !== version) return;
      cache.setQueryData([uid, 'profile'], response);
      void cache.invalidateQueries({ queryKey: [uid, 'profile'] });
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = profileInputSchema.safeParse({ displayName });
    setValidation(input.success ? '' : input.error.issues[0]!.message);
    if (input.success) update.mutate(input.data);
  };
  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      <label className="grid gap-2 text-sm">
        Display name
        <input
          className="rounded-lg border border-slate-300 dark:border-slate-600 p-3"
          value={displayName}
          maxLength={100}
          required
          disabled={update.isPending}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setValidation('');
            update.reset();
          }}
        />
      </label>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Email: {profile.email ?? 'Not provided'}
      </p>
      <button
        className="w-fit rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
        disabled={update.isPending}
      >
        {update.isPending ? 'Saving…' : 'Save profile'}
      </button>
      {(validation || update.error) && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {validation || update.error?.message}
        </p>
      )}
      {update.isSuccess && (
        <p role="status" className="text-sm text-teal-800 dark:text-teal-300">
          Profile saved.
        </p>
      )}
    </form>
  );
}
export default function ProfileForm() {
  const uid = useSession((state) => state.user!.uid);
  const profile = useQuery({
    queryKey: [uid, 'profile'],
    queryFn: ({ signal }) => profileApi.find(signal),
    staleTime: 30_000,
  });
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Profile settings</h1>
      <AsyncState
        loading={profile.isPending}
        error={profile.error}
        retry={() => void profile.refetch()}
      />
      {profile.data && <EditProfile key={uid} uid={uid} profile={profile.data.data} />}
    </section>
  );
}
