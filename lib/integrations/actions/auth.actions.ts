"use server";

import { cookies } from 'next/headers';
import { apiServer } from '../api/apiServer';
import { endpoints } from '../config';
import type { LoginRequest, AuthResponse, MeResponse } from '../types';

export async function loginAction(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiServer<any>(endpoints.auth.login, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  const { accessToken, refreshToken, csrfToken, user } = response;

  if (accessToken || refreshToken) {
    const cookieStore = await cookies();
    
    if (accessToken) {
      cookieStore.set('accessToken', accessToken, {
        path: '/',
        maxAge: 86400,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    if (refreshToken) {
      cookieStore.set('refreshToken', refreshToken, {
        path: '/',
        maxAge: 604800,
        httpOnly: true, // ✅ SECURITY: HttpOnly
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    if (csrfToken) {
      cookieStore.set('csrf_token', csrfToken, {
        path: '/',
        maxAge: 86400,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
  }

  return response;
}

// Sync session cookies from client to server (e.g. after refresh)
export async function syncSessionAction(accessToken: string, refreshToken: string, csrfToken?: string) {
  const cookieStore = await cookies();

  cookieStore.set('accessToken', accessToken, {
    path: '/',
    maxAge: 86400,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  cookieStore.set('refreshToken', refreshToken, {
    path: '/',
    maxAge: 604800,
    httpOnly: true, // ✅ SECURITY
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  if (csrfToken) {
    cookieStore.set('csrf_token', csrfToken, {
      path: '/',
      maxAge: 86400,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  return { success: true };
}

export async function getMeAction(): Promise<MeResponse> {
  return apiServer<MeResponse>(endpoints.auth.me);
}