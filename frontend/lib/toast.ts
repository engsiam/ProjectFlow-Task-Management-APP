export type ToastTone = "success" | "danger" | "warning";

export function toast(message: string, tone: ToastTone = "success") {
  if (typeof globalThis.dispatchEvent !== "function") return;
  globalThis.dispatchEvent(
    new CustomEvent("projectflow:toast", { detail: { message, tone } }),
  );
}
