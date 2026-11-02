import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@stamp-tour/shared';
import { getToken } from './auth';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** 토큰 인증이 붙은 소켓 싱글턴 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      auth: { token: getToken() },
    });
  }
  return socket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = null;
}
