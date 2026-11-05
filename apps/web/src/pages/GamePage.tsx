import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ANSWER_TIME_MS,
  type GameOverPayload,
  type GameStatePayload,
  type MatchFoundPayload,
  type PlayerInfo,
  type RoundPayload,
  type RoundResultPayload,
} from '@stamp-tour/shared';
import TimingRound from '../components/TimingRound';
import { getSocket } from '../lib/socket';
import { getUser } from '../lib/auth';

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const match = (location.state ?? null) as MatchFoundPayload | null;
  const me = getUser();

  const [opponent, setOpponent] = useState<PlayerInfo | null>(match?.opponent ?? null);
  const [question, setQuestion] = useState<RoundPayload | null>(null);
  const [result, setResult] = useState<RoundResultPayload | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [opponentAway, setOpponentAway] = useState(false);
  const deadlineRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();

    const onQuestion = (q: RoundPayload) => {
      setQuestion(q);
      setResult(null);
      setMyChoice(null);
      deadlineRef.current = q.deadline;
      // 100ms 타이머를 기다리면 새 라운드가 직전 라운드의 0ms로 그려져 시간 초과로 처리된다.
      setRemainingMs(Math.max(0, q.deadline - Date.now()));
    };
    const onRoundResult = (r: RoundResultPayload) => {
      setResult(r);
      setScores(r.totalScores);
    };
    const onOver = (p: GameOverPayload) => {
      navigate('/result', { state: { result: p, opponent, totalRounds: match?.totalRounds }, replace: true });
    };
    const onState = (s: GameStatePayload) => {
      // 재접속 복귀: 서버 스냅샷으로 화면 복원
      setOpponent(s.opponent);
      setScores(s.scores);
      if (s.currentQuestion) {
        setQuestion(s.currentQuestion);
        deadlineRef.current = s.currentQuestion.deadline;
        setRemainingMs(Math.max(0, s.currentQuestion.deadline - Date.now()));
      }
    };
    const onAway = () => setOpponentAway(true);
    const onBack = () => setOpponentAway(false);

    socket.on('game:question', onQuestion);
    socket.on('game:roundResult', onRoundResult);
    socket.on('game:over', onOver);
    socket.on('game:state', onState);
    socket.on('opponent:disconnected', onAway);
    socket.on('opponent:reconnected', onBack);

    return () => {
      socket.off('game:question', onQuestion);
      socket.off('game:roundResult', onRoundResult);
      socket.off('game:over', onOver);
      socket.off('game:state', onState);
      socket.off('opponent:disconnected', onAway);
      socket.off('opponent:reconnected', onBack);
    };
  }, [navigate, opponent, match?.totalRounds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  function stop(frame: number) {
    if (question?.kind !== 'timing' || result) return;
    getSocket().emit('game:stop', { round: question.round, frame });
  }

  function answer(index: number) {
    if (question?.kind !== 'quiz' || myChoice !== null || result) return;
    setMyChoice(index);
    getSocket().emit('game:answer', { round: question.round, choiceIndex: index });
  }

  if (!opponent || !me) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-white">
        <p className="text-sm text-slate-400">게임 정보를 불러오는 중...</p>
      </div>
    );
  }

  const myScore = scores[me.id] ?? 0;
  const oppScore = scores[opponent.id] ?? 0;
  const timeRatio = question ? remainingMs / ANSWER_TIME_MS : 0;
  const quizResult = result?.kind === 'quiz' ? result : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
      {/* 점수판 */}
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-left">
          <p className="text-xs text-slate-400">나 · {me.nickname}</p>
          <p className="text-lg font-bold text-blue-600">{myScore}점</p>
        </div>
        {question && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {question.round} / {question.totalRounds}
          </span>
        )}
        <div className="text-right">
          <p className="text-xs text-slate-400">상대 · {opponent.nickname}</p>
          <p className="text-lg font-bold text-rose-500">{oppScore}점</p>
        </div>
      </header>

      {opponentAway && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
          상대의 연결이 끊겼습니다. 잠시 기다리는 중...
        </div>
      )}

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        {!question && <p className="text-center text-sm text-slate-400">첫 문제를 기다리는 중...</p>}

        {question && (
          <>
            {/* 남은 시간 바 */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-100"
                style={{ width: `${Math.min(100, Math.max(0, timeRatio * 100))}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-400">{Math.ceil(remainingMs / 1000)}초</p>

            {question.kind === 'quiz' ? (
              <>
                <h2 className="text-center text-lg font-bold text-slate-900">{question.question}</h2>

                <div className="mt-2 flex flex-col gap-2">
                  {question.choices.map((choice, i) => {
                    let style = 'border-slate-200 bg-white text-slate-800';
                    if (quizResult) {
                      if (i === quizResult.answerIndex) style = 'border-green-500 bg-green-50 text-green-800';
                      else if (myChoice === i) style = 'border-red-400 bg-red-50 text-red-700';
                      else style = 'border-slate-200 bg-slate-50 text-slate-400';
                    } else if (myChoice === i) {
                      style = 'border-blue-500 bg-blue-50 text-blue-800';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => answer(i)}
                        disabled={myChoice !== null || !!result || remainingMs <= 0}
                        className={`rounded-xl border-2 px-4 py-3 text-left font-medium ${style}`}
                      >
                        {i + 1}. {choice}
                      </button>
                    );
                  })}
                </div>

                {myChoice !== null && !result && (
                  <p className="text-center text-sm text-slate-400">상대의 답을 기다리는 중...</p>
                )}
                {quizResult && (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-sm">
                    <p className="font-semibold text-slate-800">
                      {myChoice === quizResult.answerIndex ? '⭕ 정답!' : '❌ 오답'}
                      {' '}(+{quizResult.roundScores[me.id] ?? 0}점)
                    </p>
                    <p className="mt-1 text-slate-500">잠시 후 다음 문제가 나옵니다</p>
                  </div>
                )}
              </>
            ) : (
              <TimingRound
                key={question.round}
                round={question}
                result={result?.kind === 'timing' ? result : null}
                me={me}
                opponent={opponent}
                remainingMs={remainingMs}
                onStop={stop}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
