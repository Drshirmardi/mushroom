const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
} as const;

export function Avatar({
  letter,
  size = "md",
  color,
}: {
  letter: string;
  size?: keyof typeof SIZES;
  color?: string;
}) {
  return (
    <div className={`${SIZES[size]} rounded-full ${color ?? "bg-primary/10 text-primary"} flex items-center justify-center font-bold flex-shrink-0`}>
      {letter}
    </div>
  );
}
