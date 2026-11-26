export interface LogEntry {
  event: 'request_finished' | 'request_failed';
  requestId: string;
  method: string;
  status: number;
}

export type LogWriter = (entry: LogEntry) => void;

export const writeLog: LogWriter = (entry) => {
  process.stdout.write(
    JSON.stringify({
      event: entry.event,
      requestId: entry.requestId,
      method: entry.method,
      status: entry.status,
    }) + '\n',
  );
};
