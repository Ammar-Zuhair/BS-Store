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

export const API_BASE_URL = configuredApiBaseUrl && !isPrivateOrInsecureApiUrl(configuredApiBaseUrl)
  ? configuredApiBaseUrl
  : __DEV__
    ? DEVELOPMENT_API_BASE_URL
    : (() => { throw new Error('No valid HTTPS API URL is configured for this production build.'); })();

function getSafeHttpErrorMessage(status: number): string {
  if (status === 401) return 'يلزم تسجيل الدخول بحساب مدير صالح لإجراء هذه العملية.';
  if (status === 403) return 'ليست لديك صلاحية لإتمام هذا الإجراء.';
  if (status === 404) return 'تعذر العثور على البيانات المطلوبة.';
  if (status === 409) return 'تعذر إتمام العملية بسبب تعارض في البيانات. راجعها وحاول مجدداً.';
  if (status === 400 || status === 422) return 'تعذر إتمام الطلب. راجع البيانات المدخلة وحاول مجدداً.';
  if (status === 429) return 'عدد المحاولات كبير. انتظر قليلاً ثم حاول مجدداً.';
  if (status >= 500) return 'الخدمة غير متاحة مؤقتاً. حاول مجدداً لاحقاً.';
  return 'تعذر إتمام الطلب. حاول مجدداً لاحقاً.';
}

const ACCESS_TOKEN_KEY = '@bs_admin_access_token';
const REFRESH_TOKEN_KEY = '@bs_admin_refresh_token';

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshInProgress: Promise<boolean> | null = null;
  private sessionReady: Promise<void> | null = null;

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
          console.warn('تعذر استعادة جلسة المدير:', error);
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
    catch (error) { console.warn('تعذر حذف رموز جلسة المدير من الجهاز:', error); }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, hasRetried = false): Promise<T> {
    await this.initSession();
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

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch {
      throw new Error('تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت وحاول مجدداً.');
    }

    const data = await response.json().catch(() => null);

    if (response.status === 401 && !hasRetried && !endpoint.includes('/auth/refresh') && this.refreshToken) {
      if (await this.refreshSession()) {
        return this.request<T>(endpoint, options, true);
      }
      await this.clearSession();
    }

    if (!response.ok) {
      const error = new Error(getSafeHttpErrorMessage(response.status));
      (error as any).code = 'REQUEST_FAILED';
      (error as any).status = response.status;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshInProgress) return this.refreshInProgress;

    this.refreshInProgress = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        const payload = await response.json().catch(() => null);
        const session = payload?.data ?? payload;
        if (!response.ok || !session?.accessToken || !session?.refreshToken) return false;
        await this.setToken(session.accessToken);
        await this.setRefreshToken(session.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInProgress = null;
      }
    })();

    return this.refreshInProgress;
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
