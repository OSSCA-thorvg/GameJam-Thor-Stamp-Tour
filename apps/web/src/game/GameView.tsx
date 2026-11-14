import { useEffect, useRef, useState } from 'react';
import { MAP_HEIGHT, MAP_WIDTH, VIEW_WIDTH, type WorldPlayer, type WorldSpot } from '@stamp-tour/shared';
import { useCamera } from '../hooks/useCamera';
import { getWorldSocket } from '../lib/socket';
import { createGame, type Game, type ViewMode } from './game';
import GuestbookPanel from './GuestbookPanel';
import { bindKeyboard, createInput } from './input';
import TouchControls from './TouchControls';
import ViewModeControls from './ViewModeControls';

type Tab = 'map' | 'guestbook';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'map', label: '맵' },
  { tab: 'guestbook', label: '방명록' },
];

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
  const [tab, setTab] = useState<Tab>('map');
  // 맵이 안 보이는 동안에는 카메라를 켜 두지 않는다
  const { videoRef, error: cameraError } = useCamera(mode !== 'pixel' && tab === 'map');

  function changeTab(next: Tab) {
    // 이동 버튼을 누른 채 맵을 숨기면 뗌 신호가 오지 않아 캐릭터가 계속 걷는다
    if (next === 'guestbook') {
      input.left = false;
      input.right = false;
    }
    setTab(next);
  }

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
    const unbindKeyboard = bindKeyboard(input);

    createGame({
      container: containerRef.current!,
      socket: getWorldSocket(),
      me,
      spotKey: spot.key,
      viewWidth: VIEW_WIDTH,
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
      game?.destroy();
      setActiveGame(null);
    };
  }, [input, me, spot.key]);

  return (
    // main의 하단 바 여백(72px)을 뺀 높이를 맵과 방명록 중 보이는 쪽이 쓴다
    <div className="paper flex h-[calc(100dvh-72px)] flex-col font-body text-ink">
      <div className="flex shrink-0 flex-col gap-3 px-[22px] pt-[22px] pb-4">
        <div className="flex flex-col gap-0.5">
          <div className="font-pixel text-[11px] tracking-[3px] text-ink-soft">NOW VISITING · 방문 중</div>
          <h1 className="font-display text-[28px]">{spot.name}</h1>
        </div>
        <div className="flex overflow-hidden rounded-full border-2 border-ink bg-paper">
          {TABS.map((item) => (
            <button
              key={item.tab}
              type="button"
              aria-pressed={tab === item.tab}
              onClick={() => changeTab(item.tab)}
              className={`h-11 flex-1 border-l-2 border-ink font-display text-[15px] first:border-l-0 ${
                tab === item.tab ? 'bg-ink text-paper' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {/* 방명록을 보는 동안에도 게임과 연결이 유지되도록 떼어 내지 않고 숨긴다 */}
      <div className={tab === 'map' ? 'flex shrink-0 flex-col gap-3 pb-4' : 'hidden'}>
        <div className="px-[22px]">
          {/* 데스크탑에서 맵 높이가 화면 절반을 넘지 않도록 너비를 제한한다 */}
          <div
            className="mx-auto overflow-hidden rounded-2xl border-[3px] border-ink"
            style={{ maxWidth: `calc((50dvh - 3rem) * ${MAP_WIDTH / MAP_HEIGHT})` }}
          >
            <div ref={containerRef} className="relative isolate w-full overflow-hidden">
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
          </div>
        </div>
        <ViewModeControls
          mode={mode}
          onModeChange={setMode}
          showOthers={showOthers}
          onShowOthersChange={setShowOthers}
        />
        {cameraError && <p className="px-[22px] text-sm font-bold">{cameraError}</p>}
        <TouchControls input={input} />
      </div>
      {/* 쓰던 글과 받은 목록이 남도록 방명록도 숨기기만 한다 */}
      <div className={tab === 'guestbook' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <GuestbookPanel />
      </div>
    </div>
  );
}
