import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    ArrowRight,
    Bot,
    Compass,
    FileSearch,
    FileText,
    Loader2,
    Send,
    Sparkles,
    User,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AskPrava() {
    const [, setLocation] = useLocation();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];
    const businessId = business?.id ?? 0;
    const suggested = useQuery({
        queryKey: ["assistant", "suggestedPrompts", businessId],
        queryFn: () => api.assistant.suggestedPrompts({ businessId }),
        enabled: businessId > 0,
    });
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const scrollRef = useRef(null);

    const askMutation = useMutation({
        mutationFn: (body) => api.assistant.ask(body),
        onSuccess: (data) => {
            const assistantMsg = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.answer,
                actions: data.actions,
                sources: data.sources,
                dataSnapshot: data.dataSnapshot,
                isOutOfScope: data.isOutOfScope,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // If the query was an explicit single redirect, give a fast notification
            const redirectAction = data.actions?.find((a) => a.isRedirect);
            if (redirectAction) {
                toast.info(`Task matched: Click to navigate to ${redirectAction.label}`, {
                    action: {
                        label: "Open Now",
                        onClick: () => setLocation(redirectAction.path),
                    },
                });
            }
        },
        onError: (err) => {
            toast.error(err.message || "Ask Prava could not generate an answer.");
            const errorMsg = {
                id: `assistant-err-${Date.now()}`,
                role: "assistant",
                content: `I encountered an issue querying your business ledger: ${err.message}. Please try rephrasing your question.`,
                actions: [{ label: "Return to Command Center", path: "/dashboard", variant: "outline" }],
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        },
    });

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, askMutation.isPending]);

    const initialHandledRef = useRef(false);

    const handleSend = (textToSend) => {
        const query = (textToSend || input).trim();
        if (!query || !businessId || askMutation.isPending) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: "user",
            content: query,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        const history = messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
        }));

        askMutation.mutate({
            businessId,
            message: query,
            history,
        });
    };

    useEffect(() => {
        if (initialHandledRef.current) return;
        let pendingQuery = null;
        try {
            const searchParams = new URLSearchParams(window.location.search);
            pendingQuery = searchParams.get("q") || searchParams.get("query");
            if (!pendingQuery) {
                pendingQuery = sessionStorage.getItem("prava_pending_prompt");
            }
        } catch {}

        if (pendingQuery && businessId > 0) {
            initialHandledRef.current = true;
            try {
                sessionStorage.removeItem("prava_pending_prompt");
            } catch {}
            handleSend(pendingQuery);
        }
    }, [businessId]);

    return (
        <DashboardLayout>
            <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-6xl flex-col gap-4 py-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Bot className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold text-white tracking-tight">Ask Prava AI Co-Pilot</h1>
                                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-mono font-medium text-cyan-400 border border-cyan-500/25">
                                    INVOICES & LEDGER GROUNDED
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Verified answers referencing parsed invoices, vendors, GST tax codes, and double-entry journals.
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMessages([])}
                        className="rounded-xl border-white/[0.08] bg-[#0B0F19] text-xs text-slate-300 hover:border-white/[0.18] hover:text-white hover:bg-[#0E1424] transition shadow-xs"
                    >
                        <RotateCcw className="size-3.5 mr-1 text-slate-400" />
                        Clear Session
                    </Button>
                </div>

                {/* Chat History Viewport */}
                <div
                    ref={scrollRef}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070A12] flex-1 overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-5"
                >
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
                    <div className="pointer-events-none absolute left-1/2 -top-12 h-24 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/[0.05] blur-xl" />

                    {messages.length === 0 ? (
                        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center p-6">
                            <div className="flex size-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <Sparkles className="size-7" />
                            </div>
                            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                What would you like to know about{" "}
                                <span className="text-cyan-400 font-semibold">{business?.name || "your business"}</span>?
                            </h2>
                            <p className="mt-1.5 text-xs text-slate-400 max-w-md">
                                Query verified supplier invoices, revenue breakdown, tax liability, or ask Prava to perform tasks and redirect to tools.
                            </p>

                            {/* Suggested Prompts Pill Grid */}
                            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
                                {(suggested.data?.length
                                    ? suggested.data
                                    : [
                                          "Show my recent invoice totals and vendors",
                                          "What is our estimated GST liability?",
                                          "Do we have any invoice from AWS or Google?",
                                          "Take me to documents & invoices",
                                          "Open Autonomous CA Review Desk",
                                      ]
                                ).map((promptText, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(promptText)}
                                        className="rounded-full border border-white/[0.08] bg-[#0B0F19] px-4 py-2 text-xs font-medium text-slate-300 shadow-sm transition hover:border-cyan-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                                    >
                                        {promptText} →
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMissingDataNotice =
                                msg.role === "assistant" &&
                                typeof msg.content === "string" &&
                                msg.content.includes("We do not have record of");

                            const redirectAction = msg.actions?.find((a) => a.isRedirect);

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)]">
                                            <Bot className="size-4" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4.5 ${
                                            msg.role === "user"
                                                ? "rounded-tr-none bg-sky-600 text-white border border-sky-400/30 shadow-[0_0_15px_rgba(2,132,199,0.3)]"
                                                : msg.isOutOfScope
                                                ? "rounded-tl-none border border-amber-500/30 bg-amber-950/20 text-slate-200"
                                                : isMissingDataNotice
                                                ? "rounded-tl-none border border-cyan-500/30 bg-[#0B0F19] text-slate-200 shadow-lg"
                                                : "rounded-tl-none border border-white/[0.08] bg-[#0B0F19] text-slate-200 shadow-md"
                                        }`}
                                    >
                                        {msg.isOutOfScope && (
                                            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Scope Guardrail Active
                                            </div>
                                        )}

                                        {isMissingDataNotice && (
                                            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                                <FileSearch className="size-3 text-cyan-400" />
                                                Verified Ledger Query — Record Not Found
                                            </div>
                                        )}

                                        {/* Distinct Futuristic Redirect Directive Banner if requested */}
                                        {redirectAction && (
                                            <div className="mb-3 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-[#0E1424] p-3 text-slate-200 shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-black">
                                                        <Compass className="size-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-mono uppercase tracking-wider font-semibold text-cyan-400">
                                                            DIRECTIVE: REDIRECTION READY
                                                        </p>
                                                        <p className="text-xs text-white font-medium">
                                                            {redirectAction.label}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setLocation(redirectAction.path)}
                                                    className="bg-cyan-400 text-black font-semibold hover:bg-cyan-300 shadow-[0_0_12px_#22d3ee] rounded-xl text-xs shrink-0"
                                                >
                                                    <span>Open Tool</span>
                                                    <ArrowRight className="size-3.5 ml-1" />
                                                </Button>
                                            </div>
                                        )}

                                        <div className="leading-relaxed prose-sm dark:prose-invert text-slate-200">
                                            <Streamdown>{msg.content}</Streamdown>
                                        </div>

                                        {/* Sources Grounding Bar */}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] text-slate-400">
                                                <span className="font-mono uppercase text-slate-300 font-semibold">
                                                    Verified Sources:{" "}
                                                </span>
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {msg.sources.map((s, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() =>
                                                                s.documentId
                                                                    ? setLocation(`/documents`)
                                                                    : s.taskId
                                                                    ? setLocation(`/tasks`)
                                                                    : null
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-cyan-400 hover:border-cyan-500/40 transition"
                                                        >
                                                            <FileText className="size-3" />
                                                            {s.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons if Present */}
                                        {msg.actions && msg.actions.length > 0 && !redirectAction && (
                                            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                                                {msg.actions.map((act, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setLocation(act.path)}
                                                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 shadow-sm transition flex items-center gap-1.5"
                                                    >
                                                        <span>{act.label}</span>
                                                        <ArrowRight className="size-3" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {msg.role === "user" && (
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[#0E1424] text-slate-300">
                                            <User className="size-4" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {askMutation.isPending && (
                        <div className="flex gap-3 text-xs justify-start">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                                <Bot className="size-4" />
                            </div>
                            <div className="rounded-2xl rounded-tl-none border border-white/[0.08] bg-[#0B0F19] p-4 text-xs text-slate-300 flex items-center gap-2.5 shadow-sm">
                                <Loader2 className="size-4 animate-spin text-cyan-400" />
                                <span>Cross-referencing verified invoices, line items, and journal accounts…</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="shrink-0">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#070A12] p-2 px-4 shadow-2xl focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Prava anything about invoices, tax liability, or say 'take me to invoices'…"
                            className="flex-1 bg-transparent px-2 text-xs text-white placeholder:text-slate-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || askMutation.isPending}
                            className="inline-flex items-center rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_15px_#22d3ee] hover:bg-cyan-300 disabled:opacity-40 transition"
                        >
                            <Send className="mr-1.5 size-3.5" />
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
