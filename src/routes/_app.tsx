import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { store } from "@/store";
import { canAccess } from "@/lib/rbac";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/authSlice";
import { authApi } from "@/services/auth.service";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    let { auth } = store.getState();
    if (!auth.token) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }

    let user = auth.user;
    try {
      const fresh = await authApi.me();
      auth = store.getState().auth;
      if (auth.token) {
        store.dispatch(setCredentials({ user: fresh, token: auth.token }));
      }
      user = fresh;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        store.dispatch(logout());
        throw redirect({ to: "/login", search: { redirect: location.href } as never });
      }
      user = store.getState().auth.user;
    }

    if (user?.forcePasswordChange && location.pathname !== "/profile") {
      throw redirect({ to: "/profile" });
    }
    if (!canAccess(location.pathname, user?.role)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.auth);

  // Re-validate the authenticated user on every app mount.
  // Prevents a stale localStorage user (e.g. after switching accounts) from
  // leaking the wrong profile/role into the UI.
  useEffect(() => {
    let cancelled = false;
    if (!session.token) return;
    authApi
      .me()
      .then((fresh) => {
        if (cancelled) return;
        const current = store.getState().auth;
        if (!current.token) return;
        // If the JWT belongs to a different user than the cached one, replace.
        if (
          current.user?.id !== fresh.id ||
          current.user?.role !== fresh.role ||
          current.user?.email !== fresh.email
        ) {
          dispatch(setCredentials({ user: fresh, token: current.token }));
        } else if (
          current.user?.name !== fresh.name ||
          current.user?.profileImage !== fresh.profileImage
        ) {
          dispatch(setCredentials({ user: { ...current.user, ...fresh }, token: current.token }));
        }
      })
      .catch((error) => {
        // Only an auth rejection should clear the persisted session.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          dispatch(logout());
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
