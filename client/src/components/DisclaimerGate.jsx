import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "prava.disclaimer.ack.v1";

function readAcknowledgement() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * Requires a first-visit acknowledgement of Prava's scope before the product is
 * used. The acknowledgement is stored locally only; no financial data is kept
 * in browser storage.
 */
export default function DisclaimerGate({ children }) {
  const [acknowledged, setAcknowledged] = useState(readAcknowledgement);
  const acceptRef = useRef(null);

  useEffect(() => {
    if (!acknowledged) acceptRef.current?.focus();
  }, [acknowledged]);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Storage may be unavailable (private mode). Acceptance still applies to
      // this session so the user can continue deliberately.
    }
    setAcknowledged(true);
  };

  return (
    <>
      {children}
      {!acknowledged && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prava-disclaimer-title"
            aria-describedby="prava-disclaimer-body"
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Before you continue
            </p>
            <h2 id="prava-disclaimer-title" className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Prava is software, not a substitute for professional advice
            </h2>
            <div id="prava-disclaimer-body" className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                Prava prepares, organises and validates financial information. It is not a law firm, an
                accounting firm, or a tax authority, and it does not provide legal or tax advice.
              </p>
              <p>
                Every calculation, extraction and recommendation is an estimate until it has been reviewed
                by a qualified professional and, where required, authorised by you.
              </p>
              <p>
                Documents are processed with OCR and automated extraction, which can make mistakes. Verify
                figures against source evidence before relying on them.
              </p>
              <p>
                No return, filing or statutory submission is made on your behalf without your authorisation
                and a configured, authorised filing provider. Prava does not guarantee compliance outcomes.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">You will not be asked again on this device.</p>
              <button
                ref={acceptRef}
                type="button"
                onClick={accept}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:focus-visible:outline-white"
              >
                I understand and agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
