import { useCallback, useEffect, useState } from 'react';
import type { Spot, StampResponse } from '@stamp-tour/shared';
import { api, ApiRequestError } from '../lib/api';
import { formatDistance } from '../lib/format';
import { useGeolocation } from '../hooks/useGeolocation';

export default function SpotListPage() {
  const { lat, lng, error: geoError } = useGeolocation();
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = lat !== null && lng !== null ? `?lat=${lat}&lng=${lng}` : '';
    setSpots(await api<Spot[]>(`/api/spots${query}`));
  }, [lat, lng]);

  useEffect(() => {
    load().catch((err) => setMessage(err instanceof Error ? err.message : '불러오기 실패'));
  }, [load]);

  async function stamp(spot: Spot) {
    setMessage(null);
    try {
      const res = await api<StampResponse>(`/api/spots/${spot.id}/stamp`, {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      });
      setMessage(`🎉 ${res.stamp.spotName} 스탬프 획득!`);
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError) setMessage(err.message);
      else setMessage('스탬프 발급에 실패했습니다.');
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">관광지</h1>
      <p className="mt-1 text-sm text-slate-500">
        {geoError
          ? `위치 정보를 사용할 수 없습니다: ${geoError}`
          : lat === null
            ? '현재 위치를 확인하는 중...'
            : '가까운 순으로 정렬됩니다'}
      </p>
      {message && (
        <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>
      )}
      <ul className="mt-4 flex flex-col gap-3">
        {spots === null && <li className="text-sm text-slate-400">불러오는 중...</li>}
        {spots?.map((spot) => {
          const inRange = spot.distanceM !== undefined && spot.distanceM <= spot.radiusM;
          return (
            <li key={spot.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {spot.stamped ? '✅ ' : ''}
                    {spot.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{spot.description}</p>
                </div>
                {spot.distanceM !== undefined && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {formatDistance(spot.distanceM)}
                  </span>
                )}
              </div>
              {!spot.stamped && (
                <button
                  onClick={() => stamp(spot)}
                  className={`mt-3 w-full rounded-lg py-2 text-sm font-semibold ${
                    inRange
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {inRange ? '스탬프 받기' : `반경 ${spot.radiusM}m 안에서 받을 수 있어요`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
