import type { GameOverReason } from './game';

export interface PlayerInfo {
  id: string;
  nickname: string;
}

export interface MatchFoundPayload {
  roomId: string;
  opponent: PlayerInfo;
  totalRounds: number;
}

export interface QuizQuestionPayload {
  round: number;
  totalRounds: number;
  question: string;
  choices: string[];
  /** epoch ms — 이 시각 이후의 답은 무효 */
  deadline: number;
}

export interface RoundResultPayload {
  round: number;
  answerIndex: number;
  /** userId → 이 라운드에 제출한 선택지 (미제출은 null) */
  answers: Record<string, number | null>;
  /** userId → 이 라운드 획득 점수 */
  roundScores: Record<string, number>;
  /** userId → 누적 점수 */
  totalScores: Record<string, number>;
}

export interface GameOverPayload {
  /** null이면 무승부 */
  winnerId: string | null;
  scores: Record<string, number>;
  reason: GameOverReason;
}

/** 재접속 복귀용 스냅샷 */
export interface GameStatePayload {
  roomId: string;
  opponent: PlayerInfo;
  totalRounds: number;
  scores: Record<string, number>;
  currentQuestion: QuizQuestionPayload | null;
}

export interface ServerToClientEvents {
  'queue:joined': () => void;
  'queue:error': (p: { message: string }) => void;
  'match:found': (p: MatchFoundPayload) => void;
  'game:question': (p: QuizQuestionPayload) => void;
  'game:roundResult': (p: RoundResultPayload) => void;
  'game:over': (p: GameOverPayload) => void;
  'game:state': (p: GameStatePayload) => void;
  'opponent:disconnected': (p: { graceMs: number }) => void;
  'opponent:reconnected': () => void;
}

export interface ClientToServerEvents {
  'queue:join': () => void;
  'queue:leave': () => void;
  'game:answer': (p: { round: number; choiceIndex: number }) => void;
}

export type Facing = 1 | -1;

export interface WorldSpot {
  id: string;
  key: string;
  name: string;
}

export interface WorldPlayer {
  id: string;
  x: number;
  y: number;
  facing: Facing;
}

export type WorldStatusPayload =
  | { state: 'outside'; nearest: { name: string; distanceM: number } | null }
  | { state: 'inside'; spot: WorldSpot; me: WorldPlayer };

export interface WorldSnapshotPayload {
  /** 서버 시각 epoch ms */
  t: number;
  players: WorldPlayer[];
}

/** 홈 화면 맵 전용 네임스페이스(/world) — 퀴즈 소켓과 분리한다. */
export interface WorldServerToClientEvents {
  'world:status': (p: WorldStatusPayload) => void;
  'world:snapshot': (p: WorldSnapshotPayload) => void;
  'world:replaced': () => void;
}

export interface WorldClientToServerEvents {
  'world:location': (p: { lat: number; lng: number } | null) => void;
  'world:move': (p: { x: number; y: number; facing: Facing }) => void;
}
