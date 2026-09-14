import { CursorTube } from "@/components/CursorTube";
import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, LayoutDashboard, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const isWorkspacePath = /^\/(onboarding|dashboard|assistant|money|tax|ca-review|tasks|documents|billing|admin|invite)/.test(
    location
  );
  const destination = isWorkspacePath ? "/dashboard" : "/";
  const destinationLabel = isWorkspacePath ? "Return to Command Center" : "Return to Home";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <CursorTube />
      <main className="w-full max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <PravaMark size="lg" />
        </div>
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-border/60 bg-gradient-to-br from-secondary/40 to-transparent px-7 py-8 sm:px-10">
            <div className="flex items-center justify-center gap-2">
              <span className="size-2 rounded-full bg-primary/80 animate-pulse" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
                Route Not Found // 404
              </span>
            </div>
            <h1 className="font-serif mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              This page is not in <span className="italic font-normal text-muted-foreground">your workspace</span>.
            </h1>
          </div>

          <div className="px-7 py-7 sm:px-10 sm:py-9 text-center">
            <p className="mx-auto max-w-xl text-xs leading-6 text-muted-foreground">
              The address may be outdated, incomplete, or no longer available. You can return to your command center or
              reload to fetch latest routes.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={() => setLocation(destination)}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                <LayoutDashboard className="mr-2 size-4" />
                {destinationLabel}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
              >
                <RefreshCw className="mr-2 size-4 text-foreground" />
                Refresh Page
              </Button>
            </div>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Go Back
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
