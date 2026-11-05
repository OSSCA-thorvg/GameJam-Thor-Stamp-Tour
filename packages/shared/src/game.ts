/** 1:1 대결 규칙 상수 — 서버가 판정의 기준으로 사용하고, 클라이언트는 표시에만 사용한다. */
export type GameMode = 'quiz' | 'timing';
export const GAME_MODES: GameMode[] = ['quiz', 'timing'];

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.includes(value as GameMode);
}

/** 퀴즈 모드 라운드 수 */
export const QUIZ_ROUNDS = 5;
/** 타이밍 모드 라운드 수 */
export const TIMING_ROUNDS = 5;
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

export const TIMING_MAX_SCORE = 15;
/** 목표 프레임과 이만큼 이상 벗어나면 0점 */
export const TIMING_TOLERANCE_FRAMES = 15;
/** 목표와 이 프레임 수 안에서 멈추면 화면에서 목표 위치로 붙는다. 점수에는 영향이 없다. */
export const TIMING_SNAP_FRAMES = 1;

export function isTimingSnap(diffFrames: number): boolean {
  return Math.abs(diffFrames) <= TIMING_SNAP_FRAMES;
}

/** 타이밍 점수: 목표 프레임에 가까울수록 높다(최대 15점, 퀴즈 최대 점수와 같다) */
export function scoreForTiming(diffFrames: number): number {
  const ratio = Math.max(0, 1 - Math.abs(diffFrames) / TIMING_TOLERANCE_FRAMES);
  return Math.round(ratio * TIMING_MAX_SCORE);
}

/** 스탬프 발급 기본 반경(m) — 관광지별로 radiusM이 우선한다. */
export const DEFAULT_STAMP_RADIUS_M = 100;

export type GameOverReason = 'completed' | 'forfeit' | 'opponent_left';
