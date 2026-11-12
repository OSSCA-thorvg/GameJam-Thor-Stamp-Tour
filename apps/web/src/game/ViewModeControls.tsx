import type { ViewMode } from './game';

const MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'pixel', label: '도트' },
  { mode: 'camera', label: '카메라' },
  { mode: 'split', label: '반반' },
];

interface Props {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  showOthers: boolean;
  onShowOthersChange: (show: boolean) => void;
}

function buttonClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium ${
    active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
  }`;
}

export default function ViewModeControls({ mode, onModeChange, showOthers, onShowOthersChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-4">
      <div className="flex gap-1">
        {MODES.map((item) => (
          <button
            key={item.mode}
            type="button"
            aria-pressed={mode === item.mode}
            onClick={() => onModeChange(item.mode)}
            className={buttonClass(mode === item.mode)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={showOthers}
        onClick={() => onShowOthersChange(!showOthers)}
        className={buttonClass(showOthers)}
      >
        다른 캐릭터
      </button>
    </div>
  );
}
