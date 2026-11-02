import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@stamp-tour/shared';

export interface SocketData {
  userId: string;
  nickname: string;
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
