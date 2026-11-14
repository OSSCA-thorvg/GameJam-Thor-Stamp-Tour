import type { Canvas, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import {
  GRAVITY,
  JUMP_VELOCITY,
  MAP_HEIGHT,
  MAP_WIDTH,
  MOVE_SPEED,
  WORLD_TICK_MS,
  type Appearance,
  type Facing,
  type WorldPlayer,
  type WorldSnapshotPayload,
} from '@stamp-tour/shared';
import type { WorldSocket } from '../lib/socket';
import { loadBackground } from './assets';
import { CHARACTER_SIZE, loadCharacter } from './character';
import { getThorVG, RENDER_SCALE } from './engine';
import type { GameInput } from './input';
import { RemotePlayers } from './remotePlayers';

type Color = readonly [number, number, number];

const GROUND_TOP = MAP_HEIGHT - 32;
const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_HEIGHT = 24;
const EDGE_MARGIN = PLACEHOLDER_WIDTH / 2;
const MAX_DT_S = 0.05;

const SKY_COLOR: Color = [186, 230, 253];
const GROUND_COLOR: Color = [134, 239, 172];
const ME_COLOR: Color = [37, 99, 235];
const OTHER_COLOR: Color = [244, 63, 94];

/** pixel: 도트 배경, camera: 카메라 위에 캐릭터만, split: 왼쪽 절반 도트 + 오른쪽 절반 카메라 */
export type ViewMode = 'pixel' | 'camera' | 'split';

export interface Game {
  setMode(mode: ViewMode): void;
  setShowOthers(show: boolean): void;
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

/** 화면에서 보이는 맵 범위 */
interface View {
  cameraX: number;
  width: number;
}

/**
 * 캐릭터 1명분의 그림. 부위 그림을 다 읽기 전이나 몸 그림이 없으면 사각형으로 그린다.
 * 닉네임은 한글 글꼴이 필요해서 Canvas가 아닌 HTML 요소로 캐릭터 위에 띄운다.
 */
class Sprite {
  readonly scene: Scene;
  private readonly label: HTMLElement;
  private disposed = false;

  constructor(
    TVG: ThorVGNamespace,
    appearance: Appearance,
    color: Color,
    nickname: string,
    labels: HTMLElement,
  ) {
    this.scene = new TVG.Scene();
    this.label = document.createElement('span');
    this.label.className =
      'absolute -translate-x-1/2 -translate-y-full rounded bg-black/50 px-1 text-[10px] leading-4 whitespace-nowrap text-white';
    this.label.textContent = nickname;
    labels.append(this.label);
    const placeholder = rect(
      TVG,
      -PLACEHOLDER_WIDTH / 2,
      -PLACEHOLDER_HEIGHT,
      PLACEHOLDER_WIDTH,
      PLACEHOLDER_HEIGHT,
      color,
    );
    this.scene.add(placeholder);
    void loadCharacter(TVG, appearance).then((character) => {
      if (!character) return;
      if (this.disposed) {
        character.dispose();
        return;
      }
      this.scene.remove(placeholder);
      this.scene.add(character);
    });
  }

  draw(x: number, y: number, facing: Facing, view: View) {
    // 원본 그림이 왼쪽을 보므로 오른쪽(facing 1)일 때 뒤집는다
    this.scene.transform(translation(Math.round(x), Math.round(GROUND_TOP - y), -facing as Facing));
    // Canvas가 CSS로 늘어나므로 닉네임 위치는 비율로 잡는다
    this.label.style.left = `${((Math.round(x) - view.cameraX) / view.width) * 100}%`;
    this.label.style.top = `${((Math.round(GROUND_TOP - y) - CHARACTER_SIZE) / MAP_HEIGHT) * 100}%`;
  }

  dispose() {
    this.disposed = true;
    this.label.remove();
  }
}

export async function createGame(options: GameOptions): Promise<Game> {
  const { container, socket, me, spotKey, input } = options;
  const TVG = await getThorVG();

  const element = document.createElement('canvas');
  element.className = 'block w-full! h-auto! [image-rendering:pixelated]';
  container.append(element);

  const labels = document.createElement('div');
  labels.className = 'pointer-events-none absolute inset-0 overflow-hidden';
  container.append(labels);

  const viewWidth = options.viewWidth;
  const canvas: Canvas = new TVG.Canvas(element, {
    width: viewWidth * RENDER_SCALE,
    height: MAP_HEIGHT * RENDER_SCALE,
    enableDevicePixelRatio: false,
  });

  // 첫 Canvas가 생기기 전에 불러온 그림은 투명하게 그려지므로 Canvas 다음에 불러온다
  const background = await loadBackground(TVG, spotKey);
  const world = new TVG.Scene();
  // 모드에 따라 배경만 숨기거나 자를 수 있게 따로 묶는다
  const backdrop = new TVG.Scene();
  if (background) {
    backdrop.add(background);
  } else {
    backdrop.add(rect(TVG, 0, 0, MAP_WIDTH, GROUND_TOP, SKY_COLOR));
    backdrop.add(rect(TVG, 0, GROUND_TOP, MAP_WIDTH, MAP_HEIGHT - GROUND_TOP, GROUND_COLOR));
  }
  world.add(backdrop);
  canvas.add(world);

  const self = new Sprite(TVG, me.appearance, ME_COLOR, me.nickname, labels);
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
  let mode: ViewMode = 'pixel';
  let showOthers = true;
  // camera, split 모드에서는 화면이 캐릭터를 따라가지 않고 이 위치에 멈춰 있다
  let fixedCameraX = 0;

  function followCameraX() {
    return Math.min(MAP_WIDTH - viewWidth, Math.max(0, x - viewWidth / 2));
  }

  /** 모드가 바뀔 때 화면 위치와 배경을 다시 맞춘다. */
  function applyMode() {
    // 캐릭터를 순간 이동시키면 서버 좌표와 어긋나므로, 지금 보이는 자리에 화면을 멈춘다
    if (mode !== 'pixel') fixedCameraX = Math.round(followCameraX());
    backdrop.visible(mode !== 'camera');
    const clipX = mode === 'split' ? fixedCameraX : 0;
    const clipWidth = mode === 'split' ? viewWidth / 2 : MAP_WIDTH;
    backdrop.clip(new TVG.Shape().appendRect(clipX, 0, clipWidth, MAP_HEIGHT));
  }

  function step(dtS: number) {
    const direction = Number(input.right) - Number(input.left);
    if (direction !== 0) facing = direction as Facing;
    // 화면이 멈춘 모드에서는 화면 안에서만 걷는다
    const minX = mode === 'pixel' ? 0 : fixedCameraX;
    const maxX = mode === 'pixel' ? MAP_WIDTH : fixedCameraX + viewWidth;
    x = Math.min(maxX - EDGE_MARGIN, Math.max(minX + EDGE_MARGIN, x + direction * MOVE_SPEED * dtS));

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
  }

  function sendMove(now: number) {
    if (now - lastSent < WORLD_TICK_MS || !socket.connected) return;
    if (x === sent.x && y === sent.y && facing === sent.facing) return;
    lastSent = now;
    sent = { x, y, facing };
    socket.emit('world:move', sent);
  }

  function drawOthers(view: View) {
    const views = showOthers ? remote.views() : [];
    const seen = new Set(views.map((v) => v.id));
    for (const [id, sprite] of others) {
      if (seen.has(id)) continue;
      world.remove(sprite.scene);
      sprite.dispose();
      others.delete(id);
    }
    for (const other of views) {
      let sprite = others.get(other.id);
      if (!sprite) {
        sprite = new Sprite(TVG, other.appearance, OTHER_COLOR, other.nickname, labels);
        others.set(other.id, sprite);
        world.add(sprite.scene);
      }
      sprite.draw(other.x, other.y, other.facing, view);
    }
  }

  function frame(now: number) {
    const dtS = Math.min(MAX_DT_S, (now - lastFrame) / 1000);
    lastFrame = now;

    step(dtS);
    sendMove(now);
    const cameraX = Math.round(mode === 'pixel' ? followCameraX() : fixedCameraX);
    const view = { cameraX, width: viewWidth };
    self.draw(x, y, facing, view);
    drawOthers(view);

    // 맵 좌표는 그대로 두고 Canvas에는 RENDER_SCALE배로 그린다
    world.transform({
      e11: RENDER_SCALE,
      e12: 0,
      e13: -cameraX * RENDER_SCALE,
      e21: 0,
      e22: RENDER_SCALE,
      e23: 0,
      e31: 0,
      e32: 0,
      e33: 1,
    });
    canvas.update().render();
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);

  return {
    setMode(next) {
      mode = next;
      applyMode();
    },
    setShowOthers(show) {
      showOthers = show;
    },
    destroy() {
      cancelAnimationFrame(frameId);
      socket.off('world:snapshot', onSnapshot);
      canvas.destroy();
      self.dispose();
      for (const sprite of others.values()) sprite.dispose();
      element.remove();
      labels.remove();
    },
  };
}
