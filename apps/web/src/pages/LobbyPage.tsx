import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchFoundPayload } from '@stamp-tour/shared';
import { getSocket } from '../lib/socket';
import { getUser } from '../lib/auth';

export default function LobbyPage() {
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    const socket = getSocket();

    const onJoined = () => setWaiting(true);
    const onError = ({ message }: { message: string }) => {
      setWaiting(false);
      setError(message);
    };
    const onMatch = (payload: MatchFoundPayload) => {
      navigate('/game', { state: payload });
    };

    socket.on('queue:joined', onJoined);
    socket.on('queue:error', onError);
    socket.on('match:found', onMatch);

    return () => {
      socket.off('queue:joined', onJoined);
      socket.off('queue:error', onError);
      socket.off('match:found', onMatch);
    };
  }, [navigate]);

  function toggleQueue() {
    const socket = getSocket();
    setError(null);
    if (waiting) {
      socket.emit('queue:leave');
      setWaiting(false);
    } else {
      socket.emit('queue:join');
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-20">
      <div className="text-6xl">⚔️</div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">퀴즈 대결</h1>
        <p className="mt-2 text-sm text-slate-500">
          {user?.nickname}님, 접속 중인 다른 여행자와
          <br />
          랜덤으로 매칭되어 관광지 퀴즈로 대결합니다
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={toggleQueue}
        className={`w-full rounded-xl py-4 font-semibold text-white ${
          waiting ? 'bg-slate-400' : 'bg-blue-600'
        }`}
      >
        {waiting ? '상대를 찾는 중... (탭하면 취소)' : '대결 신청'}
      </button>
      {waiting && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-500" />
          매칭 대기 중
        </div>
      )}
    </div>
  );
}
