import GameView from '../game/GameView';
import { useWorld } from '../hooks/useWorld';
import { formatDistance } from '../lib/format';
import MyGuestbookView from './MyGuestbookView';

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    // main의 하단 바 여백(72px)을 뺀 높이를 채운다
    <div className="paper flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center gap-2 px-[22px] text-center font-body text-ink">
      <h1 className="font-display text-[28px]">{title}</h1>
      {children && <p className="text-sm font-bold text-ink-soft">{children}</p>}
    </div>
  );
}

export default function HomePage() {
  const { view, geoError } = useWorld();

  switch (view.kind) {
    case 'inside':
      return <GameView key={view.spot.id} spot={view.spot} me={view.me} />;
    case 'outside': {
      const nearestText = view.nearest
        ? `가장 가까운 관광지: ${view.nearest.name} (${formatDistance(view.nearest.distanceM)})`
        : '등록된 관광지가 없습니다.';
      return (
        <MyGuestbookView
          nearest={view.nearest}
          empty={<Notice title="관광지에 도착하면 맵이 열려요">{nearestText}</Notice>}
        />
      );
    }
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
