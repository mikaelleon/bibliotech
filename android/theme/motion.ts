import { Easing } from "react-native";

/**
 * Same durations and curves as the web motion tokens (design/tokens.md).
 * Animations use React Native's Animated with the native driver, like Skeleton and the AI sheet.
 */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.4, 0, 1, 1);

export const durPress = 100;
export const durHover = 150;
export const durMenu = 180;
export const durMenuExit = 145;
export const durPanel = 250;
export const durPanelExit = 200;
export const durDrawer = 300;
export const durDrawerExit = 240;
export const durPage = 250;
export const durMove = 220;
export const durConfirm = 320;
export const durReveal = 400;
export const stagger = 30;
/** Lists stop staggering after this many items. */
export const staggerCap = 12;
/** Reduced motion keeps short fades only. */
export const durReduced = 100;
