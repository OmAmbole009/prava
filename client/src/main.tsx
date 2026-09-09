import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function WorkspaceBoot() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f3e9] px-6 text-center text-[#627269]"><div className="w-full max-w-sm"><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#dce8d5] text-[#153832]"><span className="size-4 animate-pulse rounded-full bg-[#72986d]" /></div><p className="mt-4 text-sm font-semibold text-[#24443d]">Opening your workspace</p><p className="mt-1 text-xs leading-5 text-[#65766e]">Preparing the financial tools for this view.</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#e5ded0]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#72986d]" /></div></div></div>;
}

function WorkspaceLoadError() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f3e9] px-6 text-center text-[#627269]"><div className="max-w-md rounded-3xl border border-[#ded3bf] bg-[#fffdf8] p-8 shadow-[0_20px_48px_rgb(26_55_47_/_0.08)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Workspace loading</p><h1 className="prava-display mt-3 text-3xl text-[#153832]">We could not open this workspace view.</h1><p className="mt-3 text-sm leading-6 text-[#64736b]">A fresh reload usually restores the latest workspace code without losing your place.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-[#163a34] px-5 py-2.5 text-sm font-semibold text-[#f7f1e4] transition hover:bg-[#0e2c26] active:scale-[0.97]">Reload workspace</button></div></div>;
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
