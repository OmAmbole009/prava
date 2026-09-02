import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, LayoutDashboard, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const isWorkspacePath = /^\/(onboarding|dashboard|tasks|documents|billing|admin)/.test(location);
  const destination = isWorkspacePath ? "/dashboard" : "/";
  const destinationLabel = isWorkspacePath ? "Return to dashboard" : "Return home";

  return <div className="prava-grid flex min-h-screen items-center justify-center bg-[#f7f3e9] px-5 py-12 text-[#153832]"><main className="w-full max-w-2xl"><PravaMark className="justify-center" /><section className="mt-8 overflow-hidden rounded-[2rem] border border-[#ded3bf] bg-[#fffdf8] shadow-[0_28px_70px_rgb(29_58_49_/_0.11)]"><div className="bg-[#163a34] px-7 py-6 text-[#f7f1e4] sm:px-10"><div className="flex items-center gap-3 text-[#cfe4ad]"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><Compass className="size-5" /></span><span className="text-xs font-semibold uppercase tracking-[0.16em]">Route recovery</span></div><h1 className="prava-display mt-5 text-4xl leading-none sm:text-5xl">This page is not in your Prava workspace.</h1></div><div className="px-7 py-7 sm:px-10 sm:py-9"><p className="max-w-xl text-sm leading-7 text-[#62736b]">The address may be outdated, incomplete, or no longer available. You can return to a known workspace view, or refresh to load the latest release.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button onClick={() => setLocation(destination)} className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]"><LayoutDashboard className="mr-2 size-4" />{destinationLabel}</Button><Button variant="outline" onClick={() => window.location.reload()} className="rounded-full border-[#d5cab6] text-[#315b4c] hover:bg-[#f6f1e7]"><RefreshCw className="mr-2 size-4" />Refresh this page</Button></div><button type="button" onClick={() => window.history.back()} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#466a5d] transition hover:text-[#173c34]"><ArrowLeft className="size-4" />Go back</button></div></section></main></div>;
}
