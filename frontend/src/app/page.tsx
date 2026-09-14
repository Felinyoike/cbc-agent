"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sprout } from "lucide-react";
import { useTeachingContext } from "@/context/TeachingContext";

/**
 * Entry point: first-time teachers land on context setup, returning teachers
 * go straight to the dashboard.
 */
export default function RootPage() {
  const router = useRouter();
  const { isConfigured, isLoaded } = useTeachingContext();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isConfigured ? "/dashboard" : "/setup");
  }, [isLoaded, isConfigured, router]);

  return (
    <div className="flex h-dvh items-center justify-center bg-canvas-warm">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-strong">
          <Sprout className="size-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    </div>
  );
}
