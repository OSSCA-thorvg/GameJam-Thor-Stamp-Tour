import {
  ANSWER_TIME_MS,
  RECONNECT_GRACE_MS,
  ROUND_BREAK_MS,
  ROUNDS,
  scoreForAnswer,
  type GameOverReason,
  type GameStatePayload,
  type QuizQuestionPayload,
} from '@stamp-tour/shared';
import { db } from '../db/client';
import { gameResults } from '../db/schema';
import type { QuizQuestion } from './quiz';
import type { TypedServer, TypedSocket } from './types';

interface PlayerState {
  userId: string;
  nickname: string;
  socketId: string | null;
  score: number;
  disconnectTimer: NodeJS.Timeout | null;
}

/** 늦게 도착한 답에 주는 네트워크 지연 유예 */
const ANSWER_LATE_GRACE_MS = 1_000;

export class GameRoom {
  readonly roomId: string;
  finished = false;

  private readonly io: TypedServer;
  private readonly players: [PlayerState, PlayerState];
  private readonly questions: QuizQuestion[];
  private round = 0; // 1-based, 0 = 시작 전
  private deadline = 0;
  private roundAnswers = new Map<string, { choice: number; at: number }>();
  private roundTimer: NodeJS.Timeout | null = null;
  private breakTimer: NodeJS.Timeout | null = null;
  private readonly onFinished: (room: GameRoom) => void;

  constructor(
    io: TypedServer,
    roomId: string,
    p1: { userId: string; nickname: string; socketId: string },
    p2: { userId: string; nickname: string; socketId: string },
    questions: QuizQuestion[],
    onFinished: (room: GameRoom) => void,
  ) {
    this.io = io;
    this.roomId = roomId;
    this.questions = questions;
    this.onFinished = onFinished;
    this.players = [
      { ...p1, score: 0, disconnectTimer: null },
      { ...p2, score: 0, disconnectTimer: null },
    ];
  }

  get playerIds(): [string, string] {
    return [this.players[0].userId, this.players[1].userId];
  }

  start() {
    for (const p of this.players) {
      const socket = p.socketId ? this.io.sockets.sockets.get(p.socketId) : null;
      socket?.join(this.roomId);
    }
    for (const p of this.players) {
      const opponent = this.opponentOf(p.userId);
      this.emitToPlayer(p, 'match:found', {
        roomId: this.roomId,
        opponent: { id: opponent.userId, nickname: opponent.nickname },
        totalRounds: ROUNDS,
      });
    }
    this.startRound(1);
  }

  handleAnswer(userId: string, round: number, choiceIndex: number) {
    if (this.finished || round !== this.round) return;
    if (Date.now() > this.deadline + ANSWER_LATE_GRACE_MS) return;
    if (this.roundAnswers.has(userId)) return;
    const question = this.currentQuestion();
    if (!question || choiceIndex < 0 || choiceIndex >= question.choices.length) return;

    this.roundAnswers.set(userId, { choice: choiceIndex, at: Date.now() });
    if (this.roundAnswers.size === this.players.length) this.endRound();
  }

  handleDisconnect(userId: string, socketId: string) {
    if (this.finished) return;
    const player = this.playerOf(userId);
    // 이미 새 소켓으로 재접속한 뒤 도착한 옛 소켓의 disconnect는 무시
    if (!player || player.socketId !== socketId) return;

    player.socketId = null;
    const opponent = this.opponentOf(userId);
    this.emitToPlayer(opponent, 'opponent:disconnected', { graceMs: RECONNECT_GRACE_MS });

    player.disconnectTimer = setTimeout(() => {
      this.finish('forfeit', opponent.userId);
    }, RECONNECT_GRACE_MS);
  }

  handleReconnect(userId: string, socket: TypedSocket) {
    if (this.finished) return;
    const player = this.playerOf(userId);
    if (!player) return;

    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    player.socketId = socket.id;
    socket.join(this.roomId);

    const opponent = this.opponentOf(userId);
    const state: GameStatePayload = {
      roomId: this.roomId,
      opponent: { id: opponent.userId, nickname: opponent.nickname },
      totalRounds: ROUNDS,
      scores: this.scores(),
      currentQuestion: this.round >= 1 && Date.now() <= this.deadline ? this.questionPayload() : null,
    };
    socket.emit('game:state', state);
    this.emitToPlayer(opponent, 'opponent:reconnected');
  }

