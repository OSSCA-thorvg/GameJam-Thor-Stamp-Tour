import { useEffect, useRef, useState } from 'react';

export interface CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
}

/** enabled인 동안 후면 카메라 영상을 videoRef의 video에 보여 준다. 꺼지면 카메라를 놓는다. */
export function useCamera(enabled: boolean): CameraState {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setError(null);
    // HTTPS나 localhost가 아니면 mediaDevices가 없다
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저에서는 카메라를 사용할 수 없습니다.');
      return;
    }

    let dead = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    const stop = (target: MediaStream) => target.getTracks().forEach((track) => track.stop());

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((opened) => {
        if (dead) {
          stop(opened);
          return;
        }
        stream = opened;
        if (video) video.srcObject = opened;
      })
      .catch((err) => {
        if (dead) return;
        console.error('카메라 시작 실패:', err);
        setError('카메라를 켤 수 없습니다. 카메라 권한을 확인해주세요.');
      });

    return () => {
      dead = true;
      if (stream) stop(stream);
      if (video) video.srcObject = null;
    };
  }, [enabled]);

  return { videoRef, error };
}
