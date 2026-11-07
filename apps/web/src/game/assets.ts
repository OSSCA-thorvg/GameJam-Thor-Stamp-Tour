import type { Picture, ThorVGNamespace } from '@thorvg/webcanvas';
import { MAP_HEIGHT, MAP_WIDTH } from '@stamp-tour/shared';

// 파일을 폴더에 넣으면 빌드 시 자동으로 잡힌다. 없으면 임시 사각형으로 그린다.
const mapUrls = import.meta.glob<string>('../assets/game/maps/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const characterFiles = import.meta.glob<string>('../assets/game/character/character.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const characterLottie: string | null = Object.values(characterFiles)[0] ?? null;

export async function loadBackground(TVG: ThorVGNamespace, spotKey: string): Promise<Picture | null> {
  const url = mapUrls[`../assets/game/maps/${spotKey}.png`];
  if (!url) return null;
  try {
    const res = await fetch(url);
    const picture = new TVG.Picture();
    picture.load(new Uint8Array(await res.arrayBuffer()), { type: 'png' });
    // 깨진 PNG는 예외 없이 크기 0으로 로드된다
    if (picture.size().width <= 0) {
      picture.dispose();
      return null;
    }
    return picture.size(MAP_WIDTH, MAP_HEIGHT).filter(TVG.FilterMethod.Nearest);
  } catch (err) {
    console.error(`맵 이미지 로드 실패: ${spotKey}`, err);
    return null;
  }
}
