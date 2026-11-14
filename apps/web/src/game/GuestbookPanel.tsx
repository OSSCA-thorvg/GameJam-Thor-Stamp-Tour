import { useEffect, useState, type FormEvent } from 'react';
import { GUESTBOOK_LIST_LIMIT, GUESTBOOK_MAX_LENGTH, type GuestbookEntry } from '@stamp-tour/shared';
import { getUser } from '../lib/auth';
import { formatTime } from '../lib/format';
import { getWorldSocket } from '../lib/socket';

/** 앞 목록이 더 최신이다. 구독과 목록 응답이 겹칠 수 있어 id로 거른다. */
function mergeEntries(newer: GuestbookEntry[], older: GuestbookEntry[]) {
  const seen = new Set<string>();
  return [...newer, ...older]
    .filter((entry) => !seen.has(entry.id) && seen.add(entry.id))
    .slice(0, GUESTBOOK_LIST_LIMIT);
}

export default function GuestbookPanel() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const myId = getUser()?.id;

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
    <section className="flex min-h-0 flex-1 flex-col border-t-2 border-dashed border-ink">
      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[22px] pt-3">
        {entries.length === 0 && (
          <li className="py-6 text-center text-sm font-bold text-ink-soft">아직 남겨진 글이 없습니다.</li>
        )}
        {entries.map((entry) => {
          // 내 글은 오른쪽, 다른 사람 글은 왼쪽 말풍선이다
          const mine = entry.userId === myId;
          return (
            <li key={entry.id} className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`flex max-w-full items-baseline gap-2 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                <span className="truncate font-display text-sm">{mine ? '나' : entry.nickname}</span>
                <span className="shrink-0 font-pixel text-[10px] text-ink-soft">{formatTime(entry.createdAt)}</span>
              </div>
              <p
                className={`max-w-[82%] rounded-2xl border-2 border-ink px-[13px] py-2 text-[15px] leading-[1.45] break-words ${
                  mine ? 'rounded-tr-[4px] bg-paper-shade' : 'rounded-tl-[4px] bg-paper'
                }`}
              >
                {entry.message}
              </p>
            </li>
          );
        })}
      </ul>
      {error && <p className="shrink-0 px-[22px] pt-2 text-sm font-bold">{error}</p>}
      <form onSubmit={onSubmit} className="flex shrink-0 gap-2 px-[22px] pt-2.5 pb-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={GUESTBOOK_MAX_LENGTH}
          placeholder="방명록을 남겨보세요"
          aria-label="방명록 내용"
          className="h-[46px] min-w-0 flex-1 rounded-full border-2 border-ink bg-paper px-4 outline-none placeholder:text-ink-soft"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="h-[46px] shrink-0 rounded-full bg-ink px-4 font-display text-paper disabled:opacity-40"
        >
          남기기
        </button>
      </form>
    </section>
  );
}
