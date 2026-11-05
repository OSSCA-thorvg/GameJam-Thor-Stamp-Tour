import type { GameMode, GameOverReason } from './game';

export interface PlayerInfo {
  id: string;
  nickname: string;
}

export interface MatchFoundPayload {
  roomId: string;
  mode: GameMode;
  opponent: PlayerInfo;
  totalRounds: number;
}

export interface QuizQuestionPayload {
  kind: 'quiz';
  round: number;
  totalRounds: number;
  question: string;
  choices: string[];
  /** epoch ms — 이 시각 이후의 답은 무효 */
  deadline: number;
}

export interface TimingRoundPayload {
  kind: 'timing';
  round: number;
  totalRounds: number;
  assetId: string;
  /** 플레이어가 맞춰야 하는 프레임 (TIMING_FPS 기준) */
  targetFrame: number;
  deadline: number;
}

export type RoundPayload = QuizQuestionPayload | TimingRoundPayload;

interface RoundResultBase {
  round: number;
  /** userId → 제출값 (퀴즈는 선택지, 타이밍은 멈춘 프레임 / 미제출은 null) */
  answers: Record<string, number | null>;
  /** userId → 이 라운드 획득 점수 */
  roundScores: Record<string, number>;
  /** userId → 누적 점수 */
  totalScores: Record<string, number>;
}

export interface QuizRoundResult extends RoundResultBase {
  kind: 'quiz';
  answerIndex: number;
}

export interface TimingRoundResult extends RoundResultBase {
  kind: 'timing';
  targetFrame: number;
}

export type RoundResultPayload = QuizRoundResult | TimingRoundResult;

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
  currentQuestion: RoundPayload | null;
}

export interface ServerToClientEvents {
  'queue:joined': () => void;
  'queue:error': (p: { message: string }) => void;
  'match:found': (p: MatchFoundPayload) => void;
  'game:question': (p: RoundPayload) => void;
  'game:roundResult': (p: RoundResultPayload) => void;
  'game:over': (p: GameOverPayload) => void;
  'game:state': (p: GameStatePayload) => void;
  'opponent:disconnected': (p: { graceMs: number }) => void;
  'opponent:reconnected': () => void;
}

export interface ClientToServerEvents {
  'queue:join': (p: { mode: GameMode }) => void;
  'queue:leave': () => void;
  'game:answer': (p: { round: number; choiceIndex: number }) => void;
  'game:stop': (p: { round: number; frame: number }) => void;
}
