import { PravaMark } from "@/components/PravaMark";
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
    onSuccess: result => {
      toast.success("Administrator access granted.");
      setLocation(result.redirectTo);
    },
    onError: error => toast.error(error.message || "Administrator sign-in was not accepted."),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return <div className="prava-grid grid min-h-screen place-items-center bg-[#f7f3e9] px-5 py-10 text-[#153832]"><main className="w-full max-w-md"><PravaMark className="justify-center" /><section className="mt-7 overflow-hidden rounded-[2rem] border border-[#ded3bf] bg-[#fffdf8] shadow-[0_28px_70px_rgb(29_58_49_/_0.11)]"><div className="bg-[#163a34] px-7 py-7 text-[#f7f1e4]"><div className="flex items-center gap-3 text-[#cfe4ad]"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><ShieldCheck className="size-5" /></span><span className="text-xs font-semibold uppercase tracking-[0.16em]">Protected access</span></div><h1 className="prava-display mt-5 text-4xl leading-none">Administrator sign in</h1><p className="mt-3 max-w-sm text-sm leading-6 text-[#c5d2c9]">Use the designated administrator identity to open Prava’s audited plan and subscription controls.</p></div><form onSubmit={submit} className="space-y-5 px-7 py-7" noValidate><div className="grid gap-2"><Label htmlFor="admin-email">Administrator email</Label><Input id="admin-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /><p className="text-xs leading-5 text-[#718078]">This session is limited to eight hours and is recorded in the administrator audit trail.</p></div><Button type="submit" disabled={login.isPending || !email || !password} className="w-full rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]">{login.isPending ? "Checking access…" : <><LockKeyhole className="mr-2 size-4" />Open administration <ArrowRight className="ml-2 size-4" /></>}</Button></form></section></main></div>;
}
