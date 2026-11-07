import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Spot, StampRecord } from '@stamp-tour/shared';
import { api } from '../lib/api';
import { getUser } from '../lib/auth';

export default function MyStampsPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [stamps, setStamps] = useState<StampRecord[]>([]);
  const user = getUser();

  useEffect(() => {
    Promise.all([api<Spot[]>('/api/spots'), api<StampRecord[]>('/api/me/stamps')])
      .then(([s, st]) => {
        setSpots(s);
        setStamps(st);
      })
      .catch(console.error);
  }, []);

  const stampedIds = new Set(stamps.map((s) => s.spotId));

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">{user?.nickname}님의 스탬프</h1>
        <Link to="/spots" aria-label="관광지 보기" className="text-2xl">
          🗺️
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {stamps.length} / {spots.length} 획득
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {spots.map((spot) => {
          const owned = stampedIds.has(spot.id);
          return (
            <div
              key={spot.id}
              className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 ${
                owned ? 'border-blue-500 bg-blue-50' : 'border-dashed border-slate-300 bg-slate-50'
              }`}
            >
              <span className="text-4xl">{owned ? '🏅' : '🔒'}</span>
              <span className={`text-sm font-medium ${owned ? 'text-blue-800' : 'text-slate-400'}`}>
                {spot.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
