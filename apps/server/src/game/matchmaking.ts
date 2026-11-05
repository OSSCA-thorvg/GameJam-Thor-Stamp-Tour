import { randomUUID } from 'node:crypto';
import { isGameMode, QUIZ_ROUNDS, TIMING_ASSETS, TIMING_ROUNDS, type GameMode } from '@stamp-tour/shared';
import { GameRoom, type RoundSpec } from './gameRoom';
import { pickRandomQuizzes } from './quiz';
import type { TypedServer, TypedSocket } from './types';

interface QueueEntry {
  userId: string;
  nickname: string;
  socketId: string;
}

const queues: Record<GameMode, QueueEntry[]> = { quiz: [], timing: [] };
const roomByUserId = new Map<string, GameRoom>();

export function getActiveRoom(userId: string): GameRoom | undefined {
  const room = roomByUserId.get(userId);
  return room && !room.finished ? room : undefined;
}

export async function joinQueue(io: TypedServer, socket: TypedSocket, mode: unknown) {
  const { userId, nickname } = socket.data;

  if (!isGameMode(mode)) {
    socket.emit('queue:error', { message: '알 수 없는 게임 모드입니다.' });
    return;
  }
  if (getActiveRoom(userId)) {
    socket.emit('queue:error', { message: '이미 진행 중인 게임이 있습니다.' });
    return;
  }

  const queue = queues[mode];
  const existing = queue.find((e) => e.userId === userId);
  if (existing) {
    existing.socketId = socket.id; // 새 탭/재접속이면 소켓만 갱신
    socket.emit('queue:joined');
    return;
  }

  leaveQueue(userId); // 다른 모드 대기열에 있으면 옮긴다
  queue.push({ userId, nickname, socketId: socket.id });
  socket.emit('queue:joined');

  if (queue.length < 2) return;

  // 랜덤 매칭: 대기열에서 무작위 2명을 뽑는다
  const pick = () => queue.splice(Math.floor(Math.random() * queue.length), 1)[0]!;
  const p1 = pick();
  const p2 = pick();

  try {
    const rounds: RoundSpec[] =
      mode === 'quiz'
        ? (await pickRandomQuizzes(QUIZ_ROUNDS)).map((question) => ({ kind: 'quiz', question }))
        : pickTimingRounds(TIMING_ROUNDS);
    const room = new GameRoom(io, randomUUID(), mode, p1, p2, rounds, (finished) => {
      for (const id of finished.playerIds) {
        if (roomByUserId.get(id) === finished) roomByUserId.delete(id);
      }
    });
    roomByUserId.set(p1.userId, room);
    roomByUserId.set(p2.userId, room);
    room.start();
  } catch (err) {
    console.error('매칭 실패:', err);
    for (const p of [p1, p2]) {
      io.to(p.socketId).emit('queue:error', { message: '매칭에 실패했습니다. 다시 시도해주세요.' });
    }
  }
}

/** 한 판 안에서 관광지가 겹치지 않게 뽑고, 목표 프레임은 앞뒤 20%를 피해 정한다. */
function pickTimingRounds(count: number): RoundSpec[] {
  if (TIMING_ASSETS.length < count) {
    throw new Error(`타이밍 에셋이 부족합니다. 필요: ${count}, 보유: ${TIMING_ASSETS.length}`);
  }
  const pool = [...TIMING_ASSETS];
  return Array.from({ length: count }, () => {
    const asset = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!;
    const margin = Math.floor(asset.totalFrames * 0.2);
    const targetFrame = margin + Math.floor(Math.random() * (asset.totalFrames - margin * 2));
    return { kind: 'timing', asset, targetFrame };
  });
}

export function leaveQueue(userId: string) {
  for (const queue of Object.values(queues)) {
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) queue.splice(idx, 1);
  }
}

export function handleSocketDisconnect(userId: string, socketId: string) {
  const entry = Object.values(queues)
    .flat()
    .find((e) => e.userId === userId);
  if (entry && entry.socketId === socketId) leaveQueue(userId);

  getActiveRoom(userId)?.handleDisconnect(userId, socketId);
}
