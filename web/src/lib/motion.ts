/** Motion tokens. The same numbers live in globals.css as custom properties. */
export const easeOut = "cubic-bezier(0.22, 1, 0.36, 1)";
export const easeInOut = "cubic-bezier(0.65, 0, 0.35, 1)";
export const easeIn = "cubic-bezier(0.4, 0, 1, 1)";

export const durPress = 100;
export const durHover = 150;
export const durMenu = 180;
export const durMenuExit = 145;
export const durPanel = 250;
export const durPanelExit = 200;
export const durDrawer = 300;
export const durDrawerExit = 240;
export const durPage = 120;
export const durMove = 220;
export const durConfirm = 320;
export const durReveal = 400;
export const stagger = 30;

/** True when the reader asked the system for less motion. Safe to call on the server (returns false). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
