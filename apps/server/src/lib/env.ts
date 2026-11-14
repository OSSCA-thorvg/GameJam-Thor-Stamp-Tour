import { config } from 'dotenv';

// apps/server에서 실행되므로 레포 루트의 파일을 함께 찾는다 (앞의 파일이 우선).
// 개발할 때는 .env.local에 내 컴퓨터용 값을 두면 .env보다 먼저 쓰인다.
config({ path: ['.env.local', '../../.env.local', '.env', '../../.env'], quiet: true });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://stamp:stamp@localhost:5432/stamp_tour',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  PORT: Number(process.env.PORT ?? 3000),
  DEV_SKIP_GPS: process.env.DEV_SKIP_GPS === 'true',
};
