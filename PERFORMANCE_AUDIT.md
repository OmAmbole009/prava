# Prava Performance Audit

## Measured baseline

| Area | Finding | Optimization decision |
| --- | --- | --- |
| Initial JavaScript | The current production build emits one **687 KB** initial JavaScript chunk (**200 KB gzip**), despite route-level lazy loading. | Split React/data/runtime, icon, and deferred UI dependencies into stable vendor chunks so the browser can parse less application code at once and cache shared code independently. |
| Protected routes | Workspace pages are lazy-loaded, but their fallback is a plain full-screen text message. | Retain route splitting and introduce a lightweight branded loading shell that communicates progress without a perceived freeze. |
| Scroll scene | The public product scene currently updates React state on every scroll event while its section is visible. | Replace render-loop scrolling with request-animation-frame DOM updates that operate only while the scene is near the viewport. |
| Hero media | The hero JPEG is approximately **937 KB**. | Preserve it as the visual LCP asset, decode asynchronously, give it high priority, and avoid loading additional decorative media on the public entry route. |
| Imported modules | The client does not import `framer-motion`, `recharts`, `streamdown`, `axios`, `embla-carousel-react`, `react-resizable-panels`, `react-day-picker`, `cmdk`, or `vaul` in its current source. | Avoid introducing these packages into initial route code; retain package removal as a separate dependency-governance change because the full-stack template may use them in future modules. |
| Rendering work | Below-fold sections are immediately laid out and animated. | Defer offscreen rendering with `content-visibility` and use intersection-based, transform-and-opacity-only reveal effects. |

## Guardrails

The optimization preserves keyboard access, reduced-motion behavior, and the hero image’s load priority. It does not fabricate workflow data, activate payment providers, or defer a core user action behind decoration.
