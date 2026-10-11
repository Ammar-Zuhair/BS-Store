import { fetchWithTimeout } from '../utils/requests';
import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage';

const DEVELOPMENT_API_BASE_URL = 'https://implosive-exchange-compacter.ngrok-free.dev/api';
// Keep in sync with approvedProductionApiHosts in app.config.js.
const APPROVED_PRODUCTION_API_HOSTS = new Set(['implosive-exchange-compacter.ngrok-free.dev']);
const isPrivateOrInsecureApiUrl = (value: string) =>
  !/^https:\/\//i.test(value) ||
  /^https:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254(?:\.\d{1,3}){2}|0\.\d{1,3}(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)|^https:\/\/[^/]+\.(?:local|internal)(?::\d+)?(?:\/|$)/i.test(value);
const isDevelopmentTunnel = (value: string) => /(?:^|\.)(?:[^./]+\.)*(?:ngrok(?:-free)?\.(?:app|dev|io)|trycloudflare\.com)(?::\d+)?(?:\/|$)/i.test(value.replace(/^https:\/\//i, ''));
const isApprovedProductionApiUrl = (value: string) => {
  try {
    return APPROVED_PRODUCTION_API_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
};
const configuredApiBaseUrl = [Constants.expoConfig?.extra?.apiBaseUrl, process.env.EXPO_PUBLIC_API_URL]
  .map((value) => value?.trim().replace(/\/+$/, ''))
  .find((value) => value && !isPrivateOrInsecureApiUrl(value) && (__DEV__ || !isDevelopmentTunnel(value) || isApprovedProductionApiUrl(value)));

// Keep module initialization safe. An OTA bundle with a missing public API
// variable must still be able to register and render the app; failing at this
// module's top level prevents React from mounting and leaves Android on a blank
// launch screen. Report configuration errors from requests instead.
export const API_BASE_URL = configuredApiBaseUrl && !isPrivateOrInsecureApiUrl(configuredApiBaseUrl)
  ? configuredApiBaseUrl
  : __DEV__
    ? DEVELOPMENT_API_BASE_URL
    : '';

function ensureApiConfigured(): void {
  if (API_BASE_URL) return;
  const error = new Error('إعداد الاتصال بالخدمة غير مكتمل. يرجى إعادة المحاولة لاحقاً أو التواصل مع الدعم.');
  (error as any).code = 'API_CONFIGURATION_MISSING';
  throw error;
}

function getSafeHttpErrorMessage(status: number): string {
  if (status === 401) return 'بيانات الدخول غير صحيحة أو انتهت الجلسة. يرجى المحاولة مجدداً.';
  if (status === 403) return 'ليست لديك صلاحية لإتمام هذا الإجراء.';
  if (status === 404) return 'تعذر العثور على البيانات المطلوبة.';
  if (status === 409) return 'تعذر إتمام العملية بسبب تعارض في البيانات. راجعها وحاول مجدداً.';
  if (status === 400 || status === 422) return 'تعذر إتمام الطلب. راجع البيانات المدخلة وحاول مجدداً.';
  if (status === 429) return 'عدد المحاولات كبير. انتظر قليلاً ثم حاول مجدداً.';
  if (status >= 500) return 'الخدمة غير متاحة مؤقتاً. حاول مجدداً لاحقاً.';
  return 'تعذر إتمام الطلب. حاول مجدداً لاحقاً.';
}

function getHttpErrorMessage(status: number, responseBody: any): string {
  const serverMessage = typeof responseBody?.message === 'string'
    ? responseBody.message.trim()
    : typeof responseBody?.Message === 'string'
      ? responseBody.Message.trim()
      : '';
  return serverMessage || getSafeHttpErrorMessage(status);
}

const ACCESS_TOKEN_KEY = '@bs_courier_access_token';
const REFRESH_TOKEN_KEY = '@bs_courier_refresh_token';

class ApiClient {
  private token: string | null = null;
  private pendingGets = new Map<string, Promise<unknown>>();
  private refreshToken: string | null = null;
  private sessionReady: Promise<void> | null = null;
  private refreshInProgress: Promise<boolean> | null = null;

  async initSession(): Promise<string | null> {
    if (!this.sessionReady) {
      this.sessionReady = (async () => {
        try {
          [this.token, this.refreshToken] = await Promise.all([
            tokenStorage.get(ACCESS_TOKEN_KEY),
            tokenStorage.get(REFRESH_TOKEN_KEY),
          ]);
        } catch (error) {
          this.token = null;
          this.refreshToken = null;
          console.warn('تعذر استعادة جلسة الموصل:', error);
        }
      })();
    }
    await this.sessionReady;
    return this.token;
  }

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    await tokenStorage.set(ACCESS_TOKEN_KEY, token);
  }

  async setRefreshToken(token: string | null): Promise<void> {
    this.refreshToken = token;
    await tokenStorage.set(REFRESH_TOKEN_KEY, token);
  }

  async clearSession() {
    this.token = null;
    this.refreshToken = null;
    this.sessionReady = Promise.resolve();
    try { await tokenStorage.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]); }
    catch (error) { console.warn('تعذر حذف رموز جلسة الموصل من الجهاز:', error); }
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.refreshToken || !API_BASE_URL) return false;
    if (this.refreshInProgress) return this.refreshInProgress;
    this.refreshInProgress = (async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        const payload = await response.json().catch(() => null);
        const session = payload?.data ?? payload;
        if (!response.ok || !session?.accessToken || !session?.refreshToken) {
          if (response.status === 400 || response.status === 401 || response.status === 403) await this.clearSession();
          return false;
        }
        await this.setToken(session.accessToken);
        await this.setRefreshToken(session.refreshToken);
        return true;
      } catch { return false; }
      finally { this.refreshInProgress = null; }
    })();
    return this.refreshInProgress;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, hasRetried = false): Promise<T> {
    await this.initSession();
    ensureApiConfigured();
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(options.headers as Record<string, string> || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const sentToken = this.token;
    let response: Response;
    try {
      response = await fetchWithTimeout(url, {
        ...options,
        headers,
      });
    } catch {
      throw new Error('تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مجدداً.');
    }

    const data = await response.json().catch(() => null);

    if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
      if (!hasRetried && ((this.token !== sentToken && !!this.token) || (this.refreshToken && await this.refreshSession())))
        return this.request<T>(endpoint, options, true);
      if (!hasRetried && this.refreshToken) {
        const error = new Error('تعذر تجديد الجلسة مؤقتاً. حاول مجدداً.');
        (error as any).status = 503;
        throw error;
      }
      if (hasRetried || !this.refreshToken) await this.clearSession();
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
    const key = `${this.token || ''}:${endpoint}`;
    const existing = this.pendingGets.get(key);
    if (existing) return existing as Promise<T>;
    const pending = this.request<T>(endpoint, { method: 'GET' }).finally(() => {
      if (this.pendingGets.get(key) === pending) this.pendingGets.delete(key);
    });
    this.pendingGets.set(key, pending);
    return pending;
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

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
