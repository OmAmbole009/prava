import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Home, RotateCcw } from "lucide-react";
import { Component } from "react";
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error) {
        console.error("Prava client boundary recovered an error", error);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-[#030712] p-6 text-white selection:bg-cyan-500/30 selection:text-white">
                    <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/90 p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-10">
                        {/* Subtle ambient cyan glow */}
                        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-cyan-500/15 blur-3xl" />
                        
                        <div className="relative mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                            <AlertTriangle size={28} />
                        </div>

                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                            Safe Recovery // System Protected
                        </p>
                        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                            That screen did not load as expected.
                        </h2>
                        <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-slate-400">
                            Your workspace records and tax ledgers are safely preserved. Refresh this view, return to your command center, or reach out to your assigned CA.
                        </p>

                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-[#030712] transition hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                            >
                                <RotateCcw size={15} />
                                Refresh view
                            </button>
                            <button
                                onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/dashboard"))}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                            >
                                <ArrowLeft size={15} />
                                Go back
                            </button>
                            <a
                                href="/dashboard"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20 hover:text-white"
                            >
                                <Home size={15} />
                                Command Center
                            </a>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
export default ErrorBoundary;

