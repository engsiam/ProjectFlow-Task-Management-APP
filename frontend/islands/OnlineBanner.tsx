import { useEffect, useState } from "preact/hooks";
import { Icon } from "../components/ui.tsx";

export default function OnlineBanner() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function goOnline() {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    }

    function goOffline() {
      setOnline(false);
      setShowReconnected(false);
    }

    globalThis.addEventListener("online", goOnline);
    globalThis.addEventListener("offline", goOffline);
    return () => {
      globalThis.removeEventListener("online", goOnline);
      globalThis.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!online) {
    return (
      <div class="online-banner offline">
        <Icon name="wifi_off" size={16} />
        <span>You're offline — some features may be unavailable</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div class="online-banner reconnected">
        <Icon name="wifi" size={16} />
        <span>Back online — all systems go</span>
        <button
          type="button"
          class="online-banner-dismiss"
          onClick={() => setShowReconnected(false)}
          aria-label="Dismiss"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  }

  return null;
}
