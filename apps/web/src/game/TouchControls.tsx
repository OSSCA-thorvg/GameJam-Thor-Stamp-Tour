import type { GameInput } from './input';

interface HoldButtonProps {
  label: string;
  symbol: string;
  onChange: (pressed: boolean) => void;
}

function HoldButton({ label, symbol, onChange }: HoldButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={() => onChange(true)}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      className="h-16 w-16 touch-none rounded-2xl bg-slate-100 text-xl font-bold text-slate-700 select-none active:bg-slate-200"
    >
      {symbol}
    </button>
  );
}

export default function TouchControls({ input }: { input: GameInput }) {
  return (
    <div className="hidden items-center justify-between px-4 pointer-coarse:flex">
      <div className="flex gap-3">
        <HoldButton label="왼쪽" symbol="◀" onChange={(pressed) => (input.left = pressed)} />
        <HoldButton label="오른쪽" symbol="▶" onChange={(pressed) => (input.right = pressed)} />
      </div>
      <button
        type="button"
        onPointerDown={() => (input.jumpQueued = true)}
        className="h-16 w-20 touch-none rounded-2xl bg-blue-600 font-semibold text-white select-none active:bg-blue-700"
      >
        점프
      </button>
    </div>
  );
}
