import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { MeResponse } from '@stamp-tour/shared';
import { api } from './lib/api';
import { getToken, getUser, saveUser } from './lib/auth';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import SpotListPage from './pages/SpotListPage';
import MyStampsPage from './pages/MyStampsPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

function RequireAuth() {
  const location = useLocation();
  const hasCharacter = getUser()?.appearance != null;
  const [checked, setChecked] = useState(false);

  // 저장된 정보에 캐릭터가 없으면 서버에서 한 번 확인한다 (다른 기기에서 만들었을 수 있다)
  useEffect(() => {
    if (!getToken() || hasCharacter || checked) return;
    api<MeResponse>('/api/me')
      .then(saveUser)
      .catch((err) => console.error('내 정보 확인 실패:', err))
      .finally(() => setChecked(true));
  }, [hasCharacter, checked]);

  if (!getToken()) return <Navigate to="/login" replace state={{ from: location }} />;
  const onOnboarding = location.pathname === '/onboarding';
  if (!hasCharacter && !checked) return null;
  if (!hasCharacter && !onOnboarding) return <Navigate to="/onboarding" replace />;
  // 개발 서버에서는 캐릭터를 다시 정할 수 있게 온보딩을 열어 둔다
  if (hasCharacter && onOnboarding && !import.meta.env.DEV) return <Navigate to="/home" replace />;
  return <Outlet />;
}

function Layout() {
  // 여권의 색인 탭 모양 — 선택된 탭이 더 높다
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-t-[14px] border-2 border-b-0 border-ink font-display text-[15px] text-ink ${
      isActive ? 'h-[68px] bg-passport' : 'h-[58px] bg-paper'
    }`;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-lg">
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 flex h-[72px] w-full max-w-md -translate-x-1/2 items-end gap-1.5 border-t-2 border-ink bg-paper-shade px-3">
        <NavLink to="/home" className={tabClass}>
          <TabIcon>
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
          </TabIcon>
          홈
        </NavLink>
        <NavLink to="/stamps" className={tabClass}>
          <TabIcon>
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M9 17h6" />
          </TabIcon>
          여권
        </NavLink>
        <NavLink to="/lobby" className={tabClass}>
          <TabIcon>
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </TabIcon>
          대결
        </NavLink>
      </nav>
    </div>
  );
}

function TabIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/spots" element={<SpotListPage />} />
          <Route path="/stamps" element={<MyStampsPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
        </Route>
        <Route path="/game" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
