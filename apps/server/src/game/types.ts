import type { Namespace, Server, Socket } from 'socket.io';
import type {
  Appearance,
  ClientToServerEvents,
  ServerToClientEvents,
  WorldClientToServerEvents,
  WorldServerToClientEvents,
} from '@stamp-tour/shared';

export interface SocketData {
  userId: string;
  nickname: string;
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface WorldSocketData extends SocketData {
  appearance: Appearance;
}

export type WorldNamespace = Namespace<WorldClientToServerEvents, WorldServerToClientEvents, Record<string, never>, WorldSocketData>;
export type WorldSocket = Socket<WorldClientToServerEvents, WorldServerToClientEvents, Record<string, never>, WorldSocketData>;
