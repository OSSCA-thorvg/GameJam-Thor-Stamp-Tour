import { sign, verify } from 'hono/jwt';
import { env } from './env';

export interface TokenPayload {
  sub: string;
  nickname: string;
  exp: number;
  [key: string]: unknown;
}

export function signToken(user: { id: string; nickname: string }): Promise<string> {
  const payload: TokenPayload = {
    sub: user.id,
    nickname: user.nickname,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30일
  };
  return sign(payload, env.JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, 'HS256');
  if (typeof payload.sub !== 'string' || typeof payload.nickname !== 'string') {
    throw new Error('invalid token payload');
  }
  return payload as TokenPayload;
}
