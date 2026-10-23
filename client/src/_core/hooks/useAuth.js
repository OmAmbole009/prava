import { startLogin } from "@/const";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

export function useAuth(options) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.auth.me();
      } catch {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.warn("[Auth] Logout error:", error);
    } finally {
      try {
        sessionStorage.clear();
        localStorage.removeItem("manus-runtime-user-info");
        localStorage.removeItem("prava-active-business-id");
        document.cookie = "app_session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "manus-cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      } catch {}
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [logoutMutation, queryClient]);

  useEffect(() => {
    try {
      if (meQuery.data) {
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
      } else {
        localStorage.removeItem("manus-runtime-user-info");
      }
    } catch {
      // Storage can be unavailable in private or embedded browser contexts.
    }
  }, [meQuery.data]);

  const state = useMemo(() => {
    const activeUser = meQuery.data ?? null;
    return {
      user: activeUser,
      loading: meQuery.isLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(activeUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else if (import.meta.env.VITE_OAUTH_PORTAL_URL) {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
