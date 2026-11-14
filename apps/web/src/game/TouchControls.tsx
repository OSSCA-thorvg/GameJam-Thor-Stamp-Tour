import type { GameInput } from './input';

interface HoldButtonProps {
  label: string;
  /** 도트 화살표를 왼쪽으로 뒤집는다 */
  flip?: boolean;
  onChange: (pressed: boolean) => void;
}

function HoldButton({ label, flip, onChange }: HoldButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={() => onChange(true)}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      className="flex h-[52px] w-[52px] touch-none items-center justify-center rounded-full border-2 border-ink bg-paper select-none active:bg-paper-shade"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 7 7"
        shapeRendering="crispEdges"
        aria-hidden
        className={`fill-ink ${flip ? '-scale-x-100' : ''}`}
      >
        <rect x="2" y="0" width="1" height="7" />
        <rect x="3" y="1" width="1" height="5" />
        <rect x="4" y="2" width="1" height="3" />
        <rect x="5" y="3" width="1" height="1" />
      </svg>
    </button>
  );
}

export default function TouchControls({ input }: { input: GameInput }) {
  return (
    <div className="hidden items-center justify-between px-[22px] pointer-coarse:flex">
      <div className="flex gap-2">
        <HoldButton label="왼쪽" flip onChange={(pressed) => (input.left = pressed)} />
        <HoldButton label="오른쪽" onChange={(pressed) => (input.right = pressed)} />
      </div>
      <button
        type="button"
        onPointerDown={() => (input.jumpQueued = true)}
        className="h-[52px] w-24 touch-none rounded-full bg-ink font-display text-[17px] text-paper select-none active:opacity-80"
      >
        점프
      </button>
    </div>
  );
}
