# ThorVG WebCanvas 문제 기록

홈 맵을 만들면서 `@thorvg/webcanvas` 1.1.3에서 겪은 문제와 대응을 기록한다. 렌더러는 `sw`다.

- **확인:** 실제 Chromium에서 재현하고 확인했다.
- **설계 검토:** 구현 전 설계 검토에서 시험한 내용이다. 현재 코드가 이 동작을 전제로 쓰였고 정상 동작한다.

## 이미지 (Picture)

### 첫 Canvas보다 먼저 불러온 이미지가 투명하게 그려진다 (확인)

- **증상:** 배경 PNG가 로드되고 크기도 정상인데 화면에는 아무것도 그려지지 않는다.
- **원인:** 앱에서 첫 `TVG.Canvas`를 만들기 전에 `Picture.load()`를 호출하면 그 이미지는 투명하게 그려진다. 이후에 불러온 이미지는 정상이다.
- **대응:** Canvas를 먼저 만들고 이미지를 불러온다 (`apps/web/src/game/game.ts`의 `createGame`).

### `caBX` 블록이 있는 PNG를 읽지 못한다 (확인)

- **증상:** 배경이 투명하게 나온다. `picture.size()`가 실제 크기(2048x768) 대신 716x716을 돌려준다. 예외는 없다.
- **원인:** AI 이미지 서비스가 출처 정보(C2PA)를 `caBX` 블록에 넣는다. PNG 규격상 무시해도 되는 블록인데 ThorVG가 이 블록에서 디코딩에 실패한다. 같은 크기라도 이 블록이 없으면 정상이다.
- **대응:** PNG에서 `caBX` 블록을 지운다. 그림 픽셀은 바뀌지 않는다. AI 서비스에서 받은 이미지는 넣기 전에 확인한다.

### 깨진 PNG도 예외를 던지지 않는다 (확인)

- **증상:** `load()`가 성공한 것처럼 끝나고 크기가 0x0이다. 콘솔에 `MediaPlayer: Media decode failed`가 남을 수 있다.
- **대응:** `try/catch`와 함께 `size().width > 0`을 검사하고, 실패하면 임시 그림으로 대체한다 (`apps/web/src/game/assets.ts`의 `loadBackground`).

### `size()`는 원래 비율을 유지한다 (설계 검토)

- 비율이 다른 이미지를 640x240으로 지정하면 남는 곳이 빈다. 배경은 정확히 8:3 비율로 만든다.

## Lottie (LottieAnimation)

### `segment(마커)`를 쓰면 `frame()` 번호가 어긋난다 (확인)

- **증상:** `segment('walk')` 뒤에 `frame(12)`를 주면 기대한 절대 프레임 12가 아닌 다른 프레임이 그려진다.
- **대응:** `segment()`를 쓰지 않는다. `marker(i)`로 각 마커의 `begin`, `end`를 읽고 절대 프레임 번호로 `frame()`을 호출한다 (`apps/web/src/game/game.ts`의 `Sprite`).

### 깨진 Lottie JSON은 예외를 던진다 (확인)

- **증상:** `load()`에서 `RuntimeError: function signature mismatch`가 난다.
- **대응:** `try/catch`로 감싸고 임시 사각형으로 대체한다.

## 변환 (transform)

### 좌우 반전은 `transform()`으로만 된다 (설계 검토, 반전은 확인)

- `scale()`은 값 하나만 받아서 좌우 반전을 할 수 없다.
- `transform()`에 `e11: -1`을 주어 뒤집는다. 그림에 `origin(0.5, 1)`을 두면 발 가운데를 기준으로 뒤집힌다.

### `transform()`은 기존 변환을 대체한다 (설계 검토)

- 타입 설명에는 "곱한다"고 적혀 있지만 실제로는 대체한다.
- `transform()` 뒤에 호출한 `translate()`는 무시된다. 움직이는 물체는 `transform()` 하나로 위치와 방향을 함께 지정한다.

### 매 프레임 `canvas.update().render()`를 호출한다 (설계 검토)

- `render()`만 호출하면 바뀐 변환이 반영되지 않는다.

## 초기화와 Canvas

### wasm 파일을 CDN에서 받는다 (확인)

- **증상:** `locateFile` 없이 초기화하면 `thorvg.wasm`을 unpkg에서 받는다.
- **대응:** Vite `?url`로 로컬 wasm 경로를 넘긴다. 패키지 `exports`에 wasm이 없어서 `@thorvg/webcanvas/dist/thorvg.wasm?url`은 실패한다. `node_modules` 상대 경로를 쓴다 (`apps/web/src/game/engine.ts`).

### React StrictMode에서 두 번 초기화된다 (설계 검토)

- `init()`은 `await`가 끝난 뒤에 초기화 완료를 표시한다. 그래서 effect가 두 번 실행되면 모듈을 두 번 불러온다.
- **대응:** 초기화 Promise를 모듈에 한 번만 만들어 재사용한다. `term()`은 호출하지 않는다 (`apps/web/src/game/engine.ts`의 `getThorVG`).

### Canvas가 크기를 inline 스타일로 쓴다 (설계 검토)

- ThorVG가 canvas 요소에 픽셀 크기를 inline으로 쓴다. CSS로 확대하려면 `w-full! h-auto!`처럼 `!important`가 필요하다.
- 도트를 그대로 키우려면 `enableDevicePixelRatio: false`와 `image-rendering: pixelated`를 함께 쓴다.

### 정리 함수 이름이 다르다 (설계 검토)

- Canvas는 `destroy()`, 그림과 애니메이션은 `dispose()`다.

## 도트 그림 규칙 (설계 검토)

- 1배 크기로 그리면 픽셀이 정확하다. 2배 Nearest 확대는 고르지 않다. 그림은 원래 크기로 만든다.
- 좌우 반전 시 가장자리 한 줄이 잘린다. 캐릭터 그림은 좌우에 1px 투명 여백을 둔다.
