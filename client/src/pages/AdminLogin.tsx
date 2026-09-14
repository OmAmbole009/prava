import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("omambole2007@gmail.com");
  const [password, setPassword] = useState("");
  const login = trpc.auth.adminLogin.useMutation({
    onSuccess: (result) => {
      toast.success("Administrator access granted.");
      setLocation(result.redirectTo);
    },
    onError: (error) => toast.error(error.message || "Administrator sign-in was not accepted."),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-5 py-10 text-foreground">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <main className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <PravaMark size="lg" />
        </div>

        <section className="prava-panel overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <div className="border-b border-slate-200/80 dark:border-white/[0.08] px-7 py-7 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="prava-live-beacon" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Protected Admin Console
              </span>
            </div>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-3xl font-normal tracking-tight text-slate-900 dark:text-white">
              Administrator <em className="italic font-normal">Sign In</em>
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Use designated administrator credentials to access audited security controls and CA governance.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5 px-7 py-7" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="admin-email" className="text-xs text-slate-700 dark:text-slate-300">
                Administrator Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-password" className="text-xs text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm"
                required
              />
              <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                This session is limited to eight hours and is logged in the administrator audit trail.
              </p>
            </div>

            <Button
              type="submit"
              disabled={login.isPending || !email || !password}
              className="w-full rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              {login.isPending ? (
                "Checking access…"
              ) : (
                <>
                  <LockKeyhole className="mr-2 size-4" />
                  Open Administration <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>

            <div className="mt-4 border-t border-slate-200 dark:border-white/[0.06] pt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <p>
                Are you a Chartered Accountant?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/ca/login")}
                  className="font-bold text-slate-900 dark:text-white underline hover:opacity-80"
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
