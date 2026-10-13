"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  inverse?: boolean;
}

const sizeClass = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-36 w-36 sm:h-40 sm:w-40",
};

export function BrandMark({
  href,
  size = "md",
  className,
  onClick,
  inverse = false,
}: BrandMarkProps) {
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/brand/logo.jpg"
        alt="Electricity Meter Software"
        width={512}
        height={512}
        priority={size === "lg"}
        className={cn(
          "object-contain",
          sizeClass[size],
          inverse && "rounded-2xl bg-white p-1 shadow-sm"
        )}
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
