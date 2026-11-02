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

export type GameOverReason = 'completed' | 'forfeit' | 'opponent_left';
