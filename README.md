# 스탬프 투어 (Stamp Tour)

GPS 기반 관광지 스탬프 수집 + 실시간 1:1 퀴즈 대결 웹게임.

- 관광지 반경 안에 들어가면 스탬프 발급 (서버가 거리 검증)
- 접속 중인 유저끼리 랜덤 매칭되어 5라운드 관광지 퀴즈 대결
- 상세 설계: [docs/PLAN.md](docs/PLAN.md)

## 스택

pnpm 모노레포 · React(Vite) + Tailwind · Hono + Socket.IO · Postgres + Drizzle

```
apps/web        프론트엔드 (Vite + React)
apps/server     API + 실시간 게임 서버 (Hono + Socket.IO)
packages/shared 공유 타입·게임 상수
```

## 시작하기

```bash
# 1. 환경 변수
cp .env.example .env

# 2. Postgres 기동 (Docker)
docker compose up -d

# 3. 의존성 설치
pnpm install

# 4. 스키마 반영 + 시드 데이터
pnpm db:push
pnpm db:seed

# 5. 개발 서버 (web: 5173, server: 3000)
pnpm dev
```

브라우저에서 http://localhost:5173 접속.

## 게임 테스트 (혼자서 2인 플레이)

1. 일반 창과 시크릿 창에서 각각 닉네임으로 로그인
2. 두 창 모두 "대결" 탭에서 대결 신청 → 자동 매칭
3. 라운드당 15초, 5라운드 퀴즈 진행

## GPS 테스트

- `.env`의 `DEV_SKIP_GPS=true`면 거리 검증 없이 스탬프 발급 (개발 기본값)
- 실제 검증을 테스트하려면 `false`로 바꾸고 Chrome DevTools → Sensors에서 좌표를 관광지 근처로 오버라이드
