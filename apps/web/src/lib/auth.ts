export interface StoredUser {
  id: string;
  nickname: string;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: StoredUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
