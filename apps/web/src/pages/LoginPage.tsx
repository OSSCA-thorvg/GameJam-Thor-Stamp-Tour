import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthResponse } from '@stamp-tour/shared';
import { api } from '../lib/api';
import { saveAuth } from '../lib/auth';
import { resetSocket } from '../lib/socket';

export default function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<AuthResponse>('/api/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      saveAuth(res.token, res.user);
      resetSocket(); // 새 토큰으로 소켓을 다시 연결
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-passport p-3.5 font-body text-ink">
      {/* 표지의 바느질 선 */}
      <div className="flex flex-1 flex-col items-center justify-between gap-8 rounded-[22px] border-2 border-dashed border-ink px-7 pt-14 pb-8">
        <div className="flex flex-col items-center gap-2.5">
          <div className="font-pixel text-[15px] tracking-[6px]">PASSPORT</div>
          <h1 className="text-center font-display text-[44px] leading-[1.15]">
            스탬프 투어
            <br />
            여권
          </h1>
        </div>
        <div className="flex h-42 w-42 items-center justify-center rounded-full border-4 border-ink bg-paper shadow-[0_6px_0_var(--color-ink)]">
          <Emblem />
        </div>
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
          <p className="mb-1 text-center text-[15px] leading-normal">
            관광지를 돌며 스탬프를 모으고,
            <br />
            퀴즈로 대결하세요
          </p>
          <label htmlFor="nickname" className="font-pixel text-[11px] tracking-[2px]">
            NAME · 이름
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="닉네임을 입력하세요"
            className="h-[54px] rounded-2xl border-[3px] border-ink bg-paper px-4 text-center text-[17px] outline-none placeholder:text-ink-soft"
          />
          {error && <p className="rounded-lg bg-paper px-3 py-1.5 text-center text-sm font-bold text-ink">{error}</p>}
          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="h-14 rounded-2xl bg-ink font-display text-xl text-paper shadow-[0_5px_0_var(--color-ink-soft)] disabled:opacity-40"
          >
            {loading ? '발급하는 중...' : '여권 발급받기'}
          </button>
        </form>
      </div>
    </div>
  );
}

/** 표지의 도트 궁궐 문장. 16×16칸에 그린다. */
function Emblem() {
  return (
    <svg width="112" height="112" viewBox="0 0 16 16" shapeRendering="crispEdges" role="img" aria-label="궁궐 모양의 도트 문장">
      <g className="fill-ink">
        <rect x="7" y="1" width="2" height="1" />
        <rect x="5" y="2" width="6" height="1" />
        <rect x="3" y="3" width="10" height="1" />
        <rect x="1" y="4" width="14" height="1" />
        <rect x="4" y="5" width="8" height="1" />
        <rect x="4" y="6" width="2" height="1" />
        <rect x="7" y="6" width="2" height="1" />
        <rect x="10" y="6" width="2" height="1" />
        <rect x="3" y="7" width="10" height="1" />
        <rect x="1" y="8" width="14" height="1" />
        <rect x="3" y="9" width="10" height="1" />
        <rect x="3" y="10" width="4" height="3" />
        <rect x="9" y="10" width="4" height="3" />
        <rect x="1" y="13" width="14" height="1" />
      </g>
      <g className="fill-passport">
        <rect x="6" y="6" width="1" height="1" />
        <rect x="9" y="6" width="1" height="1" />
      </g>
    </svg>
  );
}
