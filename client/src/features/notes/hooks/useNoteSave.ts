import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { ApiError } from '@/api/client';
import { useDrafts } from '@/store/drafts';
import { useSession } from '@/store/session';
import type { Note } from '@/types/workspace';
import type { NoteDraft } from '@/types/note';

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

export function useNoteSave(note: Note, readOnly: boolean) {
  const uid = useSession((state) => state.user!.uid);
  const sessionVersion = useSession((state) => state.version);
  const key = uid + ':' + note.id;
  const cache = useQueryClient();
  const [draft, setDraft] = useState<NoteDraft>(
    () =>
      useDrafts.getState().drafts[key] ?? {
        title: note.title,
        content: note.content,
        revision: note.revision,
      },
  );
  const [initialDraft] = useState(draft);
  const [hasRecoveryDraft] = useState(() => Boolean(useDrafts.getState().drafts[key]));
  const [status, setStatus] = useState<SaveStatus>(
    hasRecoveryDraft
      ? draft.revision === note.revision
        ? 'unsaved'
        : 'conflict'
      : 'saved',
  );
  const [error, setError] = useState('');
  const [serverVersion, setServerVersion] = useState<Note | null>(
    hasRecoveryDraft && draft.revision !== note.revision ? note : null,
  );
  const latestDraft = useRef(initialDraft);
  const revision = useRef(initialDraft.revision);
  const edits = useRef(0);
  const dirty = useRef(hasRecoveryDraft);
  const paused = useRef(hasRecoveryDraft && draft.revision !== note.revision);
  const saving = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const { mutateAsync: save } = useMutation({
    mutationFn: (input: { draft: NoteDraft; revision: number; signal: AbortSignal }) =>
      notesApi.save(
        note.projectId,
        note.id,
        {
          title: input.draft.title,
          content: input.draft.content,
          expectedRevision: input.revision,
        },
        input.signal,
      ),
  });
  const { mutateAsync: loadLatest, isPending: loadingLatest } = useMutation({
    mutationFn: () => notesApi.find(note.projectId, note.id),
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  const sessionIsCurrent = useCallback(
    () =>
      mounted.current &&
      useSession.getState().version === sessionVersion &&
      useSession.getState().user?.uid === uid,
    [uid, sessionVersion],
  );

  const flush = useCallback(
    async function saveNext(): Promise<void> {
      if (
        !sessionIsCurrent() ||
        readOnly ||
        paused.current ||
        saving.current ||
        !dirty.current ||
        !latestDraft.current.title.trim()
      )
        return;
      saving.current = true;
      const sequence = edits.current;
      const snapshot = latestDraft.current;
      const controller = new AbortController();
      request.current = controller;
      setStatus('saving');
      setError('');
      try {
        const response = await save({
          draft: snapshot,
          revision: revision.current,
          signal: controller.signal,
        });
        if (!sessionIsCurrent()) return;
        revision.current = response.data.revision;
        latestDraft.current = { ...latestDraft.current, revision: revision.current };
        setDraft((current) => ({ ...current, revision: revision.current }));
        dirty.current = sequence !== edits.current;
        if (dirty.current) useDrafts.getState().setDraft(key, latestDraft.current);
        else useDrafts.getState().removeDraft(key);
        setStatus(dirty.current ? 'unsaved' : 'saved');
        cache.setQueryData([uid, 'note', note.projectId, note.id], response);
        void Promise.all(
          ['notes', 'projects', 'project'].map((domain) =>
            cache.invalidateQueries({ queryKey: [uid, domain] }),
          ),
        );
      } catch (cause) {
        if (!sessionIsCurrent()) return;
        paused.current = true;
        dirty.current = true;
        useDrafts.getState().setDraft(key, latestDraft.current);
        setStatus(
          cause instanceof ApiError && cause.status === 409 ? 'conflict' : 'error',
        );
        setError(cause instanceof Error ? cause.message : 'Unable to save this note.');
      } finally {
        saving.current = false;
        if (sessionIsCurrent() && dirty.current && !paused.current && !readOnly) {
          queueMicrotask(() => void saveNext());
        }
      }
    },
    [save, cache, uid, key, note.id, note.projectId, readOnly, sessionIsCurrent],
  );

  const change = useCallback(
    (value: NoteDraft) => {
      latestDraft.current = { ...value, revision: revision.current };
      edits.current += 1;
      dirty.current = true;
      setDraft(latestDraft.current);
      useDrafts.getState().setDraft(key, latestDraft.current);
      if (!paused.current) setStatus('unsaved');
    },
    [key],
  );

  useEffect(() => {
    if (readOnly || paused.current || !dirty.current) return;
    const timer = setTimeout(() => void flush(), 700);
    return () => clearTimeout(timer);
  }, [draft, flush, readOnly]);

  useEffect(() => {
    if (note.revision <= revision.current || saving.current) return;
    if (dirty.current) {
      paused.current = true;
      setStatus('conflict');
      setServerVersion(note);
    } else {
      revision.current = note.revision;
      latestDraft.current = {
        title: note.title,
        content: note.content,
        revision: note.revision,
      };
      setDraft(latestDraft.current);
    }
  }, [note]);

  const compareLatest = async () => {
    try {
      const response = await loadLatest();
      if (sessionIsCurrent()) setServerVersion(response.data);
    } catch (cause) {
      if (sessionIsCurrent())
        setError(
          cause instanceof Error ? cause.message : 'Unable to load the latest note.',
        );
    }
  };
  const useServerVersion = () => {
    if (!serverVersion) return;
    const next = {
      title: serverVersion.title,
      content: serverVersion.content,
      revision: serverVersion.revision,
    };
    latestDraft.current = next;
    revision.current = next.revision;
    dirty.current = false;
    paused.current = false;
    edits.current += 1;
    useDrafts.getState().removeDraft(key);
    setDraft(next);
    setError('');
    setStatus('saved');
    setServerVersion(null);
    cache.setQueryData([uid, 'note', note.projectId, note.id], { data: serverVersion });
  };
  const reapplyDraft = () => {
    if (!serverVersion) return;
    revision.current = serverVersion.revision;
    paused.current = false;
    setServerVersion(null);
    void flush();
  };
  const retry = () => {
    paused.current = false;
    void flush();
  };
  return {
    draft,
    status,
    error,
    change,
    flush,
    retry,
    serverVersion,
    compareLatest,
    useServerVersion,
    reapplyDraft,
    loadingLatest,
  };
}
