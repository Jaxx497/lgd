// Heavy strokes and solid fills, no fine detail or grays: these have to survive e-ink.
export const SVG = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

// arrow into a tray
export const DOWNLOADS = <path d="M12 3v11M7 10l5 5 5-5M4 20h16" />;

// sliders
export const SETTINGS = (
  <>
    <path d="M4 7h16M4 17h16" />
    <circle cx="9" cy="7" r="2.5" fill="currentColor" />
    <circle cx="15" cy="17" r="2.5" fill="currentColor" />
  </>
);
