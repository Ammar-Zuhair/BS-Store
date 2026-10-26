import { ArrowUpRight } from "lucide-react";
export function DirectionArrow({ className = "" }: { className?: string }) {
  return (
    <ArrowUpRight
      className={`direction-arrow ${className}`}
      size={19}
      aria-hidden="true"
    />
  );
}
