export type LoaderTone = "default" | "save" | "load";

export type LoaderState = {
  count: number;
  visible: boolean;
  message: string;
  tone: LoaderTone;
};

const LOADER_EVENT = "projectflow:loader";
const NAV_BYPASS_EVENT = "projectflow:nav-bypass";

let count = 0;
let message = "Loading...";
let tone: LoaderTone = "default";
const stack: { message: string; tone: LoaderTone }[] = [];
let navBypass = false;

function emit() {
  const top = stack[stack.length - 1];
  if (top) {
    message = top.message;
    tone = top.tone;
  }
  const detail: LoaderState = {
    count,
    visible: count > 0,
    message,
    tone,
  };
  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent<LoaderState>(LOADER_EVENT, { detail }),
    );
  }
}

export function startLoader(
  nextMessage = "Loading...",
  nextTone: LoaderTone = "default",
) {
  count += 1;
  stack.push({ message: nextMessage, tone: nextTone });
  emit();
  return count;
}

export function stopLoader() {
  if (count === 0) return count;
  count -= 1;
  stack.pop();
  emit();
  return count;
}

export function setLoaderMessage(nextMessage: string) {
  const top = stack[stack.length - 1];
  if (top) top.message = nextMessage;
  emit();
}

export function getLoaderState(): LoaderState {
  return {
    count,
    visible: count > 0,
    message,
    tone,
  };
}

export const LOADER_EVENT_NAME = LOADER_EVENT;
export const NAV_BYPASS_EVENT_NAME = NAV_BYPASS_EVENT;

export function isNavBypassed(): boolean {
  return navBypass;
}

export function setNavBypass(value: boolean) {
  if (navBypass === value) return;
  navBypass = value;
  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent<boolean>(NAV_BYPASS_EVENT, { detail: value }),
    );
  }
}

export async function withLoader<T>(
  task: Promise<T>,
  nextMessage = "Loading...",
  nextTone: LoaderTone = "default",
): Promise<T> {
  startLoader(nextMessage, nextTone);
  try {
    return await task;
  } finally {
    stopLoader();
  }
}
