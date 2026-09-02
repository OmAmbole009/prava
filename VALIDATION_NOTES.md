# Prava Performance and Workflow Validation Notes

## Implemented operational boundaries

The public product narrative now uses reduced-motion-safe reveal treatments and scroll-driven CSS custom properties without React state updates on every scroll event. The public and authenticated applications remain separated so the public route does not eagerly load the workspace data client.

Cash reconciliation is intentionally limited to secure bank-statement source-evidence intake. The workflow never extracts transactions, estimates balances, categorizes activity, matches records, or claims a completed reconciliation. It instead creates explicit human-review items and records the intake boundary in the audit trail.

GST preparation retains its prepared-versus-submitted boundary. A task can only be marked as awaiting an authorized submission flow after evidence and required review are complete; government submission remains unavailable without an authorized integration and verifiable official reference.

## User-experience findings

The homepage compiles and renders with a complete hero, product story, interactive product demonstration, security boundary, and final workspace call to action. Dashboard, task, task-detail, and document-review screens expose scoped loading, retry, empty, or pending-save feedback instead of silently presenting an empty state during an unresolved query.

The public experience was visually checked at desktop and 390-pixel mobile widths. A protected-route regression also verifies the mobile and desktop layout contracts for the Dashboard, workflow launcher, task detail, and document review screens. A sandbox browser did not have the user-owned workspace session required to exercise a live protected workflow; no customer data or fake financial records were created to bypass that boundary.

## Final build and test evidence

The final production build succeeds. It emits the public application entry at **65.23 kB (13.08 kB gzip)**, with the authenticated workspace loaded through a separate deferred entry at **46.46 kB (12.52 kB gzip)**; route-level workspace screens remain split into individual chunks. The final automated suite passes **31 tests across 9 files**, including the real-persistence document-to-GST harness, deterministic financial safeguards, protected-route accessibility contracts, and the cash-intake non-inference checks.

## Reliability pass findings

The revised public route renders cleanly at desktop, including the motion-led product narrative. The fallback route now presents a branded recovery surface with direct return, refresh, and back actions rather than a generic dead end. Static browser assets resolve explicitly, while intentionally missing image and API paths now return genuine `404` responses instead of an HTML document with a misleading `200` status. The public hero redirect is cacheable for repeat visits; workspace document paths remain private and non-cacheable.

Fresh visual checks at a 390-pixel mobile viewport confirm that the revised homepage remains readable and ordered, and that the recovery surface preserves its hierarchy, tap targets, and return actions without clipping or horizontal overflow.

## Administrator access validation

The verified `Om Ambole` account (`omambole2007@gmail.com`) is persisted with the `admin` role. A dedicated `/admin/login` screen has been checked at desktop and 390-pixel mobile widths: it retains labelled credential fields, a single primary action, and an explicit eight-hour audited-session boundary. The server-side administrator password is held as a secret rather than in source or browser code; successful local sign-in records an administrator audit event before issuing the standard signed session cookie.

## Enhanced administrator console

The administrator can now use **Access & audit** to prepare revocable, expiring workspace invitation links without creating a user in advance; a recipient must authenticate with the invited email before membership is written. The same console supports current-password-confirmed local-password rotation, and searchable/filterable audit history for access, invitation, password, plan, and subscription events. The additive credential and invitation migration was reviewed and applied. A real browser session completed the full lifecycle: administrator sign-in, console access, sign-out, and administrator sign-in again, with the successful access events visible in the audit history.

The enhanced Access & audit console was also checked at a 390-pixel mobile viewport. Its access-control panels, labels, actions, audit table, and pending-invitation state remain readable and vertically ordered without horizontal overflow.

## Production-readiness hardening

The protected administrator shell has been rechecked after the production-hardening pass. It exposes a keyboard-accessible skip link, safe persisted sidebar preference handling, active navigation semantics, and non-blocking sign-out feedback. The server now returns correlation identifiers and conservative security headers, keeps `/api/*` responses non-cacheable, provides `/api/health` and database-aware `/api/ready` signals, and returns a real `404` for missing assets. Unexpected client failures render a safe recovery surface rather than internal stack details.

The workspace onboarding journey was rechecked at desktop and a 390-pixel mobile viewport. Its two-step sequence, privacy boundary, required-field feedback, optional finance context, and no-source-data guidance remain readable and usable without horizontal overflow. Failed workspace creation now retains user input and offers a direct retry path rather than leaving the user at a dead end.

## Authorized GST review gate and deferred payment activation

GST preparations now have a separate persisted authorized-submission request lifecycle: `awaiting_review`, `approved`, `dispatching`, `submitted`, `failed`, or `cancelled`. A request can be created only from a fully prepared GST task with no outstanding professional-review boundary. It requires an independent workspace administrator; the requester cannot approve their own request. Approval moves the task to a provider-ready state but is explicitly not a government filing.

