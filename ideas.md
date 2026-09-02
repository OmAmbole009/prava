# Prava — Product and Design Direction

## Product framing

Prava is a finance operating system for Indian small businesses. The first delivery should make the customer journey tangible: discover the product, sign in securely, establish a business workspace, and reach a focused financial overview. The product does not present itself as a substitute for a chartered accountant or professional reviewer. Instead, it clearly positions automation, deterministic financial records, and professional review as separate layers.

## Visual identity

The visual language will be called **Measured Momentum**. It combines deep forest ink, warm paper, oxidized copper accents, and muted sage data highlights. The typography pairs a confident, geometric display face with a measured sans-serif for dense operational content. Surfaces will be mostly solid with restrained paper grain, compact hairline rules, and a small number of calibrated shadows. The resulting tone should feel like an established financial institution that has been rebuilt for modern business operators.

The temporary wordmark will be **Prava**, accompanied by a simple, custom CSS-built balance mark. The primary message remains: “Your AI finance team for everyday business.” Supporting copy emphasizes calm control and clear next steps rather than novelty claims.

## Experience architecture

The public site will use a long-form editorial product story. It begins with a concise, copy-led hero and a product visual that translates incoming documents into a verified financial position. Scroll progression turns the incoming document stack into ledger rows, then into a dashboard, giving the 3D requirement a useful narrative rather than a decorative object. The first implementation will favour fast CSS and SVG-like DOM composition with a reduced-motion and mobile fallback; a heavier 3D runtime can be introduced as an isolated, lazy-loaded enhancement after the foundational product is stable.

The authenticated product uses the supplied dashboard layout as the basis for a workspace-aware shell. The sidebar will be adapted to the real navigation: Overview, Transactions, Documents, Invoices, Customers, Vendors, GST, Reports, AI Assistant, Cash Flow, Tasks, and Settings. The initial Overview will use visible demo-mode labelling and clearly distinguish actual workspace information from sample metrics.

## Key interface moments

The marketing hero includes a concise “document to decision” operating model, with one central proof panel showing a structured invoice, extracted fields, accounting entries, and a business insight. The demonstration panel is interactive: visitors can switch between Documents, Cash Flow, Invoices, and Ask Prava without encountering inactive controls.

The onboarding flow asks only for business essentials in a short, progressive sequence. The initial data model centres on a Business, BusinessMember, and onboarding state, so future finance data can be scoped by workspace from the start. The authenticated overview will have deliberate empty states for new workspaces alongside a labelled example state for the sales demonstration.

## Trust and safety cues

Copy will state that GST assistance is informational and that filing or submission may need professional review. The AI assistant will explain verified results surfaced by product tools rather than invent financial answers. Marketing claims will avoid fabricated reviews, customer logos, ratings, or testimonials. Pricing is framed as provider-ready with no fake checkout or payment-success state.

## Delivery boundaries for this iteration

This first build establishes the design system, public marketing site, real OAuth sign-in, business workspace persistence, a guarded dashboard route, onboarding, and an overview shell. Document OCR, accounting calculations, GST reconciliation, payments, professional review, and a tool-backed AI agent remain deliberately modular follow-on features. Their routes and UX language will be prepared without claiming they are already operational.
