import { cn } from "@/lib/utils";

export function TeamCrest({
  shortName,
  color,
  size = "md",
  className,
}: {
  shortName: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[10px]",
    md: "size-10 text-xs",
    lg: "size-14 text-base",
  };
  return (
    <span
      className={cn(
        "label-caps inline-flex shrink-0 items-center justify-center rounded-sm border border-border/60 text-white",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color ?? "var(--primary)" }}
      aria-hidden
    >
      {shortName}
    </span>
  );
}