Only a server-only authorized-provider dispatch can move an approved request to `dispatching`, and only a dispatch with a verifiable reference can be recorded as `submitted`. A server-only failure recorder preserves the not-filed state, records a normalized provider failure code, and requires a fresh independent approval before another future attempt. The automated suite includes deterministic gate, independence, and failure-code safeguards.

Google Pay/UPI QR and Razorpay remain intentionally inactive. The billing surface explains that a QR will not be rendered until a merchant-controlled UPI ID, legal payee name, unique transaction reference, and server-verifiable status mechanism exist. No scan, redirect, or customer claim is treated as payment confirmation. The documented activation requirements cite Google Pay, NPCI, and Razorpay source guidance in `PAYMENT_VERIFICATION_NOTES.md`.

The final validation run passes **48 tests across 13 files**, strict TypeScript checking, and the production build. Fresh browser logs show only the known sandbox Vite development-websocket limitation; no new application-level client errors or HTTP 4xx/5xx failures appeared in the checked log window.

The updated Billing surface was visually verified at desktop and 390-pixel mobile widths while no workspace existed. It clearly presents the inactive Google Pay/UPI and Razorpay safeguards without rendering a payment QR or checkout action. The protected GST task route was also checked with the available empty workspace and presented the expected safe recovery state for an unavailable task. The independent-approval and provider-failure copy is additionally covered by protected-route regression checks; no fabricated business or financial data was created solely to force a live task screenshot.

For the final gate verification, a clearly labelled, zero-value, non-financial temporary workspace and prepared GST task were created for the existing administrator. The actual independent-approval request panel was verified at desktop and 390-pixel mobile widths: hierarchy, acknowledgement checkbox, reviewer-context field, disabled-until-acknowledged action, and not-filed language remained readable without overflow. The fixture contained no source documents, financial values, payment data, or filing data, and the workspace, task, preparation, and related records were removed immediately after capture; database cleanup confirmed no fixture workspace remained.

After the retired direct-submission control was disabled in favor of the independent-approval gate, the actual prepared task was rechecked at desktop width using a second labelled zero-value fixture. The independent-review panel remained the visible controlled path, and the disabled legacy control could not bypass it. The second fixture was immediately removed; the database verification returned zero remaining fixture businesses.

## GST administration enhancement

The reviewed additive `0008` migration was applied successfully. It adds the `rejected` authorized-submission state and `gstSubmissionNotifications`, with foreign keys and recipient/request indexes. The migration source was aligned with the database-safe shortened constraint identifiers used by MySQL/TiDB.

Global administrators can now open **GST submissions** at `/admin/gst` to search safe workflow metadata and filter by workspace, provider, reporting period, status, and text. The register does not return source-document URLs, financial source data, raw provider payloads, bank data, or credentials. The CSV export is generated only after the server records an administrator audit event containing safe filter metadata and row count. The print view is explicitly labelled as a workflow register rather than government-filing evidence, and the browser controls any Save as PDF action.

Independent rejection is server-validated and prevents requester self-rejection. A rejection returns the task and preparation to `prepared`, records the reviewer note and audit event, and requires a fresh request. Approval and rejection each create a recipient-scoped in-app notification plus an email row marked `suppressed`; no email sender exists and no email delivery is claimed. The dashboard now shows recent recipient-scoped GST decision notices.

The reusable `gst-submission-operations` skill was initialized, authored, and quick-validated. It codifies the state machine, independent-review rule, server-only dispatch and authoritative-reference rule, safe export/audit guidance, notification conditions, and credential-gated Razorpay/UPI boundaries.

Final automated validation passes **52 tests across 14 files**, including the real-persistence lifecycle test for rejection recovery and persisted notification rows, strict TypeScript checking, and production build. Fresh desktop and 390-pixel mobile screenshots confirm the protected GST administration screen is readable, has an accessible filter layout, clearly describes email suppression and filing boundaries, and has no horizontal viewport overflow. Fresh request logs show successful administrator access to the GST register; prior expired-session entries remain historic and are not a current application error.

## Expanded recommendation set

The administrator now has an **Integration readiness** console at `/admin/integrations`. It stores only non-secret metadata for the email sender, authorized GST provider, Razorpay account, and merchant UPI setup. The server validates display names and endpoint URLs, rejects embedded URL credentials, audits every metadata update, and never returns or stores API keys, webhook secrets, passwords, or payment credentials in this table.

The console reports both server-secret readiness and metadata completeness. It explicitly keeps email rows suppressed, GST provider dispatch inactive, Razorpay checkout inactive, and UPI QR rendering inactive until the corresponding verified requirements exist. The feature is therefore useful immediately for operational setup without creating false payment, email, or filing evidence. Global-admin authorization is covered by tRPC tests, and protected accessibility contracts cover secret-free wording and inactive boundaries.

Fresh desktop and 390-pixel mobile screenshots confirm the forms, status cards, labels, activation notes, and navigation remain readable and vertically ordered without horizontal overflow. No integration connector was enabled because the session has no verified Razorpay, GST-provider, or email credentials, and the owner previously deferred those activations.
