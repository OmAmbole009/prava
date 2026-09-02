import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Keep diagnostic detail in developer tooling while never rendering a stack trace to an end user.
    console.error("Prava client boundary recovered an error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="prava-grid flex min-h-screen items-center justify-center bg-[#f7f3e9] p-6 text-[#153832]">
          <div className="w-full max-w-xl rounded-[2rem] border border-[#ded3bf] bg-[#fffdf8] p-8 text-center shadow-[0_28px_70px_rgb(29_58_49_/_0.11)] sm:p-10">
            <AlertTriangle
              size={48}
              className="mx-auto mb-6 text-[#b7523d]"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b77a43]">Safe recovery</p>
            <h2 className="prava-display mt-3 text-3xl">That screen did not load as expected.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#65766e]">Your workspace records have not been changed. Refresh this view, return to a familiar page, or try again in a moment.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
              onClick={() => window.location.reload()}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5",
                "bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]"
              )}
            >
              <RotateCcw size={16} />
              Refresh view
            </button>
              <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ceba] px-5 py-2.5 text-[#315b4c] hover:bg-[#f4efe3]"><ArrowLeft size={16} />Go back</button>
              <a href="/" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ceba] px-5 py-2.5 text-[#315b4c] hover:bg-[#f4efe3]"><Home size={16} />Home</a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
