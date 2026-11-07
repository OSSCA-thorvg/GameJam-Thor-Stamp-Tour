import { useEffect, useRef, useState } from 'react';
import type { WorldPlayer, WorldSpot, WorldStatusPayload } from '@stamp-tour/shared';
import { getWorldSocket } from '../lib/socket';
import { useGeolocation } from './useGeolocation';

export type WorldView =
  | { kind: 'connecting' }
  | { kind: 'unavailable' }
  | { kind: 'replaced' }
  | { kind: 'outside'; nearest: { name: string; distanceM: number } | null }
  | { kind: 'inside'; spot: WorldSpot; me: WorldPlayer };

/** 홈 화면이 열려 있는 동안만 /world 연결을 유지하고 서버가 판정한 맵 상태를 돌려준다. */
export function useWorld() {
  const { lat, lng, error: geoError } = useGeolocation();
  const [view, setView] = useState<WorldView>({ kind: 'connecting' });
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const socket = getWorldSocket();

    const onConnect = () => socket.emit('world:location', positionRef.current);
    const onConnectError = () => setView({ kind: 'unavailable' });
    const onDisconnect = () =>
      setView((v) => (v.kind === 'replaced' ? v : { kind: 'connecting' }));
    const onStatus = (status: WorldStatusPayload) => {
      if (status.state === 'inside') {
        setView({ kind: 'inside', spot: status.spot, me: status.me });
      } else {
        setView({ kind: 'outside', nearest: status.nearest });
      }
    };
    const onReplaced = () => setView({ kind: 'replaced' });

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('world:status', onStatus);
    socket.on('world:replaced', onReplaced);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('world:status', onStatus);
      socket.off('world:replaced', onReplaced);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (lat === null || lng === null) return;
    positionRef.current = { lat, lng };
    const socket = getWorldSocket();
    if (socket.connected) socket.emit('world:location', positionRef.current);
  }, [lat, lng]);

  return { view, geoError };
}
