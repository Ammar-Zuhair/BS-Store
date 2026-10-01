import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.253.2.95:5295/api';
const ACCESS_TOKEN_KEY = '@bs_courier_access_token';
const REFRESH_TOKEN_KEY = '@bs_courier_refresh_token';

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private sessionReady: Promise<void> | null = null;
  private refreshInProgress: Promise<boolean> | null = null;

  async initSession(): Promise<string | null> {
    if (!this.sessionReady) {
      this.sessionReady = (async () => {
        try {
          const [access, refresh] = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
          this.token = access[1];
          this.refreshToken = refresh[1];
        } catch (error) {
          console.warn('تعذر استعادة جلسة الموصل:', error);
        }
      })();
    }
    await this.sessionReady;
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) void AsyncStorage.setItem(ACCESS_TOKEN_KEY, token).catch((error) => console.warn('تعذر حفظ جلسة الموصل:', error));
    else void AsyncStorage.removeItem(ACCESS_TOKEN_KEY).catch((error) => console.warn('تعذر حذف جلسة الموصل:', error));
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (token) void AsyncStorage.setItem(REFRESH_TOKEN_KEY, token).catch((error) => console.warn('تعذر حفظ رمز تجديد جلسة الموصل:', error));
    else void AsyncStorage.removeItem(REFRESH_TOKEN_KEY).catch((error) => console.warn('تعذر حذف رمز تجديد جلسة الموصل:', error));
  }

  async clearSession() {
    this.token = null;
    this.refreshToken = null;
    this.sessionReady = Promise.resolve();
    try { await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]); }
    catch (error) { console.warn('تعذر حذف رموز جلسة الموصل من الجهاز:', error); }
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshInProgress) return this.refreshInProgress;
    this.refreshInProgress = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        const payload = await response.json().catch(() => null);
        const session = payload?.data ?? payload;
        if (!response.ok || !session?.accessToken || !session?.refreshToken) return false;
        this.setToken(session.accessToken);
        this.setRefreshToken(session.refreshToken);
        return true;
      } catch { return false; }
      finally { this.refreshInProgress = null; }
    })();
    return this.refreshInProgress;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    } catch (networkError: any) {
      throw new Error(`تعذر الاتصال بالسيرفر (${url}). تأكد من تشغيل الـ Backend.`);
    }

    const data = await response.json().catch(() => null);

    if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/refresh')) {
      if (await this.refreshSession()) return this.request<T>(endpoint, options);
      await this.clearSession();
    }

    if (!response.ok) {
      const errorMessage = data?.message || `خطأ في الاتصال بالسيرفر (${response.status})`;
      const error = new Error(errorMessage);
      (error as any).code = data?.code || 'ERROR';
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
