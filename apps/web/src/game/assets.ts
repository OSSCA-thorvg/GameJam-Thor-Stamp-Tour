import type { Picture, ThorVGNamespace } from '@thorvg/webcanvas';
import { MAP_HEIGHT, MAP_WIDTH, type CharacterPart } from '@stamp-tour/shared';

// 파일을 폴더에 넣으면 빌드 시 자동으로 잡힌다. 없으면 임시 사각형으로 그린다.
const mapUrls = import.meta.glob<string>('../assets/game/maps/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const characterUrls = import.meta.glob<string>('../assets/game/character/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const CHARACTER_DIR = '../assets/game/character';

export const bodyUrl: string | null = characterUrls[`${CHARACTER_DIR}/body.png`] ?? null;

/** `<부위>/<부위><번호>.png`. 그 번호의 그림이 없으면 1번 그림을 쓴다. */
export function characterPartUrl(part: CharacterPart, option: number): string | null {
  return (
    characterUrls[`${CHARACTER_DIR}/${part}/${part}${option}.png`] ??
    characterUrls[`${CHARACTER_DIR}/${part}/${part}1.png`] ??
    null
  );
}

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
