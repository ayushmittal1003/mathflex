"use client";
import { ErrorScreen } from "@/components/site/web/ErrorScreen";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} compact />;
}
