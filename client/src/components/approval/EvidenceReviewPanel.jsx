import { AlertCircle, CheckCircle2, FileText, ShieldQuestion } from "lucide-react";
import { formatMinorAmount } from "@shared/locale";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[11px] font-medium text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function money(minor, currency, locale) {
  if (minor === null || minor === undefined) return "—";
  try {
    return formatMinorAmount(minor, currency, locale);
  } catch {
    return String(minor);
  }
}

/**
 * The underlying evidence behind a preparation. Reviewers must be able to see
 * this, not just an AI summary or aggregate total.
 */
export default function EvidenceReviewPanel({ documents = [], preparation = null, requirements = [], currency = "INR", locale = "en-IN", onOpenDocument }) {
  const outstanding = requirements.filter(item => item.status !== "complete" && item.status !== "skipped");

  return (
    <div className="space-y-4">
      {outstanding.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {outstanding.length} evidence item{outstanding.length === 1 ? "" : "s"} still outstanding
          </p>
          <ul className="mt-1.5 list-inside list-disc text-[11px] text-amber-900/80 dark:text-amber-200/90">
            {outstanding.map(item => (
              <li key={item.requirementKey ?? item.id}>{item.label}</li>
            ))}
          </ul>
        </div>
      )}

      {preparation && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-white/[0.06] dark:bg-[#080B0F]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Prepared working · {preparation.status?.replaceAll("_", " ") ?? "draft"}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Taxable value">{money(preparation.taxableValueMinor, currency, locale)}</Field>
            <Field label="CGST">{money(preparation.cgstMinor, currency, locale)}</Field>
            <Field label="SGST">{money(preparation.sgstMinor, currency, locale)}</Field>
            <Field label="IGST">{money(preparation.igstMinor, currency, locale)}</Field>
            <Field label="Eligible ITC">{money(preparation.inputTaxCreditMinor, currency, locale)}</Field>
            <Field label="Net position">{money(preparation.netTaxPositionMinor, currency, locale)}</Field>
            <Field label="Needs review">{preparation.documentsRequiringReview ?? 0} document(s)</Field>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Source documents ({documents.length})
        </p>
        {documents.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-[11px] text-slate-600 dark:border-white/10 dark:text-slate-400">
            No source documents are attached to this task. A professional cannot approve a preparation without evidence.
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {documents.map(doc => {
              const extraction = doc.extraction;
              const needsReview = doc.status === "needs_review" || extraction?.status === "needs_review";
              return (
                <li key={doc.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/[0.06] dark:bg-[#0A0F16]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 size-4 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{doc.originalName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {String(doc.documentType).replaceAll("_", " ")} · {String(doc.status).replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        needsReview
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {needsReview ? <ShieldQuestion className="size-3" aria-hidden="true" /> : <CheckCircle2 className="size-3" aria-hidden="true" />}
                      {needsReview ? "Needs review" : "Reviewed"}
                    </span>
                  </div>

                  {extraction ? (
                    <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 sm:grid-cols-4 dark:border-white/[0.06]">
                      <Field label="Vendor">{extraction.vendorName || "—"}</Field>
                      <Field label="GSTIN">{extraction.gstin || "—"}</Field>
                      <Field label="Invoice">{extraction.invoiceNumber || "—"}</Field>
                      <Field label="Total">{money(extraction.totalMinor, currency, locale)}</Field>
                      <Field label="Confidence">
                        {extraction.confidenceBps !== null && extraction.confidenceBps !== undefined
                          ? `${(extraction.confidenceBps / 100).toFixed(0)}%`
                          : "—"}
                      </Field>
                    </dl>
                  ) : (
                    <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                      Stored as source evidence. No structured extraction is recorded for this file.
                    </p>
                  )}

                  {onOpenDocument && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc.id)}
                      className="mt-2 text-[11px] font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                    >
                      Open document record
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
