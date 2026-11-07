export interface GameInput {
  left: boolean;
  right: boolean;
  jumpQueued: boolean;
}

export function createInput(): GameInput {
  return { left: false, right: false, jumpQueued: false };
}

export function bindKeyboard(input: GameInput): () => void {
  const onKey = (e: KeyboardEvent, down: boolean) => {
    // 입력칸에서 글을 쓸 때는 게임 키로 처리하지 않는다. 뗄 때는 눌린 상태가 남지 않게 그대로 처리한다.
    if (down && e.target instanceof HTMLInputElement) return;
    if (e.code === 'ArrowLeft') input.left = down;
    else if (e.code === 'ArrowRight') input.right = down;
    else if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (down && !e.repeat) input.jumpQueued = true;
    } else return;
    e.preventDefault();
  };
  const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
  const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
  const onBlur = () => {
    input.left = false;
    input.right = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
