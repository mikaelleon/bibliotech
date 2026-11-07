import { Easing } from "react-native-reanimated";

/** Same durations and curves as the web motion tokens. */
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
export const stagger = 30;
