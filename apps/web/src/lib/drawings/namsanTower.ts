import type { TVG } from '../thorvg';
import { fillCanvasGradient, rect, toOrigin, verticalGradient } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 건물 가운데 축은 x = 180. 폭이 좁아 화면을 빠르게 지나간다.
const BUILDING_BOX = { left: 154, top: 6, width: 52 };

/** 노을 하늘, 남산 능선, 숲 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [250, 170, 130], [255, 226, 180]));
  scene.add(new tvg.Shape().appendCircle(290, 70, 18).fill(255, 240, 200));
  scene.add(
    new tvg.Shape()
      .moveTo(0, 190)
      .cubicTo(90, 160, 130, 150, 180, 150)
      .cubicTo(230, 150, 270, 160, 360, 186)
      .lineTo(360, 240)
      .lineTo(0, 240)
      .close()
      .fill(92, 132, 98),
  );
  scene.add(rect(tvg, 0, 212, CANVAS_W, 28, [70, 104, 80]));
  return scene;
}

/** 몸통 기둥, 전망대 원반, 안테나로 이루어진 전망 타워 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();
  const cx = 180;

  // 받침과 몸통 기둥
  scene.add(rect(tvg, cx - 18, 200, 36, 12, [190, 190, 196]));
  scene.add(
    new tvg.Shape()
      .moveTo(cx - 9, 200)
      .lineTo(cx - 6, 92)
      .lineTo(cx + 6, 92)
      .lineTo(cx + 9, 200)
      .close()
      .fill(new tvg.LinearGradient(cx - 9, 0, cx + 9, 0).setStops([0, [210, 210, 218, 255]], [1, [150, 150, 162, 255]])),
  );
  const bands = new tvg.Shape();
  for (let y = 112; y < 200; y += 18) bands.moveTo(cx - 8, y).lineTo(cx + 8, y);
  scene.add(bands.stroke({ width: 1, color: [130, 130, 142, 255] }));

  // 전망대: 아래 받침, 유리층, 지붕
  scene.add(new tvg.Shape().moveTo(cx - 12, 92).lineTo(cx - 24, 82).lineTo(cx + 24, 82).lineTo(cx + 12, 92).close().fill(170, 170, 180));
  scene.add(
    new tvg.Shape()
      .appendRect(cx - 26, 66, 52, 16, { rx: 4, ry: 4 })
      .fill(verticalGradient(tvg, 66, 82, [90, 120, 160], [50, 70, 110])),
  );
  const windows = new tvg.Shape();
  for (let x = cx - 22; x < cx + 24; x += 6) windows.moveTo(x, 68).lineTo(x, 80);
  scene.add(windows.stroke({ width: 0.8, color: [200, 220, 240, 255] }));
  scene.add(new tvg.Shape().appendRect(cx - 22, 58, 44, 8, { rx: 3, ry: 3 }).fill(220, 220, 228));
  scene.add(rect(tvg, cx - 12, 50, 24, 8, [200, 200, 210]));

  // 안테나와 끝의 경고등
  scene.add(rect(tvg, cx - 3, 22, 6, 28, [235, 235, 240]));
  scene.add(rect(tvg, cx - 1.5, 10, 3, 14, [240, 90, 80]));
  scene.add(new tvg.Shape().appendCircle(cx, 9, 3).fill(255, 80, 70));

  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const namsanTower: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
