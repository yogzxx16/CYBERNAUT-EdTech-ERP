import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, Role } from "@/types/roles";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  remember: boolean;
}

const STORAGE_KEY = "cybernaut.auth";

function loadInitial(): AuthState {
  if (typeof window === "undefined")
    return { user: null, token: null, isAuthenticated: false, remember: true };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, isAuthenticated: false, remember: true };
    const parsed = JSON.parse(raw) as { user: AuthUser; token: string; remember?: boolean };
    return {
      user: parsed.user,
      token: parsed.token,
      isAuthenticated: true,
      remember: parsed.remember !== false,
    };
  } catch {
    return { user: null, token: null, isAuthenticated: false, remember: true };
  }
}

function persist(payload: { user: AuthUser; token: string; remember: boolean }) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(payload);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitial(),
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; token: string; remember?: boolean }>,
    ) {
      const remember = action.payload.remember ?? state.remember ?? true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.remember = remember;
      persist({ user: action.payload.user, token: action.payload.token, remember });
    },
    updateRole(state, action: PayloadAction<Role>) {
      if (state.user) {
        state.user.role = action.payload;
        if (state.token) {
          persist({ user: state.user, token: state.token, remember: state.remember });
        }
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    },
  },
});

export const { setCredentials, updateRole, logout } = authSlice.actions;
export default authSlice.reducer;
