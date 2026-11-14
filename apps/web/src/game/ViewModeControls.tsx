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

export default function ViewModeControls({ mode, onModeChange, showOthers, onShowOthersChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-2.5 px-[22px]">
      <div className="flex overflow-hidden rounded-full border-2 border-ink bg-paper">
        {MODES.map((item) => (
          <button
            key={item.mode}
            type="button"
            aria-pressed={mode === item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`h-11 border-l-2 border-ink px-3.5 font-display text-[15px] first:border-l-0 ${
              mode === item.mode ? 'bg-ink text-paper' : ''
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={showOthers}
        onClick={() => onShowOthersChange(!showOthers)}
        className={`flex h-12 items-center gap-1.5 rounded-full border-2 border-ink px-3.5 font-display text-[15px] ${
          showOthers ? 'bg-paper-shade' : 'bg-paper'
        }`}
      >
        {showOthers && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
        다른 캐릭터
      </button>
    </div>
  );
}
