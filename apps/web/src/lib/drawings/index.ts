import { gyeongbokgung } from './gyeongbokgung';
import type { SpotDrawing } from './types';

export * from './types';

/** 타이밍 에셋 id → 관광지 그림. 관광지별 그림은 이 폴더에 파일 하나씩 두고 여기에 등록한다. */
const DRAWINGS: Partial<Record<string, SpotDrawing>> = { gyeongbokgung };

/** 아직 그림이 없는 관광지는 임시로 경복궁 그림을 쓴다. */
export function getDrawing(assetId: string): SpotDrawing {
  return DRAWINGS[assetId] ?? gyeongbokgung;
}
