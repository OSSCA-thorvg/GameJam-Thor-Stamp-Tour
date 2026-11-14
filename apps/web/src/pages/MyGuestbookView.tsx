import { useEffect, useState } from 'react';
import type { MyGuestbookEntry } from '@stamp-tour/shared';
import { api } from '../lib/api';
import { formatDistance, formatTime } from '../lib/format';

interface SpotGroup {
  spotId: string;
  spotName: string;
  entries: MyGuestbookEntry[];
}

/** 최신순 목록을 관광지별로 묶는다. 최근에 글을 쓴 관광지가 앞에 온다. */
function groupBySpot(entries: MyGuestbookEntry[]): SpotGroup[] {
  const groups = new Map<string, SpotGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.spotId) ?? { spotId: entry.spotId, spotName: entry.spotName, entries: [] };
    group.entries.push(entry);
    groups.set(entry.spotId, group);
  }
  return [...groups.values()];
}

interface Props {
  /** 가장 가까운 관광지. 등록된 관광지가 없으면 null */
  nearest: { name: string; distanceM: number } | null;
  /** 쓴 글이 없을 때 보여 줄 화면 */
  empty: React.ReactNode;
}

/** 관광지 밖에서 보는 홈 화면 — 내가 관광지에 남긴 방명록을 모아 보여 준다. */
export default function MyGuestbookView({ nearest, empty }: Props) {
  const [entries, setEntries] = useState<MyGuestbookEntry[]>([]);

  useEffect(() => {
    api<MyGuestbookEntry[]>('/api/me/guestbook')
      .then(setEntries)
      .catch((err) => console.error('내 방명록 조회 실패:', err));
  }, []);

  if (entries.length === 0) return empty;

  return (
    // main의 하단 바 여백(72px)을 뺀 높이를 채운다
    <div className="paper flex min-h-[calc(100dvh-72px)] flex-col font-body text-ink">
      <div className="flex flex-col gap-2.5 px-[22px] pt-[22px] pb-4">
        {nearest ? (
          <div className="flex flex-col gap-0.5">
            <div className="font-pixel text-[11px] tracking-[3px] text-ink-soft">NEXT STOP · 가장 가까운 관광지</div>
            <div className="flex items-baseline justify-between gap-2.5">
              <h1 className="font-display text-[28px]">{nearest.name}</h1>
              <div className="shrink-0 font-display text-lg">{formatDistance(nearest.distanceM)}</div>
            </div>
          </div>
        ) : (
          <p className="font-bold">등록된 관광지가 없습니다.</p>
        )}
        <p className="text-sm font-bold text-ink-soft">관광지에 도착하면 맵이 열려요</p>
      </div>
      <div className="flex flex-1 flex-col gap-[18px] border-t-2 border-dashed border-ink px-[22px] pt-3 pb-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl">내가 남긴 방명록</h2>
          <div className="font-pixel text-[10px] tracking-[2px] text-ink-soft">MY GUESTBOOK</div>
        </div>
        {groupBySpot(entries).map((group) => (
          <section key={group.spotId} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <h3 className="shrink-0 font-display text-[17px]">{group.spotName}</h3>
              <div aria-hidden className="flex-1 border-t-2 border-dotted border-ink" />
            </div>
            <ul className="flex flex-col gap-2.5">
              {group.entries.map((entry) => (
                <li key={entry.id} className="flex flex-col items-start gap-1">
                  <p className="max-w-[86%] rounded-2xl rounded-tl-[4px] border-2 border-ink bg-paper-shade px-[13px] py-2 text-[15px] leading-[1.45] break-words">
                    {entry.message}
                  </p>
                  <p className="px-1 font-pixel text-[10px] text-ink-soft">{formatTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
