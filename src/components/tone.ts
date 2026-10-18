export type Tone = "green" | "amber" | "blue" | "red" | "mut";

/** Tinted colours shared by every status badge and chip. */
export const toneStyles: Record<Tone, string> = {
  green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400",
  blue: "bg-blue-500/15 text-blue-700 border-blue-500/20 dark:text-blue-400",
  red: "bg-red-500/15 text-red-700 border-red-500/20 dark:text-red-400",
  mut: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20 dark:text-zinc-400",
};

/** Text colour alone, for values that carry a tone without a badge. */
export const toneText: Record<Tone, string> = {
  green: "text-emerald-700 dark:text-emerald-400",
  amber: "text-amber-700 dark:text-amber-400",
  blue: "text-blue-700 dark:text-blue-400",
  red: "text-red-700 dark:text-red-400",
  mut: "text-zinc-500 dark:text-zinc-400",
};
