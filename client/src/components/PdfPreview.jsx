import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";

/**
 * Renders a PDF server-side-free, in the browser, with pdf.js.
 *
 * The application ships a strict Content-Security-Policy that includes
 * `object-src 'none'`. Chromium's built-in PDF viewer is a plugin governed by
 * `object-src`, so embedding the document in an <iframe> leaves the frame blank
 * (an apparently black viewer). Rendering each page to a canvas avoids the
 * plugin entirely and behaves the same in every browser.
 */
export default function PdfPreview({ url, fileName }) {
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;

    setPages([]);
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default || worker;

        const pdf = await pdfjs.getDocument({
          url,
          withCredentials: false,
          isEvalSupported: false,
        }).promise;

        const rendered = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const context = canvas.getContext("2d");
          if (!context) throw new Error("This browser cannot render canvases.");
          await page.render({ canvasContext: context, viewport }).promise;
          rendered.push({
            pageNumber,
            dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          });
        }

        if (cancelled) return;
        setPages(rendered);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[PdfPreview] Could not render PDF:", err);
        setError(err?.message || "The PDF could not be rendered.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="size-6 text-amber-400" />
        <p className="max-w-sm text-xs leading-5 text-slate-300">
          This PDF could not be displayed inline. {error}
        </p>
        <p className="max-w-sm text-[11px] leading-4 text-slate-500">
          The document was still extracted; open it in a new tab to review the original.
        </p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B0E14] px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-blue-500/40 hover:text-white"
          >
            <ExternalLink className="size-3" /> Open original
          </a>
          <a
            href={url}
            download={fileName}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B0E14] px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-blue-500/40 hover:text-white"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="size-5 animate-spin text-blue-400" />
        Rendering {fileName || "document"}…
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-black/60 p-3">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-3">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            className="overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-white/10"
          >
            <img
              src={page.dataUrl}
              alt={`${fileName || "Document"} page ${page.pageNumber}`}
              className="block w-full"
              loading="lazy"
            />
          </div>
        ))}
        <p className="pb-2 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
