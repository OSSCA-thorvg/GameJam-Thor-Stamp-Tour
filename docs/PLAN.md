# 스탬프 투어 웹게임 — 프로젝트 스캐폴딩 계획

## Context

빈 디렉토리(`/Users/hyojin/Desktop/jinlee/project/stamp-tour`)에서 새 프로젝트를 시작한다.

**제품 요구사항** (대화에서 확정):
- GPS 기반 스탬프 투어: 관광지에 실제로 가면 스탬프 발급
- 실시간 매칭: 접속 유저 중 게임 신청자끼리 랜덤 1:1 매칭
- 1:1 게임: **관광지 퀴즈 대결** (라운드마다 같은 문제를 동시에 풀고 점수로 승부)
- 인증: **닉네임만 (게스트)** — 서버가 JWT 발급
- 지도 없음: **관광지 리스트 + 거리 표시**만 (지도는 추후)
- 관광지 데이터: **시드 파일로 직접 입력**

**확정 스택**: pnpm 모노레포 / Vite + React + TS + Tailwind / Node + Hono + Socket.IO / Postgres + Drizzle ORM

## 저장소 구조

```
stamp-tour/
├── pnpm-workspace.yaml
├── package.json              # 루트: dev/build 스크립트 (concurrently)
├── docs/
│   └── PLAN.md               # 이 계획 문서 (요구사항·스택·게임 규칙 기준 문서)
├── docker-compose.yml        # 로컬 Postgres
├── .env.example
├── apps/
│   ├── web/                  # Vite + React + TS + Tailwind
│   │   └── src/
│   │       ├── pages/        # Login, SpotList, MyStamps, Lobby, Game, Result
│   │       ├── hooks/        # useSocket, useGeolocation, useAuth
│   │       ├── api/          # REST 클라이언트 (fetch 래퍼)
│   │       └── App.tsx       # react-router 라우팅
│   └── server/               # Node + Hono + Socket.IO
│       └── src/
│           ├── index.ts      # Hono 앱 + Socket.IO를 같은 http 서버에 attach
│           ├── routes/       # auth.ts, spots.ts, stamps.ts
│           ├── game/         # matchmaking.ts, gameRoom.ts, quiz.ts
│           ├── db/           # schema.ts, client.ts, seed.ts
│           └── lib/          # jwt.ts, haversine.ts
└── packages/
    └── shared/               # 공유 타입·상수 (양쪽에서 import)
        └── src/
            ├── socket-events.ts   # 이벤트 이름 + 페이로드 타입
            ├── game.ts            # 게임 규칙 상수, 상태 타입
            └── api.ts             # REST 요청/응답 타입
```

## 0. 계획 문서 저장 (가장 먼저)

- `docs/` 폴더를 만들고 이 계획 문서를 `docs/PLAN.md`로 저장
- 제품 요구사항·스택 결정·게임 규칙·소켓 이벤트 계약이 레포 안에 남아 이후 작업의 기준 문서가 됨

## 1. 워크스페이스 기반

- `pnpm-workspace.yaml`: `apps/*`, `packages/*`
- 루트 `package.json`: `dev` (web + server 동시 실행), `db:push`, `db:seed`
- `docker-compose.yml`: Postgres 16 (포트 5432), `.env.example`에 `DATABASE_URL`, `JWT_SECRET`
- 공통 `tsconfig.base.json`, `packages/shared`는 소스 직접 참조(빌드 없이 `exports`로 ts 소스 노출, 양쪽 번들러가 처리)

## 2. packages/shared

- **소켓 이벤트 계약** (`socket-events.ts`): `ClientToServerEvents` / `ServerToClientEvents` 인터페이스로 Socket.IO 제네릭에 주입
  - 클라→서버: `queue:join`, `queue:leave`, `game:answer`
  - 서버→클라: `match:found`, `game:question`, `game:roundResult`, `game:over`, `opponent:disconnected`, `opponent:reconnected`
- **게임 상수** (`game.ts`): `ROUNDS = 5`, `ANSWER_TIME_MS = 15000`, `RECONNECT_GRACE_MS = 30000`, 점수 규칙(정답 10점 + 남은 시간 보너스)
- **스탬프 상수**: `STAMP_RADIUS_M = 100` (관광지별 override 가능)

## 3. apps/server

