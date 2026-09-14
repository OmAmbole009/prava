import { useAuth } from "@/_core/hooks/useAuth";
import { CursorTube } from "@/components/CursorTube";
import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function InvitationAcceptance() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const accept = trpc.invitations.accept.useMutation({
    onSuccess: (result) => {
      toast.success("Workspace invitation accepted.");
      setLocation(`/dashboard?business=${result.businessId}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const token = params?.token ?? "";

  useEffect(() => {
    if (!loading && user && token && !accept.isPending && !accept.isSuccess) {
      accept.mutate({ token });
    }
  }, [loading, user, token, accept]);

  if (!loading && !user) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <CursorTube />
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <PravaMark size="lg" />
          </div>
          <section className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
              <ShieldCheck className="size-6 text-foreground" />
            </div>
            <h1 className="font-serif mt-5 text-2xl sm:text-3xl font-normal text-foreground">
              Sign in to accept this <span className="italic font-normal text-muted-foreground">workspace invite</span>
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Use the email address that received this invitation. Prava will provision your membership once verified.
            </p>
            <Button
              onClick={() => startLogin(`/invite/${token}`)}
              className="mt-6 w-full rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
            >
              Sign in to continue
            </Button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-5 text-center text-foreground">
      <CursorTube />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <PravaMark size="lg" />
        </div>
        <section className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          {accept.isSuccess ? (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
                <CheckCircle2 className="size-6 text-primary" />
              </div>
              <h1 className="font-serif mt-5 text-2xl font-normal text-foreground">Invitation Accepted</h1>
              <p className="mt-2 text-xs text-muted-foreground">Opening your workspace telemetry…</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
              <h1 className="font-serif mt-5 text-2xl font-normal text-foreground">Verifying Invitation</h1>
              <p className="mt-2 text-xs text-muted-foreground">Checking credentials against your signed-in identity…</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
