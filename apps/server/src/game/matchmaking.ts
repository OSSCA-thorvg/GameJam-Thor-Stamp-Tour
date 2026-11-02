import { randomUUID } from 'node:crypto';
import { ROUNDS } from '@stamp-tour/shared';
import { GameRoom } from './gameRoom';
import { pickRandomQuizzes } from './quiz';
import type { TypedServer, TypedSocket } from './types';

interface QueueEntry {
  userId: string;
  nickname: string;
  socketId: string;
}

const queue: QueueEntry[] = [];
const roomByUserId = new Map<string, GameRoom>();

export function getActiveRoom(userId: string): GameRoom | undefined {
  const room = roomByUserId.get(userId);
  return room && !room.finished ? room : undefined;
}

export async function joinQueue(io: TypedServer, socket: TypedSocket) {
  const { userId, nickname } = socket.data;

  if (getActiveRoom(userId)) {
    socket.emit('queue:error', { message: '이미 진행 중인 게임이 있습니다.' });
    return;
  }

  const existing = queue.find((e) => e.userId === userId);
  if (existing) {
    existing.socketId = socket.id; // 새 탭/재접속이면 소켓만 갱신
    socket.emit('queue:joined');
    return;
  }

  queue.push({ userId, nickname, socketId: socket.id });
  socket.emit('queue:joined');

  if (queue.length < 2) return;

  // 랜덤 매칭: 대기열에서 무작위 2명을 뽑는다
  const pick = () => queue.splice(Math.floor(Math.random() * queue.length), 1)[0]!;
  const p1 = pick();
  const p2 = pick();

  try {
    const questions = await pickRandomQuizzes(ROUNDS);
    const room = new GameRoom(io, randomUUID(), p1, p2, questions, (finished) => {
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

export function leaveQueue(userId: string) {
  const idx = queue.findIndex((e) => e.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

export function handleSocketDisconnect(userId: string, socketId: string) {
  const entry = queue.find((e) => e.userId === userId);
  if (entry && entry.socketId === socketId) leaveQueue(userId);

  getActiveRoom(userId)?.handleDisconnect(userId, socketId);
}