### DB 스키마 (Drizzle, `db/schema.ts`)
- `users`: id, nickname, createdAt
- `spots`: id, name, description, lat, lng, radiusM
- `stamps`: id, userId, spotId, stampedAt — `(userId, spotId)` unique
- `quizzes`: id, spotId(nullable), question, choices(json), answerIndex
- `gameResults`: id, player1Id, player2Id, winnerId, scores, playedAt

### 시드 (`db/seed.ts`)
- 서울 관광지 6곳(경복궁, N서울타워, 북촌, 광장시장, 덕수궁, 한강공원) 좌표 + 반경
- 관광지 관련 4지선다 퀴즈 ~20문항

### REST (Hono)
- `POST /api/auth/guest` — 닉네임 → user 생성 + JWT 반환
- `GET /api/spots` — 전체 관광지 (쿼리로 lat/lng 받으면 거리 계산해 정렬)
- `POST /api/spots/:id/stamp` — body의 좌표와 관광지 좌표를 **서버에서 haversine 검증** 후 스탬프 발급. 반경 밖이면 403 + 현재 거리 반환
- `GET /api/me/stamps` — 내 스탬프 목록
- JWT 미들웨어로 보호. **개발 편의**: `DEV_SKIP_GPS=true`면 거리 검증 생략(실기기 없이 테스트용)

### 실시간 (Socket.IO)
- 핸드셰이크에서 JWT 검증, `socket.data.userId` 저장 — **게임 상태의 키는 socket id가 아닌 userId**
- **매칭** (`game/matchmaking.ts`): 메모리 대기열 배열. `queue:join` 시 push, 2명 모이면 room 생성 후 `match:found`. 중복 신청/본인 매칭 방지
- **게임 룸** (`game/gameRoom.ts`): 서버 권위 상태 머신
  - 라운드마다 퀴즈 1개를 두 플레이어에게 동시 송신(정답 인덱스는 제외하고 송신)
  - 15초 타이머: 둘 다 답하거나 시간 초과 시 라운드 종료 → `game:roundResult`(정답 공개 + 점수)
  - 5라운드 후 `game:over`, `gameResults`에 저장
  - **재접속**: 연결 끊김 시 30초 유예. 유예 내 재접속하면 현재 게임 상태 재전송, 초과하면 몰수패
- 게임 판정·점수 계산은 전부 서버. 클라이언트는 표시만

## 4. apps/web

- Vite + React + TS + Tailwind, react-router
- **페이지**
  - `/login` — 닉네임 입력 → 토큰 localStorage 저장
  - `/spots` — 관광지 리스트. `useGeolocation`으로 현재 위치, 각 관광지까지 거리 표시, 반경 내면 "스탬프 받기" 버튼 활성화
  - `/stamps` — 내 스탬프 컬렉션 (획득/미획득 그리드)
  - `/lobby` — "대결 신청" 버튼 → `queue:join`, 매칭 대기 UI
  - `/game` — 퀴즈 진행: 문제 + 4지선다 + 남은 시간 바 + 양쪽 점수, 라운드 결과 표시
  - `/result` — 승패 + 최종 점수
- `useSocket`: shared의 이벤트 타입으로 typed socket 싱글턴, 토큰으로 인증
- 모바일 웹 우선 레이아웃 (max-width 컨테이너)

## 5. 실행 흐름

```bash
docker compose up -d        # Postgres
pnpm install
pnpm db:push && pnpm db:seed
pnpm dev                    # web(5173) + server(3000), Vite proxy로 /api, /socket.io 연결
```

## 검증

1. `pnpm dev` 기동 후 브라우저 2개(일반 + 시크릿)로 각각 닉네임 로그인
2. **스탬프**: `DEV_SKIP_GPS=true`로 발급 성공 확인 → 끄고 반경 밖 좌표로 403 확인 (브라우저 devtools sensor로 좌표 오버라이드)
3. **매칭**: 두 창에서 동시에 대결 신청 → `match:found` 수신, 게임 화면 진입
4. **게임**: 5라운드 진행, 점수 집계, 승패 판정, 같은 유저 재대결 가능 확인
5. **재접속**: 게임 중 한 창 새로고침 → 30초 내 복귀 시 상태 복원, 방치 시 몰수패 확인
6. **중복 방지**: 같은 관광지 스탬프 2회 요청 시 거부 확인

## 범위 제외 (추후)

지도 SDK, 소셜 로그인, TourAPI 연동, 관리자 페이지, Redis(멀티 서버 스케일), 배포 설정
