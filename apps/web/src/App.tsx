import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { getToken } from './lib/auth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SpotListPage from './pages/SpotListPage';
import MyStampsPage from './pages/MyStampsPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

function RequireAuth() {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function Layout() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 py-3 text-center text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-500'}`;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-lg">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
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
