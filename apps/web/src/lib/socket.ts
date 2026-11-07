import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  WorldClientToServerEvents,
  WorldServerToClientEvents,
} from '@stamp-tour/shared';
import { getToken } from './auth';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type WorldSocket = Socket<WorldServerToClientEvents, WorldClientToServerEvents>;

let socket: AppSocket | null = null;
let worldSocket: WorldSocket | null = null;

/** 토큰 인증이 붙은 소켓 싱글턴 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      auth: { token: getToken() },
    });
  }
  return socket;
}

/** 홈 화면 맵 전용 소켓. forceNew가 없으면 autoConnect:false가 퀴즈 소켓의 연결까지 막는다. */
export function getWorldSocket(): WorldSocket {
  worldSocket ??= io('/world', {
    forceNew: true,
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() }),
  });
  return worldSocket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = null;
}
