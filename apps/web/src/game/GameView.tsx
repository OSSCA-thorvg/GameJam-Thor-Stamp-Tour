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
import { getWorldSocket } from '../lib/socket';
import { createGame, type Game } from './game';
import GuestbookPanel from './GuestbookPanel';
import { bindKeyboard, createInput } from './input';
import TouchControls from './TouchControls';

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
        if (dead) created.destroy();
        else game = created;
      })
      .catch((err) => console.error('게임 시작 실패:', err));

    return () => {
      dead = true;
      unbindKeyboard();
      media.removeEventListener('change', onMediaChange);
      game?.destroy();
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
          className="mx-auto w-full overflow-hidden"
          style={{ maxWidth: `calc((50dvh - 3rem) * ${MAP_WIDTH / MAP_HEIGHT})` }}
        />
        <TouchControls input={input} />
      </div>
      <GuestbookPanel />
    </div>
  );
}
