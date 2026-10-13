import { useAuth } from "@/_core/hooks/useAuth";
import { ElectricHorizonBackground } from "@/components/ElectricHorizonBackground";
import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function InvitationAcceptance() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  const accept = useMutation({
    mutationFn: () => api.invitations.accept({ token: token ?? "" }),
    onSuccess: (data) => {
      toast.success(data.message || "Invitation accepted.");
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message);
      setLocation("/dashboard");
    },
  });

  useEffect(() => {
    if (!loading && user && token && !ranRef.current) {
      ranRef.current = true;
      accept.mutate();
    }
  }, [loading, user, token, accept]);

  if (!loading && !user) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-[#030712] px-5 text-white overflow-hidden">
        <ElectricHorizonBackground variant="hero" />
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <PravaMark size="lg" />
          </div>
          <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="mt-5 text-xl sm:text-2xl font-medium tracking-tight text-white">
              Sign in to accept this <span className="text-slate-400">workspace invite</span>
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Use the email address that received this invitation. Prava will provision your membership once verified.
            </p>
            <Button
              onClick={() => startLogin(`/invite/${token}`)}
              className="mt-6 w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 shadow-md transition"
            >
              Sign in to continue
            </Button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-[#030712] px-5 text-center text-white overflow-hidden">
      <ElectricHorizonBackground variant="hero" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <PravaMark size="lg" />
        </div>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
          {accept.isSuccess ? (
            <>
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-sm">
                <CheckCircle2 className="size-5" />
              </div>
              <h1 className="mt-5 text-xl font-medium text-white">Invitation Accepted</h1>
              <p className="mt-2 text-xs text-slate-400">Opening your workspace telemetry…</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white shadow-sm">
                <Loader2 className="size-5 animate-spin text-cyan-400" />
              </div>
              <h1 className="mt-5 text-xl font-medium text-white">Verifying Invitation</h1>
              <p className="mt-2 text-xs text-slate-400">Checking credentials against your signed-in identity…</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
