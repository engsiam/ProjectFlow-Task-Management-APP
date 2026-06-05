import { useEffect } from "preact/hooks";
import { LOADER_EVENT_NAME, type LoaderState } from "../lib/loader.ts";
import { toast } from "../lib/toast.ts";

const isModifiedEvent = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.tagName === "A") return node as HTMLAnchorElement;
    node = node.parentElement;
  }
  return null;
}

export default function NavigationGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isLoading = false;
    let pinnedPath = location.pathname + location.search + location.hash;
    let beforeUnloadHandler:
      | ((e: BeforeUnloadEvent) => string | undefined)
      | null = null;
    let lastWarnAt = 0;
    const POP_FLAG = "__projectflow_loader_guard__";

    function attachBeforeUnload() {
      if (beforeUnloadHandler) return;
      beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue =
          "An operation is in progress. Are you sure you want to leave?";
        return e.returnValue;
      };
      addEventListener("beforeunload", beforeUnloadHandler);
    }

    function detachBeforeUnload() {
      if (!beforeUnloadHandler) return;
      removeEventListener("beforeunload", beforeUnloadHandler);
      beforeUnloadHandler = null;
    }

    function pinHistory() {
      try {
        const current = location.pathname + location.search + location.hash;
        if (current !== pinnedPath) pinnedPath = current;
        history.pushState(
          { [POP_FLAG]: true, pinned: pinnedPath },
          "",
          pinnedPath,
        );
      } catch {
        // ignore
      }
    }

    function onLoader(event: Event) {
      const detail = (event as CustomEvent<LoaderState>).detail;
      const wasLoading = isLoading;
      isLoading = detail.visible;

      if (isLoading && !wasLoading) {
        pinnedPath = location.pathname + location.search + location.hash;
        pinHistory();
        attachBeforeUnload();
      } else if (!isLoading && wasLoading) {
        detachBeforeUnload();
        try {
          const current = location.pathname + location.search + location.hash;
          if (current === pinnedPath) {
            history.replaceState(
              { [POP_FLAG]: false },
              "",
              current,
            );
          } else {
            history.replaceState(
              { [POP_FLAG]: false },
              "",
              pinnedPath,
            );
          }
        } catch {
          // ignore
        }
      }
    }

    function onClick(event: MouseEvent) {
      if (!isLoading) return;
      if (isModifiedEvent(event)) return;
      if (event.button !== 0) return;
      if (event.defaultPrevented) return;

      const anchor = findAnchor(event.target);
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("javascript:")) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.loaderBypass === "true") return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      const now = Date.now();
      if (now - lastWarnAt > 1200) {
        lastWarnAt = now;
        toast(
          "Please wait until the current operation finishes before navigating.",
          "warning",
        );
      }
    }

    function onPopState() {
      if (!isLoading) return;
      pinHistory();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!isLoading) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (isEditable) return;

      const key = event.key;
      if (
        (event.altKey && key === "ArrowLeft") ||
        key === "BrowserBack" ||
        (event.metaKey && (key === "[" || key === "Backspace"))
      ) {
        event.preventDefault();
      }
    }

    addEventListener(LOADER_EVENT_NAME, onLoader);
    addEventListener("click", onClick, true);
    addEventListener("popstate", onPopState);
    addEventListener("keydown", onKeyDown);

    return () => {
      removeEventListener(LOADER_EVENT_NAME, onLoader);
      removeEventListener("click", onClick, true);
      removeEventListener("popstate", onPopState);
      removeEventListener("keydown", onKeyDown);
      detachBeforeUnload();
    };
  }, []);

  return null;
}
