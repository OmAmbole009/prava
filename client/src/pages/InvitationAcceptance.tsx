import { useAuth } from "@/_core/hooks/useAuth";
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
  const accept = trpc.invitations.accept.useMutation({ onSuccess: result => { toast.success("Workspace invitation accepted."); setLocation(`/dashboard?business=${result.businessId}`); }, onError: error => toast.error(error.message) });
  const token = params?.token ?? "";

  useEffect(() => {
    if (!loading && user && token && !accept.isPending && !accept.isSuccess) accept.mutate({ token });
  }, [loading, user, token, accept]);

  if (!loading && !user) return <div className="prava-grid grid min-h-screen place-items-center bg-[#f7f3e9] px-5 text-[#153832]"><div className="w-full max-w-md text-center"><PravaMark className="justify-center" /><section className="mt-7 rounded-[2rem] border border-[#ded3bf] bg-[#fffdf8] p-8 shadow-[0_28px_70px_rgb(29_58_49_/_0.11)]"><ShieldCheck className="mx-auto size-8 text-[#507563]" /><h1 className="prava-display mt-5 text-3xl">Sign in to accept this invite</h1><p className="mt-3 text-sm leading-6 text-[#65766e]">Use the email address that received this workspace invitation. Prava will not create an account or membership until the invitation is verified.</p><Button onClick={() => startLogin(`/invite/${token}`)} className="mt-7 rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]">Sign in to continue</Button></section></div></div>;
  return <div className="prava-grid grid min-h-screen place-items-center bg-[#f7f3e9] px-5 text-center text-[#153832]"><div className="w-full max-w-md"><PravaMark className="justify-center" /><section className="mt-7 rounded-[2rem] border border-[#ded3bf] bg-[#fffdf8] p-8 shadow-[0_28px_70px_rgb(29_58_49_/_0.11)]">{accept.isSuccess ? <><CheckCircle2 className="mx-auto size-8 text-[#507563]" /><h1 className="prava-display mt-5 text-3xl">Invitation accepted</h1><p className="mt-3 text-sm text-[#65766e]">Opening your workspace.</p></> : <><Loader2 className="mx-auto size-8 animate-spin text-[#507563]" /><h1 className="prava-display mt-5 text-3xl">Verifying your invitation</h1><p className="mt-3 text-sm text-[#65766e]">Checking the invitation against your signed-in email and workspace role.</p></>}</section></div></div>;
}