  /** 상대가 게임을 포기하고 나간 경우 등 외부에서 강제 종료할 때 사용 */
  forfeit(loserUserId: string) {
    if (this.finished) return;
    const opponent = this.opponentOf(loserUserId);
    this.finish('forfeit', opponent.userId);
  }

  private startRound(round: number) {
    this.round = round;
    this.roundAnswers.clear();
    this.deadline = Date.now() + ANSWER_TIME_MS;
    this.io.to(this.roomId).emit('game:question', this.questionPayload());
    this.roundTimer = setTimeout(() => this.endRound(), ANSWER_TIME_MS + ANSWER_LATE_GRACE_MS);
  }

  private endRound() {
    if (this.finished) return;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    const question = this.currentQuestion();
    if (!question) return;

    const answers: Record<string, number | null> = {};
    const roundScores: Record<string, number> = {};
    for (const p of this.players) {
      const answer = this.roundAnswers.get(p.userId);
      answers[p.userId] = answer?.choice ?? null;
      const correct = answer !== undefined && answer.choice === question.answerIndex;
      const gained = correct ? scoreForAnswer(this.deadline - answer.at) : 0;
      roundScores[p.userId] = gained;
      p.score += gained;
    }

    this.io.to(this.roomId).emit('game:roundResult', {
      round: this.round,
      answerIndex: question.answerIndex,
      answers,
      roundScores,
      totalScores: this.scores(),
    });

    this.breakTimer = setTimeout(() => {
      if (this.round >= ROUNDS) this.finish('completed');
      else this.startRound(this.round + 1);
    }, ROUND_BREAK_MS);
  }

  private finish(reason: GameOverReason, forcedWinnerId?: string) {
    if (this.finished) return;
    this.finished = true;
    this.clearTimers();

    const [p1, p2] = this.players;
    let winnerId: string | null;
    if (forcedWinnerId) winnerId = forcedWinnerId;
    else if (p1.score === p2.score) winnerId = null;
    else winnerId = p1.score > p2.score ? p1.userId : p2.userId;

    this.io.to(this.roomId).emit('game:over', {
      winnerId,
      scores: this.scores(),
      reason,
    });

    db.insert(gameResults)
      .values({
        player1Id: p1.userId,
        player2Id: p2.userId,
        winnerId,
        scores: this.scores(),
        reason,
      })
      .catch((err) => console.error('게임 결과 저장 실패:', err));

    this.onFinished(this);
  }

  private clearTimers() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.breakTimer) clearTimeout(this.breakTimer);
    for (const p of this.players) {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    }
  }

  private currentQuestion(): QuizQuestion | undefined {
    return this.questions[this.round - 1];
  }

  private questionPayload(): QuizQuestionPayload {
    const q = this.currentQuestion();
    if (!q) throw new Error(`라운드 ${this.round}의 문제가 없습니다.`);
    return {
      round: this.round,
      totalRounds: ROUNDS,
      question: q.question,
      choices: q.choices,
      deadline: this.deadline,
    };
  }

  private scores(): Record<string, number> {
    return Object.fromEntries(this.players.map((p) => [p.userId, p.score]));
  }

  private playerOf(userId: string): PlayerState | undefined {
    return this.players.find((p) => p.userId === userId);
  }

  private opponentOf(userId: string): PlayerState {
    const opponent = this.players.find((p) => p.userId !== userId);
    if (!opponent) throw new Error('상대 플레이어를 찾을 수 없습니다.');
    return opponent;
  }

  private emitToPlayer<E extends keyof import('@stamp-tour/shared').ServerToClientEvents>(
    player: PlayerState,
    event: E,
    ...args: Parameters<import('@stamp-tour/shared').ServerToClientEvents[E]>
  ) {
    if (!player.socketId) return;
    this.io.to(player.socketId).emit(event, ...args);
  }
}
