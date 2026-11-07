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
    <div className="flex flex-col gap-3">
      <h1 className="px-4 pt-4 text-lg font-bold text-slate-900">{spot.name}</h1>
      {/* 데스크탑에서 맵 전체가 세로로도 한 화면에 들어오도록 너비를 제한한다 */}
      <div
        ref={containerRef}
        className="mx-auto w-full overflow-hidden"
        style={{ maxWidth: `calc((100dvh - 8rem) * ${MAP_WIDTH / MAP_HEIGHT})` }}
      />
      <TouchControls input={input} />
    </div>
  );
}
