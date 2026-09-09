import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
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
        content: `I ran into an issue retrieving your business information: ${err.message}. Please try again or rephrase your question.`,
        actions: [{ label: "Back to Dashboard", path: "/dashboard", variant: "outline" }],
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

    // Build history
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
    } catch {
      // ignore
    }

    if (pendingQuery && pendingQuery.trim()) {
      const queryText = pendingQuery.trim();
      if (businessId > 0 && !askMutation.isPending) {
        initialHandledRef.current = true;
        try {
          sessionStorage.removeItem("prava_pending_prompt");
          if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        } catch {}
        handleSend(queryText);
      }
    }
  }, [businessId, askMutation.isPending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-5xl flex-col">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-[#dfd6c4] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#163a34] text-[#d9e8be]">
                <Sparkles className="size-4" />
              </span>
              <h1 className="prava-display text-2xl text-[#153832]">Ask Prava</h1>
              <span className="rounded-full bg-[#e8f1e5] px-2.5 py-0.5 text-[11px] font-semibold text-[#275344]">
                Business Assistant
              </span>
            </div>
            <p className="mt-1 text-xs text-[#63746c]">
              Ask anything about {business?.name || "your business"}’s income, expenses, unpaid invoices, GST, and what needs attention.
            </p>
          </div>
          {business && (
            <div className="flex items-center gap-2 text-xs text-[#708078]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected to <strong>{business.name}</strong> data
            </div>
          )}
        </div>

        {/* Chat Stream Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
        >
          {messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#e5efe1] text-[#163a34] shadow-sm">
                <Bot className="size-7" />
              </div>
              <h2 className="prava-display mt-5 text-2xl text-[#153832]">
                What would you like to know today?
              </h2>
              <p className="mt-2 max-w-md text-sm text-[#677870]">
                I can check your real invoices, calculate your income & expenses, check what is due, or help prepare your GST.
              </p>

              {suggested.data && suggested.data.length > 0 && (
                <div className="mt-8 w-full max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d8477]">
                    Suggested questions
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {suggested.data.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q)}
                        disabled={askMutation.isPending}
                        className="flex items-start gap-2.5 rounded-xl border border-[#dfd6c4] bg-[#fffdf8] p-3.5 text-left text-xs font-medium text-[#24473e] transition hover:border-[#62856f] hover:bg-[#f6f3ea] hover:shadow-sm"
                      >
                        <Zap className="mt-0.5 size-3.5 shrink-0 text-[#b77a43]" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#163a34] text-[#d9e8be] shadow-sm mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm sm:max-w-[75%] ${
                    msg.role === "user"
                      ? "bg-[#163a34] text-[#f7f1e4]"
                      : "border border-[#dfd6c4] bg-[#fffdf8] text-[#1c3831]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-[#24453c] leading-relaxed">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Context Data Snapshot Pills */}
                  {msg.dataSnapshot && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ece4d6] pt-3">
                      {msg.dataSnapshot.revenue && (
                        <span className="rounded-lg bg-[#f0f5ee] px-2.5 py-1 text-[11px] font-semibold text-[#275344]">
                          Revenue: {msg.dataSnapshot.revenue}
                        </span>
                      )}
                      {msg.dataSnapshot.expenses && (
                        <span className="rounded-lg bg-[#fdf3ec] px-2.5 py-1 text-[11px] font-semibold text-[#8b4d24]">
                          Expenses: {msg.dataSnapshot.expenses}
                        </span>
                      )}
                      {msg.dataSnapshot.cash && (
                        <span className="rounded-lg bg-[#eaf4fc] px-2.5 py-1 text-[11px] font-semibold text-[#1f5682]">
                          Cash: {msg.dataSnapshot.cash}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sources reference */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#708078]">
                      <span className="font-medium">Sources:</span>
                      {msg.sources.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (s.documentId) setLocation(`/documents/${s.documentId}`);
                            else if (s.taskId) setLocation(`/tasks/${s.taskId}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-[#efeae0] px-2 py-0.5 text-[11px] font-medium text-[#2d5045] hover:underline"
                        >
                          <FileText className="size-3" />
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Contextual Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ece4d6] pt-3">
                      {msg.actions.map((act, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant={act.variant || "default"}
                          onClick={() => setLocation(act.path)}
                          className={`rounded-full text-xs font-semibold ${
                            act.variant === "outline"
                              ? "border-[#cbd6cb] text-[#24473e] hover:bg-[#ede9de]"
                              : "bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26]"
                          }`}
                        >
                          {act.label}
                          <ArrowRight className="ml-1.5 size-3.5" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#486b5e] text-[#f7f1e4] shadow-sm mt-0.5">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {askMutation.isPending && (
            <div className="flex items-start gap-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#163a34] text-[#d9e8be] shadow-sm">
                <Sparkles className="size-4 animate-spin" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] px-4 py-3 text-xs font-medium text-[#65766e]">
                <Loader2 className="size-3.5 animate-spin text-[#62856f]" />
                Checking business records & generating answer…
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-[#dfd6c4] pt-3 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 rounded-2xl border border-[#cfc4b1] bg-[#fffdf8] p-2 shadow-sm focus-within:border-[#62856f] focus-within:ring-2 focus-within:ring-[#62856f]/20"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g. 'How much did I earn this month?', 'Do I have any unpaid invoices?')"
              rows={1}
              className="min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-[#183a33] placeholder:text-[#88978f] focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || askMutation.isPending}
              className="size-10 shrink-0 rounded-xl bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26] disabled:opacity-40"
            >
              <Send className="size-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-[#7a8c83]">
            Prava uses live workspace data and deterministic logic. High-impact tax or filing actions require your explicit authorization.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
