"use client";

import { useEffect } from "react";
import ErrorModal from "@/components/ErrorModal";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorModal onRetry={reset} />;
}
