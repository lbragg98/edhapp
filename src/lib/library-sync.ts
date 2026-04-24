const LIBRARY_INVALIDATION_EVENT = "library:invalidate";
const LIBRARY_INVALIDATION_KEY = "command_tower_library_invalidation";

export function broadcastLibraryInvalidation(reason: string) {
  if (typeof window === "undefined") {
    return;
  }

  const timestamp = Date.now();
  window.dispatchEvent(
    new CustomEvent(LIBRARY_INVALIDATION_EVENT, {
      detail: { reason, timestamp },
    }),
  );
  window.localStorage.setItem(LIBRARY_INVALIDATION_KEY, JSON.stringify({ reason, timestamp }));
}

export function subscribeToLibraryInvalidation(handler: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const eventHandler = () => handler();
  const storageHandler = (event: StorageEvent) => {
    if (event.key === LIBRARY_INVALIDATION_KEY) {
      handler();
    }
  };

  window.addEventListener(LIBRARY_INVALIDATION_EVENT, eventHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(LIBRARY_INVALIDATION_EVENT, eventHandler);
    window.removeEventListener("storage", storageHandler);
  };
}

