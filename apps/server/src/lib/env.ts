import { config } from 'dotenv';

// apps/server에서 실행되므로 레포 루트의 .env를 함께 찾는다 (앞의 파일이 우선).
config({ path: ['.env', '../../.env'], quiet: true });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://stamp:stamp@localhost:5432/stamp_tour',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  PORT: Number(process.env.PORT ?? 3000),
  DEV_SKIP_GPS: process.env.DEV_SKIP_GPS === 'true',
};
