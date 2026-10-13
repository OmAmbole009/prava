import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import ElectricHorizonBackground from "@/components/ElectricHorizonBackground";
import { ArrowLeft, LayoutDashboard, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
    const [location, setLocation] = useLocation();
    const isWorkspacePath = /^\/(onboarding|dashboard|assistant|money|tax|ca-review|tasks|documents|billing|admin|invite)/.test(location);
    const destination = isWorkspacePath ? "/dashboard" : "/";
    const destinationLabel = isWorkspacePath ? "Return to Command Center" : "Return to Home";

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#030712] px-5 py-12 text-white overflow-hidden">
            <ElectricHorizonBackground variant="hero" />
            <main className="relative z-10 w-full max-w-2xl text-center">
                <div className="flex justify-center mb-6">
                    <PravaMark size="lg" />
                </div>
                <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-2xl backdrop-blur-xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

                    <div className="border-b border-white/[0.06] bg-white/[0.01] px-7 py-8 sm:px-10">
                        <div className="flex items-center justify-center gap-2">
                            <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                                ROUTE NOT FOUND // 404
                            </span>
                        </div>
                        <h1 className="mt-4 text-2xl sm:text-3xl font-medium tracking-tight text-white">
                            This page is not in <span className="text-slate-400">your workspace</span>.
                        </h1>
                    </div>

                    <div className="px-7 py-7 sm:px-10 sm:py-9 text-center">
                        <p className="mx-auto max-w-xl text-xs leading-relaxed text-slate-400">
                            The address may be outdated, incomplete, or no longer available. You can return to your command center or
                            reload to fetch latest routes.
                        </p>

                        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button
                                onClick={() => setLocation(destination)}
                                className="rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 shadow-md transition"
                            >
                                <LayoutDashboard className="mr-2 size-3.5" />
                                {destinationLabel}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.16] transition"
                            >
                                <RefreshCw className="mr-2 size-3.5 text-slate-400" />
                                Refresh Page
                            </Button>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft className="size-3.5" />
                            Go Back to Previous Screen
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
