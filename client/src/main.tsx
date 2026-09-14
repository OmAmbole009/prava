import { createRoot } from "react-dom/client";
import App from "./App";
import CursorTube from "./components/CursorTube";
import "./index.css";

function WorkspaceBoot() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-muted-foreground">
      <CursorTube />
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
          <span className="size-3.5 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="mt-4 font-serif text-lg font-normal text-foreground">Opening Prava Workspace</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Connecting financial telemetry, verified ledgers, and CA compliance tools.
        </p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function WorkspaceLoadError() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-muted-foreground">
      <CursorTube />
      <div className="max-w-md rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">Workspace Telemetry</p>
        <h1 className="mt-3 font-serif text-2xl font-normal text-foreground">We could not open this workspace view.</h1>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          A fresh reload usually restores the latest workspace connection without losing your session.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-md transition hover:opacity-90 active:scale-[0.97]"
        >
          Reload Workspace
        </button>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
const rawPath = window.location.pathname;
const canonicalPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;

if (canonicalPath !== rawPath) {
  window.history.replaceState(window.history.state, "", `${canonicalPath}${window.location.search}${window.location.hash}`);
}

const workspacePath = /^\/(onboarding|dashboard|assistant(?:\/|$)|money(?:\/|$)|tax(?:\/|$)|ca-review(?:\/|$)|ca(?:\/|$)|tasks(?:\/|$)|documents(?:\/|$)|billing|admin(?:\/|$)|invite(?:\/|$))/.test(canonicalPath);

if (workspacePath) {
  root.render(<WorkspaceBoot />);
  void import("./workspace")
    .then(({ mountWorkspace }) => mountWorkspace(root))
    .catch(() => root.render(<WorkspaceLoadError />));
} else {
  root.render(<App />);
}
