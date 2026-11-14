import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Spot, StampRecord, StampResponse } from '@stamp-tour/shared';
import { useGeolocation } from '../hooks/useGeolocation';
import { api, ApiRequestError } from '../lib/api';
import { formatDistance } from '../lib/format';

// 도장이 저마다 달라 보이도록 관광지 순서에 따라 모양·잉크 색·기울기를 번갈아 쓴다
const SHAPES = [
  { box: 'h-[138px] w-[138px] rounded-full', inner: 'rounded-full' },
  { box: 'h-[138px] w-[138px] rounded-full', inner: 'rounded-full' },
  { box: 'h-28 w-[150px] rounded-[18px]', inner: 'rounded-xl' },
  { box: 'h-28 w-[150px] rounded-[18px]', inner: 'rounded-xl' },
];
const INKS = ['border-stamp-red text-stamp-red', 'border-stamp-blue text-stamp-blue'];
const TILTS = ['-rotate-[9deg]', 'rotate-[6deg]', '-rotate-[5deg]', 'rotate-[8deg]'];

function formatStampDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function MyStampsPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [stamps, setStamps] = useState<StampRecord[]>([]);
  const { lat, lng } = useGeolocation();
  const [distances, setDistances] = useState(new Map<string, number>());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Spot[]>('/api/spots'), api<StampRecord[]>('/api/me/stamps')])
      .then(([s, st]) => {
        setSpots(s);
        setStamps(st);
      })
      .catch(console.error);
  }, []);

  // 위치를 주면 서버가 가까운 순으로 정렬하므로, 칸 순서는 그대로 두고 거리만 가져온다
  useEffect(() => {
    if (lat === null || lng === null) return;
    api<Spot[]>(`/api/spots?lat=${lat}&lng=${lng}`)
      .then((list) => {
        setDistances(new Map(list.flatMap((s) => (s.distanceM === undefined ? [] : [[s.id, s.distanceM]]))));
      })
      .catch(console.error);
  }, [lat, lng]);

  async function stampSpot(spot: Spot) {
    setError(null);
    try {
      const res = await api<StampResponse>(`/api/spots/${spot.id}/stamp`, {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      });
      setStamps((current) => [...current, res.stamp]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '스탬프 발급에 실패했습니다.');
    }
  }

  const stampBySpot = new Map(stamps.map((s) => [s.spotId, s]));

  return (
    <div className="paper flex min-h-full flex-col font-body text-ink">
      <div className="flex items-end justify-between gap-3 px-[22px] pt-7 pb-3.5">
        <div className="flex flex-col gap-1">
          <div className="font-pixel text-[11px] tracking-[3px] text-ink-soft">VISAS · 사증</div>
          <h1 className="font-display text-[28px]">내 스탬프</h1>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-paper-shade px-3.5">
          <span className="font-pixel font-bold">
            {stamps.length} / {spots.length}
          </span>
          <span className="text-sm font-bold">획득</span>
        </div>
      </div>
      {error && <p className="px-[22px] pb-1 text-sm font-bold">{error}</p>}
      <div className="grid grid-cols-2 gap-3 px-[22px] pt-1 pb-3.5">
        {spots.map((spot, i) => {
          const stamp = stampBySpot.get(spot.id);
          const distanceM = distances.get(spot.id);
          const inRange = distanceM !== undefined && distanceM <= spot.radiusM;
          const shape = SHAPES[i % SHAPES.length]!;
          const nameSize = spot.name.length <= 4 ? 'text-[26px]' : 'text-lg';
          return (
            <div key={spot.id} className="flex h-[170px] items-center justify-center">
              {stamp ? (
                <div className={`border-4 p-[5px] ${shape.box} ${INKS[i % INKS.length]} ${TILTS[i % TILTS.length]}`}>
                  <div
                    className={`flex h-full w-full flex-col items-center justify-center gap-0.5 border-2 border-dashed border-current px-1.5 ${shape.inner}`}
                  >
                    <div className="font-pixel text-[10px] tracking-[2px]">VISITED</div>
                    <div className={`text-center font-display leading-[1.1] break-keep ${nameSize}`}>{spot.name}</div>
                    <div className="font-pixel text-[10px]">{formatStampDate(stamp.stampedAt)}</div>
                  </div>
                </div>
              ) : inRange ? (
                // 반경 안에 들어오면 빈 칸이 도장 찍는 버튼이 된다
                <button
                  type="button"
                  onClick={() => stampSpot(spot)}
                  className={`flex flex-col items-center justify-center gap-1 border-[3px] border-ink bg-passport px-2 shadow-[0_4px_0_var(--color-ink)] ${shape.box}`}
                >
                  <div className="text-center font-display text-lg leading-[1.15] break-keep">{spot.name}</div>
                  <div className="text-sm font-bold">도장 찍기</div>
                </button>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center gap-1 border-[3px] border-dashed border-paper-line px-2 text-ink-soft ${shape.box}`}
                >
                  <div className="text-center font-display text-lg leading-[1.15] break-keep">{spot.name}</div>
                  <div className="text-xs font-bold">아직 방문 전</div>
                  {distanceM !== undefined && <div className="font-pixel text-[11px]">{formatDistance(distanceM)}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-auto px-[22px] pb-5">
        <Link
          to="/spots"
          className="flex h-[52px] items-center justify-center rounded-2xl border-2 border-ink bg-paper font-display text-lg shadow-[0_4px_0_var(--color-ink)]"
        >
          가까운 관광지 보기
        </Link>
      </div>
    </div>
  );
}
