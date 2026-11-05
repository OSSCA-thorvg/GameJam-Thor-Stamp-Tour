import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_MODES, type GameMode, type MatchFoundPayload } from '@stamp-tour/shared';
import { getSocket } from '../lib/socket';
import { getUser } from '../lib/auth';

const MODE_LABELS: Record<GameMode, string> = {
  quiz: '퀴즈 대결',
  timing: '타이밍 대결',
};

export default function LobbyPage() {
  const [waitingMode, setWaitingMode] = useState<GameMode | null>(null);
  // queue:joined에는 모드가 없어서 마지막으로 신청한 모드를 기억한다.
  const requestedModeRef = useRef<GameMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    const socket = getSocket();

    const onJoined = () => setWaitingMode(requestedModeRef.current);
    const onError = ({ message }: { message: string }) => {
      setWaitingMode(null);
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

  function toggleQueue(mode: GameMode) {
    const socket = getSocket();
    setError(null);
    if (waitingMode === mode) {
      socket.emit('queue:leave');
      setWaitingMode(null);
    } else {
      requestedModeRef.current = mode;
      socket.emit('queue:join', { mode });
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-20">
      <div className="text-6xl">⚔️</div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">1:1 대결</h1>
        <p className="mt-2 text-sm text-slate-500">
          {user?.nickname}님, 접속 중인 다른 여행자와
          <br />
          같은 모드를 고른 상대와 랜덤으로 매칭됩니다
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {GAME_MODES.map((mode) => (
        <button
          key={mode}
          onClick={() => toggleQueue(mode)}
          className={`w-full rounded-xl py-4 font-semibold text-white ${
            waitingMode === mode ? 'bg-slate-400' : 'bg-blue-600'
          }`}
        >
          {waitingMode === mode ? '상대를 찾는 중... (탭하면 취소)' : MODE_LABELS[mode]}
        </button>
      ))}
      {waitingMode && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-500" />
          매칭 대기 중
        </div>
      )}
    </div>
  );
}
