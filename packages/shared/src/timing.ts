/** 타이밍 모드의 진행 속도. 프레임은 이 fps로 증가하는 시간 단위다. */
export const TIMING_FPS = 30;

/** 타이밍 모드 라운드 정의. 배경 그림은 클라이언트가 id로 찾는다. */
export interface TimingAsset {
  id: string;
  spotName: string;
  /** 표식이 화면을 한 번 가로지르는 데 걸리는 프레임 수 */
  totalFrames: number;
}

export const TIMING_ASSETS: TimingAsset[] = [
  { id: 'gyeongbokgung', spotName: '경복궁', totalFrames: 150 },
  { id: 'namsan-tower', spotName: 'N서울타워', totalFrames: 110 },
  { id: 'bukchon', spotName: '북촌한옥마을', totalFrames: 150 },
  { id: 'gwangjang', spotName: '광장시장', totalFrames: 110 },
  { id: 'deoksugung', spotName: '덕수궁', totalFrames: 150 },
  { id: 'yeouido', spotName: '여의도 한강공원', totalFrames: 110 },
];

export function findTimingAsset(id: string): TimingAsset | undefined {
  return TIMING_ASSETS.find((a) => a.id === id);
}
