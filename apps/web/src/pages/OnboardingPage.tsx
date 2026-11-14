import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Canvas, Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import {
  CHARACTER_PART_OPTIONS,
  DEFAULT_APPEARANCE,
  type Appearance,
  type CharacterPart,
  type MeResponse,
} from '@stamp-tour/shared';
import { CHARACTER_SIZE, loadCharacter } from '../game/character';
import { getThorVG, RENDER_SCALE } from '../game/engine';
import { api } from '../lib/api';
import { getUser, saveUser } from '../lib/auth';

// 화면에는 위에서 아래 순서로 보여 준다
const ROWS: { part: CharacterPart; label: string }[] = [
  { part: 'hair', label: '머리' },
  { part: 'face', label: '얼굴' },
  { part: 'clothes', label: '옷' },
  { part: 'shoes', label: '신발' },
];

interface Stage {
  TVG: ThorVGNamespace;
  canvas: Canvas;
}

function usePreview(appearance: Appearance) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);

  // 언마운트 때 Canvas보다 먼저 정리되도록 위에 둔다
  useEffect(() => {
    if (!stage) return;
    let dead = false;
    let character: Scene | null = null;
    // 첫 Canvas가 생긴 뒤에 불러와야 그림이 보인다
    void loadCharacter(stage.TVG, appearance).then((loaded) => {
      if (!loaded) return;
      if (dead) {
        loaded.dispose();
        return;
      }
      // 맵과 같은 배율로 그리고, 발 가운데를 Canvas 아래 가운데에 둔다
      character = loaded.transform({
        e11: RENDER_SCALE,
        e12: 0,
        e13: (CHARACTER_SIZE * RENDER_SCALE) / 2,
        e21: 0,
        e22: RENDER_SCALE,
        e23: CHARACTER_SIZE * RENDER_SCALE,
        e31: 0,
        e32: 0,
        e33: 1,
      });
      stage.canvas.add(character).update().render();
    });
    return () => {
      dead = true;
      if (character) stage.canvas.remove(character);
    };
  }, [stage, appearance]);

  useEffect(() => {
    let dead = false;
    let created: Stage | null = null;
    const element = document.createElement('canvas');
    element.className = 'block w-full! h-auto! [image-rendering:pixelated]';
    containerRef.current!.append(element);

    getThorVG()
      .then((TVG) => {
        if (dead) return;
        const canvas = new TVG.Canvas(element, {
          width: CHARACTER_SIZE * RENDER_SCALE,
          height: CHARACTER_SIZE * RENDER_SCALE,
          enableDevicePixelRatio: false,
        });
        created = { TVG, canvas };
        setStage(created);
      })
      .catch((err) => console.error('미리보기 시작 실패:', err));

    return () => {
      dead = true;
      created?.canvas.destroy();
      element.remove();
    };
  }, []);

  return containerRef;
}

export default function OnboardingPage() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = usePreview(appearance);
  const navigate = useNavigate();

  function change(part: CharacterPart, delta: number) {
    setAppearance((prev) => {
      const next = ((prev[part] - 1 + delta + CHARACTER_PART_OPTIONS) % CHARACTER_PART_OPTIONS) + 1;
      return { ...prev, [part]: next };
    });
  }

  async function onSubmit() {
    setSaving(true);
    setError(null);
    try {
      const user = await api<MeResponse>('/api/me/appearance', {
        method: 'PUT',
        body: JSON.stringify(appearance),
      });
      saveUser(user);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  }

  return (
    <div className="paper mx-auto flex min-h-dvh max-w-md flex-col gap-[18px] px-[22px] pt-7 font-body text-ink">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-[28px]">여권 사진 찍기</h1>
        <div className="font-pixel text-[11px] tracking-[3px]">PASSPORT</div>
      </div>
      <div className="flex items-stretch gap-[18px]">
        <div className="relative h-[190px] w-[150px] shrink-0">
          <div className="absolute inset-0 overflow-hidden rounded-2xl border-[3px] border-ink bg-paper-shade shadow-[0_5px_0_var(--color-ink)]">
            {/* 그림 가장자리의 빈칸을 잘라 캐릭터를 사진 가운데에 둔다 */}
            <div ref={previewRef} className="absolute -top-[58px] -left-[69px] w-72" />
          </div>
          <div aria-hidden className="absolute -top-3 left-[42px] h-[22px] w-[66px] -rotate-[4deg] bg-paper-line opacity-90" />
        </div>
        <dl className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div className="border-b-2 border-dotted border-ink pb-2">
            <dt className="font-pixel text-[10px] tracking-[1px] text-ink-soft">NAME · 이름</dt>
            <dd className="truncate font-display text-[22px]">{getUser()?.nickname}</dd>
          </div>
          <div className="border-b-2 border-dotted border-ink pb-2">
            <dt className="font-pixel text-[10px] tracking-[1px] text-ink-soft">TYPE · 종류</dt>
            <dd className="text-[17px] font-bold">여행자</dd>
          </div>
          <div>
            <dt className="font-pixel text-[10px] tracking-[1px] text-ink-soft">ISSUED · 발급일</dt>
            <dd className="text-[17px] font-bold">{new Date().toLocaleDateString('ko-KR')}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        {ROWS.map(({ part, label }) => (
          <div
            key={part}
            className="flex h-[52px] items-center justify-between rounded-[14px] border-2 border-ink bg-paper pr-1.5 pl-4"
          >
            <span className="font-display text-lg">{label}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => change(part, -1)}
                aria-label={`${label} 이전`}
                className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-paper-shade"
              >
                <Arrow className="-scale-x-100" />
              </button>
              <span className="w-11 text-center font-pixel text-[13px]">
                {appearance[part]} / {CHARACTER_PART_OPTIONS}
              </span>
              <button
                type="button"
                onClick={() => change(part, 1)}
                aria-label={`${label} 다음`}
                className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-paper-shade"
              >
                <Arrow />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {error && <p className="text-center text-sm font-bold text-ink">{error}</p>}
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="h-14 rounded-2xl bg-ink font-display text-xl text-paper shadow-[0_5px_0_var(--color-ink-soft)] disabled:opacity-40"
        >
          {saving ? '발급하는 중...' : '발급 완료'}
        </button>
      </div>
      {/* 여권 아래쪽의 기계 판독란을 흉내 낸 장식 */}
      <div
        aria-hidden
        className="-mx-[22px] mt-auto overflow-hidden border-t-2 border-dashed border-ink bg-paper-shade px-[22px] pt-3.5 pb-[18px] font-pixel text-xs leading-[1.7] tracking-[1.5px] whitespace-nowrap"
      >
        {'P<STAMPTOUR<<TRAVELER<<<<<<<<<<<<'}
        <br />
        {'STAMP<TOUR<PASSPORT<<<<<<<<<<<<<<<'}
      </div>
    </div>
  );
}

/** 오른쪽을 가리키는 도트 화살표 */
function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className={`fill-ink ${className}`}>
      <rect x="2" y="0" width="1" height="7" />
      <rect x="3" y="1" width="1" height="5" />
      <rect x="4" y="2" width="1" height="3" />
      <rect x="5" y="3" width="1" height="1" />
    </svg>
  );
}
