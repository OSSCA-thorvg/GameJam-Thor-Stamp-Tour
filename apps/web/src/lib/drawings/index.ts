import { bukchon } from './bukchon';
import { deoksugung } from './deoksugung';
import { gwangjang } from './gwangjang';
import { gyeongbokgung } from './gyeongbokgung';
import { namsanTower } from './namsanTower';
import type { SpotDrawing } from './types';
import { yeouido } from './yeouido';

export * from './types';

/** 타이밍 에셋 id → 관광지 그림. 관광지별 그림은 이 폴더에 파일 하나씩 두고 여기에 등록한다. */
const DRAWINGS: Partial<Record<string, SpotDrawing>> = {
  gyeongbokgung,
  'namsan-tower': namsanTower,
  bukchon,
  gwangjang,
  deoksugung,
  yeouido,
};

/** 등록되지 않은 id는 경복궁 그림으로 대신한다. */
export function getDrawing(assetId: string): SpotDrawing {
  return DRAWINGS[assetId] ?? gyeongbokgung;
}
