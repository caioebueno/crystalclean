/** Small brand marks shared by the landing and testimonials pages. */
const sv = { fill: "none", stroke: "#0E1F3D", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Bubble = ({ size = 28, w = 1.5, dash = true }: { size?: number; w?: number; dash?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...sv} strokeWidth={w} aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.3-4A8 8 0 1 1 20 12z" />
    {dash && <path d="M9 12h6" />}
  </svg>
);

export const Roofline = ({ width, height, stroke }: { width: number; height: number; stroke: number }) => (
  <svg viewBox="0 0 560 70" width={width} height={height} aria-hidden="true">
    <path d="M4 64H190L280 10L370 64H556" fill="none" stroke="#C9A25E" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
    <path d="M322 6q0 10 10 10q-10 0-10 10q0-10-10-10q10 0 10-10Z" fill="#C9A25E" />
  </svg>
);
