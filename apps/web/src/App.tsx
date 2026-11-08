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
  // 홈 맵은 데스크탑에서 한 화면 전체를 쓴다
  const wide = useLocation().pathname === '/home' ? 'lg:max-w-none' : '';
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 py-3 text-center text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-500'}`;
  return (
    <div className={`mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-lg ${wide}`}>
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav
        className={`fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white ${wide}`}
      >
        <NavLink to="/home" className={tabClass}>
          🏠 홈
        </NavLink>
        <NavLink to="/stamps" className={tabClass}>
          📖 스탬프
        </NavLink>
        <NavLink to="/lobby" className={tabClass}>
          ⚔️ 대결
        </NavLink>
      </nav>
    </div>
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
