import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import type { Root } from "react-dom/client";
import superjson from "superjson";
import WorkspaceApp from "./WorkspaceApp";
import { startLogin } from "./const";
import ErrorBoundary from "./components/ErrorBoundary";

export function mountWorkspace(root: Root) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof TRPCClientError && error.data?.httpStatus && error.data.httpStatus < 500) return false;
          return failureCount < 2;
        },
        retryDelay: attempt => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  const redirectToLoginIfUnauthorized = (error: unknown) => {
    if (!import.meta.env.VITE_OAUTH_PORTAL_URL) return;
    if (!(error instanceof TRPCClientError) || error.message !== UNAUTHED_ERR_MSG) return;
    startLogin(window.location.pathname);
  };
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.query.state.error);
  });
  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.mutation.state.error);
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          const token = raw?.split(";").find(segment => segment.trim().startsWith(`${COOKIE_NAME}=`))?.trim().slice(`${COOKIE_NAME}=`.length);
          return token ? { Authorization: `Bearer ${token}` } : {};
        } catch { return {}; }
      },
      fetch(input, init) { return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" }); },
    })],
  });
  root.render(<ErrorBoundary><trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><WorkspaceApp /></QueryClientProvider></trpc.Provider></ErrorBoundary>);
}
