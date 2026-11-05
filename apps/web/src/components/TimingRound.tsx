import { useEffect, useRef, useState } from 'react';
import {
  findTimingAsset,
  isTimingSnap,
  TIMING_FPS,
  TIMING_TOLERANCE_FRAMES,
  type PlayerInfo,
  type TimingRoundPayload,
  type TimingRoundResult,
} from '@stamp-tour/shared';
import { CANVAS_H, CANVAS_W, getDrawing } from '../lib/drawings';
import { initThorVG } from '../lib/thorvg';

/** 목표에 가깝게 멈췄을 때 목표 위치로 붙는 데 걸리는 시간 */
const SNAP_MS = 150;

/** frame에 해당하는 건물의 왼쪽 x. 왼쪽 화면 밖(-width)에서 들어와 오른쪽 화면 밖(CANVAS_W)으로 나간다. */
function buildingX(frame: number, totalFrames: number, width: number) {
  return -width + ((CANVAS_W + width) * frame) / totalFrames;
}

interface Props {
  round: TimingRoundPayload;
  result: TimingRoundResult | null;
  me: PlayerInfo;
  opponent: PlayerInfo;
  remainingMs: number;
  onStop: (frame: number) => void;
}

/** 관광지 배경 위를 반복해서 가로지르는 건물을 반투명 목표 위치에 맞춰 멈추는 라운드 */
export default function TimingRound({ round, result, me, opponent, remainingMs, onStop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFrameRef = useRef(0);
  const stoppedRef = useRef(false);
  const snapRef = useRef<{ fromFrame: number; startedAt: number } | null>(null);
  const [stoppedFrame, setStoppedFrame] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asset = findTimingAsset(round.assetId);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    let rafId = 0;
    let cleanup = () => {};

    initThorVG()
      .then((TVG) => {
        if (cancelled || !canvasRef.current) return;
        const canvas = new TVG.Canvas(canvasRef.current, { width: CANVAS_W, height: CANVAS_H });
        const drawing = getDrawing(asset.id);
        const { top, width, draw } = drawing.building;
        const xAt = (frame: number) => buildingX(frame, asset.totalFrames, width);
        const ghost = draw(TVG).opacity(90).translate(xAt(round.targetFrame), top);
        const live = draw(TVG).translate(xAt(0), top);

        canvas.add(drawing.background(TVG)).add(ghost).add(live);
        const startedAt = performance.now();

        const tick = (now: number) => {
          if (!stoppedRef.current) {
            const frame = (((now - startedAt) / 1000) * TIMING_FPS) % asset.totalFrames;
            currentFrameRef.current = Math.floor(frame);
            live.translate(xAt(frame), top);
          } else if (snapRef.current) {
            const { fromFrame, startedAt: snapStartedAt } = snapRef.current;
            const t = Math.min(1, (now - snapStartedAt) / SNAP_MS);
            const eased = 1 - (1 - t) ** 3; // ease-out: 빠르게 끌려가다 목표에서 멈춘다
            live.translate(xAt(fromFrame + (round.targetFrame - fromFrame) * eased), top);
            if (t === 1) snapRef.current = null;
          }
          canvas.update().render();
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        cleanup = () => canvas.destroy();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cleanup();
    };
  }, [asset, round.targetFrame]);

  // 시간 초과 시 제출 없이 멈춘다.
  useEffect(() => {
    if (remainingMs <= 0) stoppedRef.current = true;
  }, [remainingMs]);

  function stop() {
    if (stoppedRef.current || result) return;
    const frame = currentFrameRef.current;
    stoppedRef.current = true;
    // 화면 효과만 준다. 서버에는 실제로 멈춘 프레임을 보내 점수는 그대로 계산된다.
    if (isTimingSnap(frame - round.targetFrame)) snapRef.current = { fromFrame: frame, startedAt: performance.now() };
    setStoppedFrame(frame);
    onStop(frame);
  }

  if (!asset) return <p className="text-center text-sm text-red-500">알 수 없는 에셋: {round.assetId}</p>;

  const diff = (id: string) => {
    const frame = result?.answers[id];
    return frame === null || frame === undefined ? '미제출' : `${Math.abs(frame - result!.targetFrame)}프레임 차이`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className="text-center text-lg font-bold text-slate-900">{asset.spotName}</h2>
      <p className="text-center text-sm text-slate-500">반투명한 위치에 맞춰 멈추세요</p>
      <canvas ref={canvasRef} onClick={stop} className="max-w-full cursor-pointer rounded-2xl" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!result && (
        <button
          onClick={stop}
          disabled={stoppedFrame !== null || remainingMs <= 0}
          className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white disabled:opacity-40"
        >
          {stoppedFrame === null ? '멈춰!' : '상대를 기다리는 중...'}
        </button>
      )}
      {result && (
        <div className="w-full rounded-xl bg-slate-50 p-4 text-center text-sm">
          <p className="font-semibold text-slate-800">
            나: {diff(me.id)} (+{result.roundScores[me.id] ?? 0}점)
          </p>
          <p className="mt-1 text-slate-500">
            {opponent.nickname}: {diff(opponent.id)} (+{result.roundScores[opponent.id] ?? 0}점)
          </p>
          <p className="mt-1 text-xs text-slate-400">{TIMING_TOLERANCE_FRAMES}프레임 이상 벗어나면 0점</p>
        </div>
      )}
    </div>
  );
}
