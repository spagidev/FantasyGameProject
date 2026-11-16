import { useEffect, useState } from 'react';

/** Shows a quiet note once a service worker controls the page. */
export function OfflineBadge() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    const check = () => setReady(Boolean(sw.controller));
    check();
    sw.addEventListener('controllerchange', check);
    sw.ready.then(check, () => {});
    return () => sw.removeEventListener('controllerchange', check);
  }, []);
  return ready ? <span className="save-status offline-badge">Available offline</span> : null;
}
