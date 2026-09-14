import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Terminal,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Array<{
    label: string;
    path: string;
    variant?: "default" | "outline" | "secondary";
  }>;
  sources?: Array<{
    title: string;
    type: string;
    documentId?: number;
    taskId?: number;
  }>;
  dataSnapshot?: {
    revenue?: string;
    expenses?: string;
    cash?: string;
    gstPosition?: string;
    receivables?: string;
    payables?: string;
  };
  timestamp: Date;
};

export default function AskPrava() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const suggested = trpc.assistant.suggestedPrompts.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const askMutation = trpc.assistant.ask.useMutation({
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        actions: data.actions,
        sources: data.sources,
        dataSnapshot: data.dataSnapshot,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: (err) => {
      toast.error(err.message || "Ask Prava could not generate an answer.");
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content: `I encountered an issue querying your business ledger: ${err.message}. Please try rephrasing your question.`,
        actions: [{ label: "Back to Command Center", path: "/dashboard", variant: "outline" }],
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

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || !businessId || askMutation.isPending) return;

    const userMsg: ChatMessage = {
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
    
    let pendingQuery: string | null = null;
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
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">Ask Prava AI Co-Pilot</h1>
                <span className="prava-tag text-[9px]">Active Ledger Grounded</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Instant answers referencing double-entry records, invoices, and statutory tax calculations.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages([])}
            className="rounded-lg border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.08]"
          >
            Clear Session
          </Button>
        </div>

        {/* Chat History Viewport */}
        <div
          ref={scrollRef}
          className="prava-panel flex-1 overflow-y-auto p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 space-y-5"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white shadow-sm">
                <Sparkles className="size-7" />
              </div>
              <h2 className="font-['Playfair_Display',Georgia,serif] mt-4 text-2xl sm:text-3xl font-normal tracking-tight text-slate-900 dark:text-white">
                What would you like to know about <em className="italic font-normal">{business?.name || "your business"}</em>?
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 max-w-md">
                Ask about revenue movements, overdue customer invoices, input tax credit eligibility, or upcoming CA filing reviews.
              </p>

              {/* Suggested Prompts Pill Grid */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
                {(suggested.data?.length
                  ? suggested.data
                  : [
                      "How much did we earn this month?",
                      "Are any supplier bills due this week?",
                      "What is our estimated GST liability?",
                      "Summarize my recent expenses by category",
                    ]
                ).map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(promptText)}
                    className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    {promptText} →
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "rounded-tr-none bg-slate-900 text-white dark:bg-white/[0.12] dark:border dark:border-white/20 dark:text-white shadow-sm"
                      : "rounded-tl-none border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-white/[0.08] dark:bg-[#0A0F16] dark:text-[#E2E8F0]"
                  }`}
                >
                  <div className="leading-relaxed prose-sm dark:prose-invert">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>

                  {/* Sources Grounding Bar */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 dark:border-white/[0.06] pt-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono uppercase text-slate-700 dark:text-slate-300 font-semibold">Verified Sources: </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {msg.sources.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              s.documentId
                                ? setLocation(`/documents/${s.documentId}`)
                                : s.taskId
                                ? setLocation(`/tasks/${s.taskId}`)
                                : null
                            }
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-sky-600 dark:bg-white/[0.06] dark:text-sky-400 hover:opacity-80"
                          >
                            <FileText className="size-3" />
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons if Present */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                      {msg.actions.map((act, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          onClick={() => setLocation(act.path)}
                          className="rounded-lg bg-slate-900 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
                        >
                          {act.label} →
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {askMutation.isPending && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-[#0A0F16] dark:text-slate-400 flex items-center gap-2 shadow-sm">
                <Loader2 className="size-4 animate-spin text-slate-700 dark:text-white" />
                <span>Consulting double-entry ledger & invoice extractions…</span>
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
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-300/40 dark:border-white/10 dark:bg-[#0A0F16] dark:focus-within:border-white/30"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Prava anything about your revenues, tax liabilities, or invoices…"
              className="flex-1 bg-transparent px-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none dark:text-white dark:placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={!input.trim() || askMutation.isPending}
              size="sm"
              className="rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Send className="mr-1.5 size-3.5" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
