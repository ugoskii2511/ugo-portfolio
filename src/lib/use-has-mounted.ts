import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/// True once the component has hydrated on the client. Avoids the
/// `setState`-in-`useEffect` pattern for the common SSR/client mismatch guard
/// (e.g. reading `next-themes`' resolved theme, which is only known client-side).
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
