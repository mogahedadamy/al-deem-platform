"use client";

import { useEffect, useRef } from "react";

export function OperationError({ message, onRetry, busy = false }: { message: string | null; onRetry: () => void; busy?: boolean }) {
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (message) retryRef.current?.focus();
  }, [message]);

  if (!message) return null;
  return (
    <div className="operation-error">
      <p role="alert">{message}</p>
      <button ref={retryRef} type="button" onClick={onRetry} disabled={busy} className="app-button app-button-outline mt-2 min-h-11">
        {busy ? "جارٍ إعادة المحاولة…" : "إعادة المحاولة"}
      </button>
    </div>
  );
}
