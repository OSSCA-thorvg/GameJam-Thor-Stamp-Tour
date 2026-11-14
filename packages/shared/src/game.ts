/** 1:1 퀴즈 대결 규칙 상수 — 서버가 판정의 기준으로 사용하고, 클라이언트는 표시에만 사용한다. */
export const ROUNDS = 5;
export const ANSWER_TIME_MS = 15_000;
export const ROUND_BREAK_MS = 3_000;
export const RECONNECT_GRACE_MS = 30_000;

export const CORRECT_BASE_SCORE = 10;
export const MAX_SPEED_BONUS = 5;

/** 정답 시 점수: 기본 10점 + 남은 시간 비례 보너스(최대 5점) */
export function scoreForAnswer(remainingMs: number): number {
  const ratio = Math.max(0, Math.min(1, remainingMs / ANSWER_TIME_MS));
  return CORRECT_BASE_SCORE + Math.round(ratio * MAX_SPEED_BONUS);
}

/** 스탬프 발급 기본 반경(m) — 관광지별로 radiusM이 우선한다. */
export const DEFAULT_STAMP_RADIUS_M = 100;

/** 홈 화면 맵 규칙 상수 — 좌표 단위는 맵 픽셀이고 y는 지면에서 위로 잰 높이다. */
export const MAP_WIDTH = 640;
export const MAP_HEIGHT = 240;
export const VIEW_WIDTH_DESKTOP = 640;
export const VIEW_WIDTH_MOBILE = 320;
export const DESKTOP_MIN_WIDTH_PX = 1024;

/** 맵에서 나가는 판정에 반경 위로 더하는 여유 거리(m) */
export const MAP_EXIT_MARGIN_M = 50;

export const WORLD_TICK_MS = 66;
export const MOVE_SPEED = 120;
export const JUMP_VELOCITY = 260;
export const GRAVITY = 800;
export const JUMP_MAX_HEIGHT = 48;

export const GUESTBOOK_MAX_LENGTH = 100;
export const GUESTBOOK_LIST_LIMIT = 50;

/**
 * 캐릭터 부위 — 몸 위에 이 순서대로 겹쳐 그린다. 몸은 모두 같아서 고르지 않는다.
 * 옷 그림에는 신발이 함께 들어 있다.
 */
export const CHARACTER_PARTS = ['face', 'clothes', 'hair'] as const;
export type CharacterPart = (typeof CHARACTER_PARTS)[number];
/** 부위별 선택지 — 값은 그림 파일 번호다 (`clothes4.png`이면 4). */
export const CHARACTER_PART_CHOICES: Record<CharacterPart, readonly number[]> = {
  face: [1, 2, 3],
  clothes: [4, 5, 6],
  hair: [1, 2, 3],
};

export type Appearance = Record<CharacterPart, number>;

export const DEFAULT_APPEARANCE: Appearance = { clothes: 4, face: 1, hair: 1 };

export function isValidAppearance(value: unknown): value is Appearance {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return CHARACTER_PARTS.every((part) => {
    const n = record[part];
    return CHARACTER_PART_CHOICES[part].includes(n as number);
  });
}

export type GameOverReason = 'completed' | 'forfeit' | 'opponent_left';
