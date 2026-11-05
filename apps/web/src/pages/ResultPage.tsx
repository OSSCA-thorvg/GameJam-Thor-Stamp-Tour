import { Link, useLocation } from 'react-router-dom';
import type { GameOverPayload, PlayerInfo } from '@stamp-tour/shared';
import { getUser } from '../lib/auth';

interface ResultState {
  result: GameOverPayload;
  opponent: PlayerInfo | null;
  totalRounds?: number;
}

export default function ResultPage() {
  const location = useLocation();
  const state = (location.state ?? null) as ResultState | null;
  const me = getUser();

  if (!state || !me) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm text-slate-400">결과 정보가 없습니다.</p>
        <Link to="/lobby" className="text-sm font-medium text-blue-600">
          로비로 돌아가기
        </Link>
      </div>
    );
  }

  const { result, opponent, totalRounds } = state;
  const won = result.winnerId === me.id;
  const draw = result.winnerId === null;
  const myScore = result.scores[me.id] ?? 0;
  const oppScore = opponent ? (result.scores[opponent.id] ?? 0) : 0;

  const title = draw ? '🤝 무승부' : won ? '🏆 승리!' : '😢 패배';
  const subtitle =
    result.reason === 'forfeit'
      ? won
        ? '상대가 게임을 떠나 승리했습니다'
        : '연결이 끊겨 몰수패 처리되었습니다'
      : totalRounds
        ? `${totalRounds}라운드 결과`
        : '게임 결과';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 bg-white px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex w-full items-center justify-around rounded-2xl bg-slate-50 py-6">
        <div className="text-center">
          <p className="text-xs text-slate-400">{me.nickname}</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{myScore}</p>
        </div>
        <span className="text-slate-300">vs</span>
        <div className="text-center">
          <p className="text-xs text-slate-400">{opponent?.nickname ?? '상대'}</p>
          <p className="mt-1 text-3xl font-bold text-rose-500">{oppScore}</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link
          to="/lobby"
          className="rounded-xl bg-blue-600 py-3 text-center font-semibold text-white"
        >
          다시 대결하기
        </Link>
        <Link to="/spots" className="rounded-xl py-3 text-center text-sm font-medium text-slate-500">
          관광지 보러 가기
        </Link>
      </div>
    </div>
  );
}
