"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { UnsavedChanges, PendingExit } from "@/lib/unsaved";
type Navigation = EventTarget & { traverseTo: (key: string) => unknown };
export function useUnsaved(active: boolean) {
  const guard = useRef(new UnsavedChanges());
  const [pending, setPending] = useState<PendingExit | null>(null);
  const clear = useCallback(() => {
    guard.current.clear();
    setPending(null);
  }, []);
  useEffect(() => {
    guard.current.authorize(active);
  }, [active]);
  const request = useCallback((action: () => void, message?: string) => {
    guard.current.request(action, message);
    setPending(guard.current.pending);
  }, []);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (guard.current.isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigation = (window as Window & { navigation?: Navigation })
      .navigation;
    const navigate = (event: Event) => {
      const e = event as Event & {
        canIntercept?: boolean;
        destination?: { sameDocument?: boolean; key: string };
        navigationType?: string;
      };
      if (
        guard.current.isDirty() &&
        e.navigationType === "traverse" &&
        e.canIntercept &&
        e.destination?.sameDocument
      ) {
        e.preventDefault();
        const key = e.destination.key;
        request(() => {
          clear();
          navigation?.traverseTo(key);
        });
      }
    };
    window.addEventListener("beforeunload", unload);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [request, clear]);
  return {
    mark: () => guard.current.mark(),
    clear,
    request,
    isDirty: () => guard.current.isDirty(),
    pending: active ? pending : null,
    reject: () => {
      guard.current.reject();
      setPending(null);
    },
    accept: () => {
      guard.current.accept();
      setPending(null);
    },
  };
}
