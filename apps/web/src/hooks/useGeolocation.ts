import { useEffect, useState } from 'react';

export interface GeoState {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ lat: null, lng: null, error: null });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: '이 브라우저는 위치 정보를 지원하지 않습니다.' }));
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null }),
      (err) => setState((s) => ({ ...s, error: err.message })),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
