import CursorTube from "@/components/CursorTube";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AskPrava = lazy(() => import("@/pages/AskPrava"));
const Money = lazy(() => import("@/pages/Money"));
const Documents = lazy(() => import("@/pages/Documents"));
const Tax = lazy(() => import("@/pages/Tax"));
const CaReview = lazy(() => import("@/pages/CaReview"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const Billing = lazy(() => import("@/pages/Billing"));
const AdminBilling = lazy(() => import("@/pages/AdminBilling"));
const DocumentReview = lazy(() => import("@/pages/DocumentReview"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminSecurity = lazy(() => import("@/pages/AdminSecurity"));
const AdminGstSubmissions = lazy(() => import("@/pages/AdminGstSubmissions"));
const AdminIntegrations = lazy(() => import("@/pages/AdminIntegrations"));
const AdminCaManagement = lazy(() => import("@/pages/AdminCaManagement"));
const CaLogin = lazy(() => import("@/pages/CaLogin"));
const CaDashboard = lazy(() => import("@/pages/CaDashboard"));
const InvitationAcceptance = lazy(() => import("@/pages/InvitationAcceptance"));

function DeferredPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#07080a] px-6 text-center text-slate-400">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <span className="size-4 animate-pulse rounded-full bg-white" />
            </div>
            <p className="mt-4 font-serif text-lg font-bold text-white">Opening Workspace</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Initializing telemetry, secure ledgers, and verified compliance tools.
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
            </div>
          </div>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export default function WorkspaceApp() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <CursorTube />
          <Toaster />
          <Switch>
            <Route path="/ca/login">{() => <DeferredPage component={CaLogin} />}</Route>
            <Route path="/ca/dashboard">{() => <DeferredPage component={CaDashboard} />}</Route>
            <Route path="/admin/login">{() => <DeferredPage component={AdminLogin} />}</Route>
            <Route path="/admin/security">{() => <DeferredPage component={AdminSecurity} />}</Route>
            <Route path="/admin/cas">{() => <DeferredPage component={AdminCaManagement} />}</Route>
            <Route path="/admin/gst">{() => <DeferredPage component={AdminGstSubmissions} />}</Route>
            <Route path="/admin/integrations">{() => <DeferredPage component={AdminIntegrations} />}</Route>
            <Route path="/invite/:token">{() => <DeferredPage component={InvitationAcceptance} />}</Route>
            <Route path="/onboarding">{() => <DeferredPage component={Onboarding} />}</Route>
            <Route path="/dashboard">{() => <DeferredPage component={Dashboard} />}</Route>
            <Route path="/assistant">{() => <DeferredPage component={AskPrava} />}</Route>
            <Route path="/money">{() => <DeferredPage component={Money} />}</Route>
            <Route path="/documents/:documentId">{() => <DeferredPage component={DocumentReview} />}</Route>
            <Route path="/documents">{() => <DeferredPage component={Documents} />}</Route>
            <Route path="/tax">{() => <DeferredPage component={Tax} />}</Route>
            <Route path="/ca-review">{() => <DeferredPage component={CaReview} />}</Route>
            <Route path="/tasks/:taskId">{() => <DeferredPage component={TaskDetail} />}</Route>
            <Route path="/tasks">{() => <DeferredPage component={Tasks} />}</Route>
            <Route path="/billing">{() => <DeferredPage component={Billing} />}</Route>
            <Route path="/admin/billing">{() => <DeferredPage component={AdminBilling} />}</Route>
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
