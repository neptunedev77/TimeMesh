import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" rx="2.5" className="fill-mesh-2" />
        <rect x="13" y="2" width="9" height="9" rx="2.5" className="fill-mesh-1" />
        <rect x="2" y="13" width="9" height="9" rx="2.5" className="fill-mesh-3" />
        <rect x="13" y="13" width="9" height="9" rx="2.5" className="fill-mesh-4" />
      </svg>
      TimeMesh
    </span>
  );
}
