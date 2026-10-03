import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://cdt-enlargement-fighting-ide.trycloudflare.com/api';
const isPrivateOrInsecureApiUrl = (value: string) =>
  !/^https:\/\//i.test(value) ||
  /^https:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254(?:\.\d{1,3}){2}|0\.\d{1,3}(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)|^https:\/\/[^/]+\.(?:local|internal)(?::\d+)?(?:\/|$)/i.test(value);
const configuredApiBaseUrl = [Constants.expoConfig?.extra?.apiBaseUrl, process.env.EXPO_PUBLIC_API_URL]
  .map((value) => value?.trim().replace(/\/+$/, ''))
  .find((value) => value && !isPrivateOrInsecureApiUrl(value));

export const API_BASE_URL = configuredApiBaseUrl && !isPrivateOrInsecureApiUrl(configuredApiBaseUrl)
  ? configuredApiBaseUrl
  : DEFAULT_API_BASE_URL;

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

class ApiClient {
  private token: string | null = null;
  private isInitialized = false;

  async initToken(): Promise<string | null> {
    if (this.isInitialized) return this.token;
    try {
      const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
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

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) {
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist token to storage:', e);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    if (!response.ok) {
      const error = new Error(getSafeHttpErrorMessage(response.status));
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
