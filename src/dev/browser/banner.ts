import { resetBrowserState } from "./store";

/**
 * Dev-only chrome injected by vite.config.ts through transformIndexHtml while
 * serving `--mode browser`. Never bundled into a production build.
 */
const BANNER_ID = "jobdex-browser-dev-banner";
const BANNER_HEIGHT = "2.25rem";

const STYLE = `
:root { --jobdex-browser-banner-h: ${BANNER_HEIGHT}; }
body { padding-top: var(--jobdex-browser-banner-h); }
#root { height: calc(100vh - var(--jobdex-browser-banner-h)); }
.h-screen { height: calc(100vh - var(--jobdex-browser-banner-h)) !important; }
.min-h-screen { min-height: calc(100vh - var(--jobdex-browser-banner-h)) !important; }
[role="dialog"], [role="alertdialog"] {
  top: calc(50% + var(--jobdex-browser-banner-h) / 2) !important;
  max-height: calc(100vh - var(--jobdex-browser-banner-h) - 1rem) !important;
  overflow-y: auto;
}
#${BANNER_ID} {
  position: fixed;
  inset: 0 0 auto 0;
  height: var(--jobdex-browser-banner-h);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  overflow: hidden;
  background: #1c1917;
  color: #fafaf9;
  font: 500 12px/1.2 ui-sans-serif, system-ui, -apple-system, sans-serif;
}
#${BANNER_ID} .jd-banner-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1 1 auto;
}
#${BANNER_ID} button {
  flex: 0 0 auto;
  all: unset;
  cursor: pointer;
  border: 1px solid rgba(250, 250, 249, 0.35);
  border-radius: 4px;
  padding: 2px 8px;
  font: inherit;
  color: inherit;
}
#${BANNER_ID} button:hover { background: rgba(250, 250, 249, 0.12); }
#${BANNER_ID} button:focus-visible { outline: 2px solid #fafaf9; outline-offset: 1px; }
`;

function button(label: string, onClick: () => void): HTMLButtonElement {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.addEventListener("click", onClick);
    return el;
}

function mount(): void {
    if (!import.meta.env.DEV || import.meta.env.MODE !== "browser") return;
    if (document.getElementById(BANNER_ID)) return;

    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Browser development mode");

    const label = document.createElement("span");
    label.className = "jd-banner-label";
    label.textContent = "Browser development — synthetic local data · AI and sending disabled";

    banner.append(
        label,
        button("Onboarding", () => {
            resetBrowserState(true);
            window.location.reload();
        }),
        button("Reset fixtures", () => {
            resetBrowserState();
            window.location.reload();
        }),
    );

    document.body.appendChild(banner);
}

mount();
