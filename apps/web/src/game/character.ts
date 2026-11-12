import type { Picture, Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import { CHARACTER_PARTS, type Appearance } from '@stamp-tour/shared';
import { bodyUrl, characterPartUrl } from './assets';

/** 맵에서 차지하는 칸 수. 그림 파일은 이것의 RENDER_SCALE배 크기로 만든다. */
export const CHARACTER_SIZE = 72;

// 같은 그림을 여러 캐릭터가 쓰므로 파일은 한 번만 받는다
const bytesCache = new Map<string, Promise<Uint8Array>>();

function fetchBytes(url: string): Promise<Uint8Array> {
  let bytes = bytesCache.get(url);
  if (!bytes) {
    bytes = fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    bytes.catch(() => bytesCache.delete(url));
    bytesCache.set(url, bytes);
  }
  return bytes;
}

async function loadPart(TVG: ThorVGNamespace, url: string): Promise<Picture | null> {
  try {
    const picture = new TVG.Picture();
    picture.load((await fetchBytes(url)).slice(), { type: 'png' });
    // 깨진 PNG는 예외 없이 크기 0으로 로드된다
    if (picture.size().width <= 0) {
      picture.dispose();
      return null;
    }
    return picture.size(CHARACTER_SIZE, CHARACTER_SIZE).origin(0.5, 1).filter(TVG.FilterMethod.Nearest);
  } catch (err) {
    console.error(`캐릭터 그림 로드 실패: ${url}`, err);
    return null;
  }
}

/**
 * 몸 위에 부위 그림을 겹친 캐릭터 1명분. 기준점은 발 가운데다.
 * 몸을 못 읽으면 null, 다른 부위는 못 읽으면 빼고 그린다.
 * 첫 Canvas가 생긴 뒤에 호출해야 그림이 보인다.
 */
export async function loadCharacter(TVG: ThorVGNamespace, appearance: Appearance): Promise<Scene | null> {
  if (!bodyUrl) return null;
  const urls = [bodyUrl, ...CHARACTER_PARTS.map((part) => characterPartUrl(part, appearance[part]))];
  const pictures = await Promise.all(urls.map((url) => (url ? loadPart(TVG, url) : null)));
  if (!pictures[0]) {
    for (const picture of pictures) picture?.dispose();
    return null;
  }
  const scene = new TVG.Scene();
  for (const picture of pictures) if (picture) scene.add(picture);
  return scene;
}
