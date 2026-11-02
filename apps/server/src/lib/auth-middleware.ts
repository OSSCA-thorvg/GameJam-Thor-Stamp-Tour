import { createMiddleware } from 'hono/factory';
import { verifyToken } from './jwt';

export type AuthEnv = {
  Variables: {
    userId: string;
    nickname: string;
  };
};

export const authGuard = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401);
  try {
    const payload = await verifyToken(token);
    c.set('userId', payload.sub);
    c.set('nickname', payload.nickname);
  } catch {
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401);
  }
  await next();
});
