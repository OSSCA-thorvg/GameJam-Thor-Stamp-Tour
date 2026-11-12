import { useEffect, useRef, useState } from 'react';
import {
  DESKTOP_MIN_WIDTH_PX,
  MAP_HEIGHT,
  MAP_WIDTH,
  VIEW_WIDTH_DESKTOP,
  VIEW_WIDTH_MOBILE,
  type WorldPlayer,
  type WorldSpot,
} from '@stamp-tour/shared';
import { useCamera } from '../hooks/useCamera';
import { getWorldSocket } from '../lib/socket';
import { createGame, type Game, type ViewMode } from './game';
import GuestbookPanel from './GuestbookPanel';
import { bindKeyboard, createInput } from './input';
import TouchControls from './TouchControls';
import ViewModeControls from './ViewModeControls';

const DESKTOP_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`;

function currentViewWidth() {
  return window.matchMedia(DESKTOP_QUERY).matches ? VIEW_WIDTH_DESKTOP : VIEW_WIDTH_MOBILE;
}

interface Props {
  spot: WorldSpot;
  me: WorldPlayer;
}

export default function GameView({ spot, me }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [input] = useState(createInput);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [mode, setMode] = useState<ViewMode>('pixel');
  const [showOthers, setShowOthers] = useState(true);
  const { videoRef, error: cameraError } = useCamera(mode !== 'pixel');

  // 모드를 바꿔도 게임은 다시 만들지 않고 설정만 넘긴다
  useEffect(() => {
    activeGame?.setMode(mode);
  }, [activeGame, mode]);

  useEffect(() => {
    activeGame?.setShowOthers(showOthers);
  }, [activeGame, showOthers]);

  // 카메라를 못 켜면 도트 모드로 돌아간다
  useEffect(() => {
    if (cameraError) setMode('pixel');
  }, [cameraError]);

  useEffect(() => {
    let dead = false;
    let game: Game | null = null;
    const media = window.matchMedia(DESKTOP_QUERY);
    const onMediaChange = () => game?.setViewWidth(currentViewWidth());
    const unbindKeyboard = bindKeyboard(input);
    media.addEventListener('change', onMediaChange);

    createGame({
      container: containerRef.current!,
      socket: getWorldSocket(),
      me,
      spotKey: spot.key,
      viewWidth: currentViewWidth(),
      input,
    })
      .then((created) => {
        if (dead) {
          created.destroy();
          return;
        }
        game = created;
        setActiveGame(created);
      })
      .catch((err) => console.error('게임 시작 실패:', err));

    return () => {
      dead = true;
      unbindKeyboard();
      media.removeEventListener('change', onMediaChange);
      game?.destroy();
      setActiveGame(null);
    };
  }, [input, me, spot.key]);

  return (
    // main의 하단 바 여백(4rem)을 뺀 높이를 맵과 방명록이 나눠 쓴다
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex shrink-0 flex-col gap-3 pb-3">
        <h1 className="px-4 pt-4 text-lg font-bold text-slate-900">{spot.name}</h1>
        {/* 데스크탑에서 맵 높이가 화면 절반을 넘지 않도록 너비를 제한한다 */}
        <div
          ref={containerRef}
          className="relative isolate mx-auto w-full overflow-hidden"
          style={{ maxWidth: `calc((50dvh - 3rem) * ${MAP_WIDTH / MAP_HEIGHT})` }}
        >
          {/* 카메라 영상은 Canvas 뒤에 깔린다. 반반 모드에서는 오른쪽 절반만 채운다 */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-y-0 -z-10 h-full object-cover ${
              mode === 'pixel' ? 'hidden' : mode === 'split' ? 'left-1/2 w-1/2' : 'left-0 w-full'
            }`}
          />
        </div>
        <ViewModeControls
          mode={mode}
          onModeChange={setMode}
          showOthers={showOthers}
          onShowOthersChange={setShowOthers}
        />
        {cameraError && <p className="px-4 text-sm text-red-600">{cameraError}</p>}
        <TouchControls input={input} />
      </div>
      <GuestbookPanel />
    </div>
  );
}
