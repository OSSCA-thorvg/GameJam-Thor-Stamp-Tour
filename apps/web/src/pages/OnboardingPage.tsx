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
import { saveUser } from '../lib/auth';

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 bg-white px-6">
      <h1 className="text-2xl font-bold text-slate-900">캐릭터 만들기</h1>
      <div ref={previewRef} className="w-40 rounded-xl bg-sky-100" />
      <div className="flex w-full flex-col gap-3">
        {ROWS.map(({ part, label }) => (
          <div key={part} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2">
            <span className="font-medium text-slate-700">{label}</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => change(part, -1)}
                aria-label={`${label} 이전`}
                className="rounded-lg px-3 py-1 text-slate-500 active:bg-slate-100"
              >
                ◀
              </button>
              <span className="w-12 text-center text-sm text-slate-600 tabular-nums">
                {appearance[part]} / {CHARACTER_PART_OPTIONS}
              </span>
              <button
                type="button"
                onClick={() => change(part, 1)}
                aria-label={`${label} 다음`}
                className="rounded-lg px-3 py-1 text-slate-500 active:bg-slate-100"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-3">
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-40"
        >
          {saving ? '저장하는 중...' : '완료'}
        </button>
      </div>
    </div>
  );
}
