import { useEffect, useState, type FormEvent } from 'react';
import { GUESTBOOK_LIST_LIMIT, GUESTBOOK_MAX_LENGTH, type GuestbookEntry } from '@stamp-tour/shared';
import { getWorldSocket } from '../lib/socket';

/** 앞 목록이 더 최신이다. 구독과 목록 응답이 겹칠 수 있어 id로 거른다. */
function mergeEntries(newer: GuestbookEntry[], older: GuestbookEntry[]) {
  const seen = new Set<string>();
  return [...newer, ...older]
    .filter((entry) => !seen.has(entry.id) && seen.add(entry.id))
    .slice(0, GUESTBOOK_LIST_LIMIT);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GuestbookPanel() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const socket = getWorldSocket();
    const onNew = (entry: GuestbookEntry) => setEntries((current) => mergeEntries([entry], current));

    // 응답을 기다리는 사이에 올라온 글을 놓치지 않도록 구독을 먼저 시작한다
    socket.on('world:guestbook:new', onNew);
    socket.emit('world:guestbook:list', (list) => {
      setEntries((current) => mergeEntries(current, list));
    });
    return () => {
      socket.off('world:guestbook:new', onNew);
    };
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    getWorldSocket().emit('world:guestbook:post', { message }, (result) => {
      setSending(false);
      if (result.ok) setMessage('');
      else setError(result.error);
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-slate-200">
      <form onSubmit={onSubmit} className="flex shrink-0 gap-2 px-4 pt-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={GUESTBOOK_MAX_LENGTH}
          placeholder="방명록을 남겨보세요"
          aria-label="방명록 내용"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          남기기
        </button>
      </form>
      {error && <p className="px-4 pt-2 text-sm text-red-500">{error}</p>}
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {entries.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-400">아직 남겨진 글이 없습니다.</li>
        )}
        {entries.map((entry) => (
          <li key={entry.id} className="border-b border-slate-100 py-2 last:border-b-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-slate-800">{entry.nickname}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatTime(entry.createdAt)}</span>
            </div>
            <p className="mt-0.5 text-sm break-words text-slate-600">{entry.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
