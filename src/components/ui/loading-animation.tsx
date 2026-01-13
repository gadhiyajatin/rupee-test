
"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-background", className)}>
      <BookOpen className="w-16 h-16 text-primary animate-pulse-slow" />
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex justify-center items-center h-full w-full absolute inset-0">
      <div className="flex items-center justify-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse-fast"></div>
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse-fast [animation-delay:0.2s]"></div>
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse-fast [animation-delay:0.4s]"></div>
      </div>
    </div>
  );
}
