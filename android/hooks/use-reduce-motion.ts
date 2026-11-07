import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * The system "reduce motion" setting, shared by every caller.
 * One AccessibilityInfo listener for the whole app, instead of one per animated control:
 * every button, chip, tab, and card asks for this, so a per-hook listener added dozens per screen.
 */
let reduce = false;
let started = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (value === reduce) return;
  reduce = value;
  listeners.forEach((listener) => listener());
}

function start() {
  if (started) return;
  started = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(set);
  AccessibilityInfo.addEventListener("reduceMotionChanged", set);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => reduce;

export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
