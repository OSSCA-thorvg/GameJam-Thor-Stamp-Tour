# 배포용 이미지 — 화면을 빌드해 두고 서버 하나가 API, 실시간 연결, 화면 파일을 모두 내준다.
FROM node:22-slim

RUN corepack enable
WORKDIR /app

# 의존성 설치를 소스 변경과 분리해서 캐시한다
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# 서버를 tsx로 실행하고 화면을 vite로 빌드하므로 개발용 의존성도 함께 설치한다
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @stamp-tour/web build

ENV NODE_ENV=production
# PORT는 호스팅 서비스가 정해 준다 (없으면 3000)
CMD ["pnpm", "--filter", "@stamp-tour/server", "start"]
