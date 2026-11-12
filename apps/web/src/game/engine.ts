import ThorVG, { type ThorVGNamespace } from '@thorvg/webcanvas';
import wasmUrl from '../../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';

/** 맵 1칸을 Canvas 픽셀 몇 개로 그릴지. 캐릭터 그림은 맵 1칸보다 작은 점까지 보여 준다. */
export const RENDER_SCALE = 2;

let engine: Promise<ThorVGNamespace> | null = null;

/** ThorVG 초기화는 앱 전체에서 한 번만 한다. locateFile이 없으면 unpkg에서 wasm을 받는다. */
export function getThorVG(): Promise<ThorVGNamespace> {
  engine ??= ThorVG.init({ renderer: 'sw', locateFile: () => wasmUrl });
  return engine;
}
