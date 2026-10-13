import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: (body) => api.admin.login(body),
    onSuccess: () => {
      toast.success("Administrator session verified.");
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      setLocation("/admin/cas");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const submit = (event) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030712] p-4 text-white overflow-hidden">
      {/* Background glow lines */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <PravaMark size="lg" />
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

          <div className="border-b border-white/[0.06] px-7 py-7 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                PROTECTED ADMIN CONSOLE
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-medium tracking-tight text-white">
              Administrator <span className="text-slate-400">Sign In</span>
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Use designated administrator credentials to access audited security controls and CA governance.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 px-7 py-7" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email" className="text-xs font-medium text-slate-300">
                Administrator Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="admin-password" className="text-xs font-medium text-slate-300">
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                required
              />
              <p className="text-[11px] leading-relaxed text-slate-400">
                This session is limited to eight hours and is logged in the administrator audit trail.
              </p>
            </div>

            <Button
              type="submit"
              disabled={login.isPending || !email || !password}
              className="w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 shadow-md transition mt-2"
            >
              {login.isPending ? (
                "Checking access…"
              ) : (
                <>
                  <LockKeyhole className="mr-2 size-3.5" />
                  Open Administration <ArrowRight className="ml-2 size-3.5" />
                </>
              )}
            </Button>

            <div className="mt-4 border-t border-white/[0.06] pt-4 text-center text-xs text-slate-400">
              <p>
                Are you a Chartered Accountant?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/ca/login")}
                  className="font-medium text-cyan-400 underline hover:text-cyan-300"
                >
                  Sign in to CA Portal
                </button>
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
