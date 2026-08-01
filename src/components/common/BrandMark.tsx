"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  inverse?: boolean;
}

const sizeMap = {
  sm: { iconWrap: "h-8 w-8 rounded-lg", icon: "h-4 w-4", title: "text-sm" },
  md: { iconWrap: "h-9 w-9 rounded-xl", icon: "h-5 w-5", title: "text-sm" },
  lg: {
    iconWrap: "h-12 w-12 rounded-2xl",
    icon: "h-6 w-6",
    title: "text-xl sm:text-2xl",
  },
};

export function BrandMark({
  href,
  size = "md",
  showTagline = true,
  className,
  onClick,
  inverse = false,
}: BrandMarkProps) {
  const s = sizeMap[size];
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center shadow-sm",
          inverse ? "bg-white/20 text-white" : "bg-primary text-white",
          s.iconWrap
        )}
        aria-hidden="true"
      >
        <Gauge className={s.icon} />
      </span>
      <span className="min-w-0 text-left">
        <span
          className={cn(
            "block font-bold tracking-tight",
            inverse ? "text-white" : "text-text",
            s.title
          )}
        >
          MeterVision
        </span>
        {showTagline && (
          <span
            className={cn(
              "block text-[11px]",
              inverse ? "text-white/70" : "text-muted"
            )}
          >
            Meter Reading Editor
          </span>
        )}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
