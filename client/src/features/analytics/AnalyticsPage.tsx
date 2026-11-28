import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsApi } from '@/api/analytics';
import type { Analytics } from '@/types/analytics';
import { useSession } from '@/store/session';
import { formatPercent, formatDuration } from '@/utils/display';
import { Pagination } from '@/components/ui/Pagination';
import { AsyncState } from '@/components/ui/AsyncState';
import { SourceLink } from '@/features/notes/SourceLink';
export function PerformanceOverview({ data }: { data: Analytics }) {
  const t = data.totals;
  const comparison = [
    { name: 'First', score: t.firstScore },
    { name: 'Latest', score: t.latestScore },
    { name: 'Highest', score: t.highestScore },
  ];
  const distribution = [
    { name: 'Correct', value: t.correct },
    { name: 'Incorrect', value: t.incorrect },
  ];
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Mean score', formatPercent(t.meanScore)],
          ['Answer accuracy', formatPercent(t.accuracy)],
          ['Completed attempts', t.completedAttempts],
          [
            'Average time',
            t.meanElapsedMs === null ? 'No data' : formatDuration(t.meanElapsedMs),
          ],
        ].map(([label, value]) => (
          <div className="surface p-4" key={label}>
            <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
            <dd className="mt-2 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Mean score uses {t.scoredAttempts} completed attempts. Accuracy uses {t.answered}{' '}
        answered questions. {t.skipped} skipped of {t.questionsAssigned} assigned.
        Improvement:{' '}
        {t.improvement === null
          ? 'No data'
          : t.improvement.toFixed(2) + ' percentage points'}
        .
      </p>
      <label className="block text-sm">
        Answered coverage{' '}
        <progress
          className="ml-2 max-w-full accent-teal-700"
          max={t.questionsAssigned || 1}
          value={t.answered}
        />
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 surface p-4">
          <h2 className="font-semibold">Mean score over time (UTC)</h2>
          <div className="mt-4 h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                accessibilityLayer={false}
                data={data.trend.map((row) => ({ ...row, date: row.day.slice(5, 10) }))}
              >
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Line
                  dataKey="meanScore"
                  name="Mean score %"
                  stroke="#0f766e"
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details>
            <summary>Daily values</summary>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Daily score values</caption>
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>Attempts</th>
                    <th>Mean score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((row) => (
                    <tr key={row.day}>
                      <th className="py-2 font-normal">{row.day.slice(0, 10)}</th>
                      <td>{row.attempts}</td>
                      <td>{formatPercent(row.meanScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="min-w-0 surface p-4">
          <h2 className="font-semibold">Score comparison</h2>
          <div className="mt-4 h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer={false} data={comparison}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="score" fill="#0f766e" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="flex flex-wrap gap-4">
            {comparison.map((row) => (
              <div key={row.name}>
                <dt>{row.name}</dt>
                <dd>{formatPercent(row.score)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="min-w-0 surface p-4">
          <h2 className="font-semibold">Answered question distribution</h2>
          {t.answered ? (
            <div className="h-56" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    isAnimationActive={false}
                  >
                    {distribution.map((row, index) => (
                      <Cell key={row.name} fill={index ? '#b45309' : '#0f766e'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="my-6">No answered questions in this period.</p>
          )}
          <p>
            Correct: {t.correct} · Incorrect: {t.incorrect} · Skipped: {t.skipped}
          </p>
        </section>
      </div>
    </div>
  );
}
export default function AnalyticsPage() {
  const { projectId, quizId } = useParams(),
    uid = useSession((s) => s.user!.uid);
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [page, setPage] = useState(1);
  const invalid = !!from && !!to && from >= to;
  const query = useQuery({
    queryKey: [uid, 'analytics', projectId, quizId, from, to, page],
    queryFn: ({ signal }) =>
      analyticsApi.read(
        { projectId, quizId },
        {
          from: from ? from + 'T00:00:00.000Z' : undefined,
          to: to ? to + 'T00:00:00.000Z' : undefined,
          ...(quizId ? { versionPage: page } : {}),
        },
        signal,
      ),
    enabled: !invalid,
    staleTime: 30000,
  });
  const data = query.data;
  return (
    <section className="space-y-6">
      <nav className="flex flex-wrap gap-4 text-teal-800 dark:text-teal-300 underline">
        <Link to="/">Projects</Link>
        <Link to="/history">Study history</Link>
        {projectId && <Link to={'/projects/' + projectId}>Project study</Link>}
        {quizId && <Link to={'/quizzes/' + quizId}>Saved quiz</Link>}
      </nav>
      <h1 className="page-title">
        Study analytics{data ? ' · ' + data.scope.title : ''}
      </h1>
      <div className="flex flex-wrap gap-4">
        <label>
          From (UTC)
          <input
            type="date"
            className="ml-2 rounded border p-2"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Until, exclusive (UTC)
          <input
            type="date"
            className="ml-2 rounded border p-2"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {invalid && <p role="alert">End date must follow start date.</p>}
      <AsyncState
        loading={query.isPending}
        error={null}
        retry={() => void query.refetch()}
      />
      {query.isError && (
        <p role="alert">
          Analytics could not load. Choose a window of at most 366 days.{' '}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {data && !invalid && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {data.window.from.slice(0, 10)} to {data.window.to.slice(0, 10)} (exclusive).
            Workspace counts include archived material and exclude deleted material.
          </p>
          <PerformanceOverview data={data} />
          {data.topics && (
            <section className="surface p-5">
              <h2 className="text-lg font-semibold">Study topics</h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Based on answered questions from up to 20 completed attempts in this
                period.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    [
                      'Strongest topics',
                      data.topics.strongest,
                      'Complete a quiz with source-linked questions to see your strongest topics.',
                    ],
                    [
                      'Topics to review',
                      data.topics.review,
                      'No missed answers with sources in this sample.',
                    ],
                  ] as const
                ).map(([label, topics, empty]) => (
                  <div className="rounded-xl bg-canvas p-4" key={label}>
                    <h3 className="font-semibold">{label}</h3>
                    {topics.length ? (
                      <ul className="mt-3 space-y-2 text-sm">
                        {topics.map((topic) => (
                          <li
                            className="flex flex-wrap justify-between gap-2"
                            key={topic.projectId + ':' + topic.sourceKey}
                          >
                            <SourceLink source={topic} projectId={topic.projectId} />
                            <span className="text-muted">
                              {topic.correct} / {topic.answered} correct
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted">{empty}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.breakdowns && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="mb-3 text-left font-semibold">
                  Performance by attempted version
                </caption>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Samples</th>
                    <th>Assigned</th>
                    <th>Answered</th>
                    <th>Correct</th>
                    <th>Skipped</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...data.breakdowns.difficulty.map((r) => ({
                      ...r,
                      label: r.difficulty,
                      score: r.meanScore,
                    })),
                    ...data.breakdowns.types.map((r) => ({ ...r, label: r.type })),
                  ].map((row) => (
                    <tr key={row.label}>
                      <th className="py-3 pr-4 font-normal">
                        {row.label.replaceAll('_', ' ')}
                      </th>
                      <td>{row.attempts}</td>
                      <td>{row.assigned}</td>
                      <td>{row.answered}</td>
                      <td>{row.correct}</td>
                      <td>{row.skipped}</td>
                      <td>{formatPercent(row.score)}</td>
                      <td>{formatPercent(row.accuracy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.versions && (
            <section>
              <h2 className="font-semibold">Version comparison</h2>
              <ul className="my-4 space-y-2">
                {data.versions.data.map((v) => (
                  <li key={v.versionId}>
                    Version {v.version} · {v.difficulty} · {v.attempts} attempts · Mean{' '}
                    {formatPercent(v.meanScore)} · Highest {formatPercent(v.highestScore)}
                  </li>
                ))}
              </ul>
              <Pagination
                page={page}
                total={data.versions.total}
                pageSize={20}
                onChange={setPage}
              />
            </section>
          )}
          {data.missed && (
            <section>
              <h2 className="font-semibold">Most missed questions (up to 10)</h2>
              {!data.missed.length && <p>No incorrectly answered questions.</p>}
              <ul className="mt-4 space-y-4">
                {data.missed.map((q) => (
                  <li className="rounded border p-3" key={q.questionId}>
                    <p>
                      Version {q.version}: {q.prompt}
                    </p>
                    <p className="text-sm">
                      {q.incorrect} incorrect / {q.answered} answered (
                      {formatPercent(q.wrongRate)}) · {q.skipped} skipped / {q.assigned}{' '}
                      assigned
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
