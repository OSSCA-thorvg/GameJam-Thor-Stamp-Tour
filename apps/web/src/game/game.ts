import type { Canvas, LottieAnimation, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import {
  GRAVITY,
  JUMP_VELOCITY,
  MAP_HEIGHT,
  MAP_WIDTH,
  MOVE_SPEED,
  WORLD_TICK_MS,
  type Facing,
  type WorldPlayer,
  type WorldSnapshotPayload,
} from '@stamp-tour/shared';
import type { WorldSocket } from '../lib/socket';
import { characterLottie, loadBackground } from './assets';
import { getThorVG } from './engine';
import type { GameInput } from './input';
import { RemotePlayers } from './remotePlayers';

type Action = 'idle' | 'walk' | 'jump';
type Color = readonly [number, number, number];

const GROUND_TOP = MAP_HEIGHT - 32;
const CHARACTER_SIZE = 32;
const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_HEIGHT = 24;
const EDGE_MARGIN = PLACEHOLDER_WIDTH / 2;
const MAX_DT_S = 0.05;

const SKY_COLOR: Color = [186, 230, 253];
const GROUND_COLOR: Color = [134, 239, 172];
const ME_COLOR: Color = [37, 99, 235];
const OTHER_COLOR: Color = [244, 63, 94];

export interface Game {
  setViewWidth(width: number): void;
  destroy(): void;
}

interface GameOptions {
  container: HTMLElement;
  socket: WorldSocket;
  me: WorldPlayer;
  spotKey: string;
  viewWidth: number;
  input: GameInput;
}

function translation(x: number, y: number, facing: Facing = 1) {
  return { e11: facing, e12: 0, e13: x, e21: 0, e22: 1, e23: y, e31: 0, e32: 0, e33: 1 };
}

function rect(TVG: ThorVGNamespace, x: number, y: number, w: number, h: number, color: Color): Shape {
  return new TVG.Shape().appendRect(x, y, w, h).fill(color[0], color[1], color[2]);
}

/** 캐릭터 1명분의 그림. Lottie 파일이 없거나 깨졌으면 사각형으로 대체한다. */
class Sprite {
  readonly scene: Scene;
  private animation: LottieAnimation | null = null;
  private ranges = new Map<string, { begin: number; end: number }>();
  private fps = 0;
  private totalFrames = 0;
  private action: Action = 'idle';
  private elapsedS = 0;

  constructor(TVG: ThorVGNamespace, color: Color) {
    this.scene = new TVG.Scene();
    this.animation = this.loadAnimation(TVG);
    if (!this.animation) {
      this.scene.add(
        rect(TVG, -PLACEHOLDER_WIDTH / 2, -PLACEHOLDER_HEIGHT, PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT, color),
      );
    }
  }

  private loadAnimation(TVG: ThorVGNamespace): LottieAnimation | null {
    if (!characterLottie) return null;
    try {
      const animation = new TVG.LottieAnimation();
      animation.load(characterLottie);
      const picture = animation.picture;
      const info = animation.info();
      if (!picture || !info) {
        animation.dispose();
        return null;
      }
      picture.size(CHARACTER_SIZE, CHARACTER_SIZE).origin(0.5, 1);
      this.scene.add(picture);
      this.fps = info.fps;
      this.totalFrames = info.totalFrames;
      for (let i = 0; i < animation.markersCnt(); i++) {
        const marker = animation.marker(i);
        if (marker) this.ranges.set(marker.name, { begin: marker.begin, end: marker.end });
      }
      return animation;
    } catch (err) {
      console.error('캐릭터 Lottie 로드 실패', err);
      return null;
    }
  }

  draw(x: number, y: number, facing: Facing, action: Action, dtS: number) {
    this.scene.transform(translation(Math.round(x), Math.round(GROUND_TOP - y), facing));
    if (!this.animation) return;

    this.elapsedS = action === this.action ? this.elapsedS + dtS : 0;
    this.action = action;
    // segment()는 frame() 번호를 구간 기준으로 바꾸므로 마커의 절대 프레임으로 직접 넘긴다
    const { begin, end } = this.ranges.get(action) ?? { begin: 0, end: this.totalFrames };
    this.animation.frame(begin + ((this.elapsedS * this.fps) % Math.max(1, end - begin)));
  }

  dispose() {
    this.animation?.dispose();
  }
}

export async function createGame(options: GameOptions): Promise<Game> {
  const { container, socket, me, spotKey, input } = options;
  const TVG = await getThorVG();

  const element = document.createElement('canvas');
  element.className = 'block w-full! h-auto! [image-rendering:pixelated]';
  container.append(element);

  let viewWidth = options.viewWidth;
  const canvas: Canvas = new TVG.Canvas(element, {
    width: viewWidth,
    height: MAP_HEIGHT,
    enableDevicePixelRatio: false,
  });

  // 첫 Canvas가 생기기 전에 불러온 그림은 투명하게 그려지므로 Canvas 다음에 불러온다
  const background = await loadBackground(TVG, spotKey);
  const world = new TVG.Scene();
  if (background) {
    world.add(background);
  } else {
    world.add(rect(TVG, 0, 0, MAP_WIDTH, GROUND_TOP, SKY_COLOR));
    world.add(rect(TVG, 0, GROUND_TOP, MAP_WIDTH, MAP_HEIGHT - GROUND_TOP, GROUND_COLOR));
  }
  canvas.add(world);

  const self = new Sprite(TVG, ME_COLOR);
  const others = new Map<string, Sprite>();
  world.add(self.scene);

  const remote = new RemotePlayers(me.id);
  const onSnapshot = (snapshot: WorldSnapshotPayload) => remote.push(snapshot);
  socket.on('world:snapshot', onSnapshot);

  let { x, y, facing } = me;
  let vy = 0;
  let lastFrame = performance.now();
  let lastSent = 0;
  let sent = { x, y, facing };
  let frameId = 0;

  function step(dtS: number) {
    const direction = Number(input.right) - Number(input.left);
    if (direction !== 0) facing = direction as Facing;
    x = Math.min(MAP_WIDTH - EDGE_MARGIN, Math.max(EDGE_MARGIN, x + direction * MOVE_SPEED * dtS));

    if (input.jumpQueued && y === 0) vy = JUMP_VELOCITY;
    input.jumpQueued = false;
    if (y > 0 || vy > 0) {
      y += vy * dtS;
      vy -= GRAVITY * dtS;
      if (y <= 0) {
        y = 0;
        vy = 0;
      }
    }
    return direction !== 0;
  }

  function sendMove(now: number) {
    if (now - lastSent < WORLD_TICK_MS || !socket.connected) return;
    if (x === sent.x && y === sent.y && facing === sent.facing) return;
    lastSent = now;
    sent = { x, y, facing };
    socket.emit('world:move', sent);
  }

  function drawOthers(dtS: number) {
    const views = remote.views();
    const seen = new Set(views.map((v) => v.id));
    for (const [id, sprite] of others) {
      if (seen.has(id)) continue;
      world.remove(sprite.scene);
      sprite.dispose();
      others.delete(id);
    }
    for (const view of views) {
      let sprite = others.get(view.id);
      if (!sprite) {
        sprite = new Sprite(TVG, OTHER_COLOR);
        others.set(view.id, sprite);
        world.add(sprite.scene);
      }
      const action: Action = view.y > 0.5 ? 'jump' : view.moving ? 'walk' : 'idle';
      sprite.draw(view.x, view.y, view.facing, action, dtS);
    }
  }

  function frame(now: number) {
    const dtS = Math.min(MAX_DT_S, (now - lastFrame) / 1000);
    lastFrame = now;

    const moving = step(dtS);
    sendMove(now);
    self.draw(x, y, facing, y > 0 ? 'jump' : moving ? 'walk' : 'idle', dtS);
    drawOthers(dtS);

    const cameraX = Math.min(MAP_WIDTH - viewWidth, Math.max(0, x - viewWidth / 2));
    world.transform(translation(-Math.round(cameraX), 0));
    canvas.update().render();
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);

  return {
    setViewWidth(width) {
      viewWidth = width;
      canvas.resize(width, MAP_HEIGHT);
    },
    destroy() {
      cancelAnimationFrame(frameId);
      socket.off('world:snapshot', onSnapshot);
      canvas.destroy();
      self.dispose();
      for (const sprite of others.values()) sprite.dispose();
      element.remove();
    },
  };
}
