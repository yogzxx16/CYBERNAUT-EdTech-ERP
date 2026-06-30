import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { logout, setCredentials } from "@/store/slices/authSlice";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send the httpOnly refresh-token cookie
  headers: { "Content-Type": "application/json" },
});

// Attach access token
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.token;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Refresh-on-401 with single-flight guard
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        const newToken: string | undefined = res.data?.data?.tokens?.accessToken;
        if (!newToken) return null;
        const current = store.getState().auth;
        if (current.user) {
          store.dispatch(setCredentials({ user: current.user, token: newToken }));
        }
        return newToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";

    if (status === 401 && original && !original._retried && !url.includes("/auth/")) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      store.dispatch(logout());
    }
    return Promise.reject(error);
  },
);

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  details?: unknown;
}

export function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}
