'use client';

import { useState } from 'react';
import { chatReportReasons } from '@sabz-zendegi/api-client/chat-engine';
import { chatEngine } from '@/lib/chat-api';

export function ChatReports({ token, conversationId }: { token: string; conversationId: string }) {
  const [reports, setReports] = useState<Awaited<ReturnType<typeof chatEngine.reports>>['items']>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    setReports((await chatEngine.reports(token, conversationId)).items);
  }

  async function run(action: () => Promise<unknown>) {
    setLoading(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch {
      setError('دریافت یا بررسی گزارش ممکن نشد.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className="border-b border-border px-4 py-2"
      onToggle={(event) => {
        if (event.currentTarget.open) void run(async () => {});
      }}
    >
      <summary className="flex min-h-10 cursor-pointer items-center text-sm font-bold">
        گزارش‌های گفتگو
      </summary>
      {loading && (
        <p role="status" className="text-sm">
          در حال بررسی…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && !reports.length && !error && (
        <p className="mb-2 text-sm text-muted-foreground">گزارشی ثبت نشده است.</p>
      )}
      <ul className="max-h-48 space-y-2 overflow-y-auto">
        {reports.map((report) => (
          <li key={report.id} className="rounded-lg border p-2 text-sm">
            <p>{chatReportReasons[report.reasonCategory]}</p>
            {report.decision ? (
              <p className="mt-1 text-xs text-muted-foreground">بررسی شده</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-lg border px-2"
                  disabled={loading}
                  onClick={() =>
                    document
                      .getElementById('chat-message-' + report.messageId)
                      ?.scrollIntoView({ block: 'nearest' })
                  }
                >
                  یافتن پیام
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg border px-2"
                  disabled={loading}
                  onClick={() => void run(() => chatEngine.resolveReport(token, report.id, true))}
                >
                  محدودسازی پیام
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg border px-2"
                  disabled={loading}
                  onClick={() => void run(() => chatEngine.resolveReport(token, report.id, false))}
                >
                  رد گزارش
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
