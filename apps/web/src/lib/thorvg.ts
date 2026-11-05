import ThorVG from '@thorvg/webcanvas';
// 패키지 exports가 wasm 경로를 노출하지 않아 node_modules 상대 경로로 가져온다.
import wasmUrl from '../../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';

/** ThorVG.init()이 돌려주는 네임스페이스 (패키지가 타입을 export하지 않는다) */
export type TVG = Awaited<ReturnType<typeof ThorVG.init>>;

let tvg: Promise<TVG> | null = null;

/** 앱 전체에서 한 번만 초기화한다. locateFile이 없으면 unpkg CDN에서 wasm을 받는다. */
export function initThorVG() {
  tvg ??= ThorVG.init({ locateFile: () => wasmUrl, renderer: 'gl' });
  return tvg;
}
