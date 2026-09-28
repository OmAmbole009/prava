import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WorkspaceApp from "./WorkspaceApp";
import { startLogin } from "./const";
import ErrorBoundary from "./components/ErrorBoundary";

export function mountWorkspace(root) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error?.status && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: attempt => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  const redirectToLoginIfUnauthorized = (error) => {
    if (!import.meta.env.VITE_OAUTH_PORTAL_URL) return;
    if (error?.status === 401 || error?.message === UNAUTHED_ERR_MSG) {
      startLogin(window.location.pathname);
    }
  };
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.query.state.error);
  });
  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.mutation.state.error);
  });

  root.render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WorkspaceApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
