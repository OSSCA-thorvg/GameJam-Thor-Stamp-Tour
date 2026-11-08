import type { Appearance } from './game';

export interface MeResponse {
  id: string;
  nickname: string;
  /** 온보딩 전이면 null */
  appearance: Appearance | null;
}

export interface AuthResponse {
  token: string;
  user: MeResponse;
}

export interface Spot {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  radiusM: number;
  /** 요청에 lat/lng를 주면 서버가 계산해서 채움 */
  distanceM?: number;
  stamped?: boolean;
}

export interface StampRecord {
  id: string;
  spotId: string;
  spotName: string;
  stampedAt: string;
}

export interface StampResponse {
  stamp: StampRecord;
}

export interface ApiError {
  error: string;
  /** 반경 밖 거절 시 현재 거리(m) */
  distanceM?: number;
}
