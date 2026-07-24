/**
 * Session admin côté navigateur (JWT) + gestion de compte / récupération.
 */

import type { AuthUser } from '@/types/api';
import { resolveApiBase } from '@/lib/api-base';

const TOKEN_KEY = 'marneza_admin_token';
const USER_KEY = 'marneza_admin_user';

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function authFetch(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${resolveApiBase()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new Error('Impossible de joindre l\'API. Vérifiez que le serveur tourne.');
  }
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Une erreur est survenue');
  }
  return json;
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAdminSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginAdmin(email: string, password: string) {
  const json = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = json.data;
  setAdminSession(token, user);
  return user as AuthUser;
}

export async function authMe(): Promise<AuthUser> {
  const token = getAdminToken();
  if (!token) throw new Error('Non connecté');

  const json = await authFetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const user = json.data as AuthUser;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateAdminProfile(data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
}) {
  const token = getAdminToken();
  if (!token) throw new Error('Non connecté');

  const json = await authFetch('/api/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

  const { token: nextToken, user } = json.data;
  setAdminSession(nextToken, user);
  return user as AuthUser;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const token = getAdminToken();
  if (!token) throw new Error('Non connecté');

  const json = await authFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return json.data as { message: string };
}

export async function forgotPassword(email: string) {
  const json = await authFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return json.data as { message: string };
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const json = await authFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
  return json.data as { message: string };
}

export async function forgotIdentifier(recoveryEmail: string) {
  const json = await authFetch('/api/auth/forgot-identifier', {
    method: 'POST',
    body: JSON.stringify({ recoveryEmail }),
  });
  return json.data as { message: string };
}

export async function confirmIdentifier(recoveryEmail: string, code: string) {
  const json = await authFetch('/api/auth/confirm-identifier', {
    method: 'POST',
    body: JSON.stringify({ recoveryEmail, code }),
  });
  return json.data as { message: string; loginEmails: string[] };
}

export function logoutAdmin() {
  clearAdminSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}
