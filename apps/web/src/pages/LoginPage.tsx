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
      navigate('/spots');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 bg-white px-6">
      <div className="text-center">
        <div className="text-5xl">🏯</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">스탬프 투어</h1>
        <p className="mt-2 text-sm text-slate-500">관광지를 돌며 스탬프를 모으고, 퀴즈로 대결하세요</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          placeholder="닉네임을 입력하세요"
          className="rounded-xl border border-slate-300 px-4 py-3 text-center outline-none focus:border-blue-500"
        />
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-40"
        >
          {loading ? '시작하는 중...' : '시작하기'}
        </button>
      </form>
    </div>
  );
}
