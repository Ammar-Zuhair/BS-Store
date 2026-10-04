import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage';

const DEVELOPMENT_API_BASE_URL = 'https://implosive-exchange-compacter.ngrok-free.dev/api';
const isPrivateOrInsecureApiUrl = (value: string) =>
  !/^https:\/\//i.test(value) ||
  /^https:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254(?:\.\d{1,3}){2}|0\.\d{1,3}(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)|^https:\/\/[^/]+\.(?:local|internal)(?::\d+)?(?:\/|$)/i.test(value);
const isDevelopmentTunnel = (value: string) => /(?:^|\.)(?:[^./]+\.)*(?:ngrok(?:-free)?\.(?:app|dev|io)|trycloudflare\.com)(?::\d+)?(?:\/|$)/i.test(value.replace(/^https:\/\//i, ''));
const configuredApiBaseUrl = [Constants.expoConfig?.extra?.apiBaseUrl, process.env.EXPO_PUBLIC_API_URL]
  .map((value) => value?.trim().replace(/\/+$/, ''))
  .find((value) => value && !isPrivateOrInsecureApiUrl(value) && (__DEV__ || !isDevelopmentTunnel(value)));

export const API_BASE_URL = configuredApiBaseUrl && !isPrivateOrInsecureApiUrl(configuredApiBaseUrl)
  ? configuredApiBaseUrl
  : __DEV__
    ? DEVELOPMENT_API_BASE_URL
    : (() => { throw new Error('EXPO_PUBLIC_API_URL is required for production builds.'); })();

function getSafeHttpErrorMessage(status: number): string {
  if (status === 401) return 'تعذر تسجيل الدخول أو انتهت الجلسة. يرجى تسجيل الدخول مجدداً.';
  if (status === 403) return 'ليست لديك صلاحية لإتمام هذا الإجراء.';
  if (status === 404) return 'تعذر العثور على البيانات المطلوبة.';
  if (status === 409) return 'تعذر إتمام العملية بسبب تعارض في البيانات. راجعها وحاول مجدداً.';
  if (status === 400 || status === 422) return 'تعذر إتمام الطلب. راجع البيانات المدخلة وحاول مجدداً.';
  if (status === 429) return 'عدد المحاولات كبير. انتظر قليلاً ثم حاول مجدداً.';
  if (status >= 500) return 'الخدمة غير متاحة مؤقتاً. حاول مجدداً لاحقاً.';
  return 'تعذر إتمام الطلب. حاول مجدداً لاحقاً.';
}

const TOKEN_STORAGE_KEY = '@bs_customer_token';
const REFRESH_TOKEN_STORAGE_KEY = '@bs_customer_refresh_token';

function getHttpErrorMessage(status: number, responseBody: any): string {
  const serverMessage = typeof responseBody?.message === 'string' ? responseBody.message.trim() : '';
  return serverMessage || getSafeHttpErrorMessage(status);
}

class ApiClient {
  private token: string | null = null;
  private isInitialized = false;
  private refreshInFlight: Promise<boolean> | null = null;
  private sessionExpiredHandler: (() => void) | null = null;

  setSessionExpiredHandler(handler: (() => void) | null): void {
    this.sessionExpiredHandler = handler;
  }

  async initToken(): Promise<string | null> {
    if (this.isInitialized) return this.token;
    try {
      const stored = await tokenStorage.get(TOKEN_STORAGE_KEY);
      if (stored) {
        this.token = stored;
      }
    } catch (e) {
      console.warn('Failed to load token from storage:', e);
    } finally {
      this.isInitialized = true;
    }
    return this.token;
  }

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    if (token === null) {
      await this.clearStoredTokens();
    } else {
      await tokenStorage.set(TOKEN_STORAGE_KEY, token);
    }
  }

  async setRefreshToken(token: string | null): Promise<void> {
    await tokenStorage.set(REFRESH_TOKEN_STORAGE_KEY, token);
  }

  getToken(): string | null {
    return this.token;
  }

  private async clearStoredTokens(): Promise<void> {
    this.token = null;
    await tokenStorage.remove([TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY]);
  }

  private async expireSession(): Promise<void> {
    try {
      await this.clearStoredTokens();
    } catch (error) {
      console.warn('Failed to clear expired customer session:', error);
    }
    this.sessionExpiredHandler?.();
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refresh = (async () => {
      let refreshToken: string | null = null;
      try {
        refreshToken = await tokenStorage.get(REFRESH_TOKEN_STORAGE_KEY);
      } catch {
        return false;
      }

      if (!refreshToken) {
        await this.expireSession();
        return false;
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Keep the refresh token when the network is unavailable so the next
        // request can retry instead of signing the customer out prematurely.
        return false;
      }

      const payload = await response.json().catch(() => null);
      const auth = payload?.data !== undefined ? payload.data : payload;
      if (!response.ok || !auth?.accessToken || !auth?.refreshToken) {
        await this.expireSession();
        return false;
      }

      this.token = auth.accessToken;
      try {
        await Promise.all([
          tokenStorage.set(TOKEN_STORAGE_KEY, auth.accessToken),
          tokenStorage.set(REFRESH_TOKEN_STORAGE_KEY, auth.refreshToken),
        ]);
      } catch {
        await this.expireSession();
        return false;
      }
      return true;
    })();

    this.refreshInFlight = refresh;
    try {
      return await refresh;
    } finally {
      if (this.refreshInFlight === refresh) this.refreshInFlight = null;
    }
  }

  private buildHeaders(options: RequestInit, token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(options.headers as Record<string, string> || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      delete headers.Authorization;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    let response: Response;
    let retriedAfterRefresh = false;
    try {
      response = await fetch(url, {
        ...options,
        headers: this.buildHeaders(options, this.token),
      });
    } catch {
      throw new Error('تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مجدداً.');
    }

    const isAuthEndpoint = /^\/auth\/(?:login|register|check-phone|refresh)(?:\/|$)/.test(endpoint);
    if (response.status === 401 && !isAuthEndpoint) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        try {
          response = await fetch(url, {
            ...options,
            headers: this.buildHeaders(options, this.token),
          });
          retriedAfterRefresh = true;
        } catch {
          throw new Error('تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مجدداً.');
        }
      }
    }

    const data = await response.json().catch(() => null);
    // A body-less 401 after refresh is an authentication challenge. A 401
    // with an API message can be an account-level business error (for example,
    // a missing customer profile), so keep the newly refreshed session.
    if (retriedAfterRefresh && response.status === 401 && !data?.message) {
      await this.expireSession();
    }

    if (!response.ok) {
      const error = new Error(getHttpErrorMessage(response.status, data));
      (error as any).code = 'REQUEST_FAILED';
      (error as any).status = response.status;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
