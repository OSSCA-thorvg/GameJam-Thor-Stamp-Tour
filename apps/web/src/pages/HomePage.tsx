import GameView from '../game/GameView';
import { useWorld } from '../hooks/useWorld';
import { formatDistance } from '../lib/format';

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {children && <p className="text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export default function HomePage() {
  const { view, geoError } = useWorld();

  switch (view.kind) {
    case 'inside':
      return <GameView key={view.spot.id} spot={view.spot} me={view.me} />;
    case 'outside':
      return (
        <Notice title="관광지에 도착하면 맵이 열려요">
          {view.nearest
            ? `가장 가까운 관광지: ${view.nearest.name} (${formatDistance(view.nearest.distanceM)})`
            : '등록된 관광지가 없습니다.'}
        </Notice>
      );
    case 'replaced':
      return <Notice title="다른 탭에서 접속했습니다">이 탭의 맵 연결을 종료했습니다.</Notice>;
    case 'unavailable':
      return <Notice title="서버에 연결할 수 없습니다">잠시 후 다시 시도해주세요.</Notice>;
    case 'connecting':
      return geoError ? (
        <Notice title="위치 정보를 사용할 수 없습니다">{geoError}</Notice>
      ) : (
        <Notice title="현재 위치를 확인하는 중..." />
      );
  }
}
