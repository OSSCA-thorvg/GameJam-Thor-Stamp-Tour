import type { Paint } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';

/** 관광지 그림은 모두 이 캔버스 좌표로 그린다. */
export const CANVAS_W = 360;
export const CANVAS_H = 240;

/** ThorVG 도형으로 그린 관광지 그림: 고정 배경과 화면을 가로지르는 건물 */
export interface SpotDrawing {
  /** 캔버스 전체를 채우는 배경 */
  background: (tvg: TVG) => Paint;
  /** 왼쪽 위가 (0, 0)인 건물. top은 배경 기준 세로 위치, width는 가로 크기 */
  building: { top: number; width: number; draw: (tvg: TVG) => Paint };
}
