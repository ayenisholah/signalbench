import { cva } from "class-variance-authority";

/** KEPT A7 button variants. Every button is square, mono, uppercase. */
export const buttonVariants = cva(
  "tc-btn inline-flex items-center justify-center gap-2 rounded-none font-mono uppercase whitespace-nowrap select-none disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-gold",
  {
    variants: {
      variant: {
        primary: "bg-gold text-paper tc-btn-green hover:bg-gold-soft",
        outline: "border-2 border-ink text-ink tc-btn-outline hover:border-gold hover:text-gold",
        ghost: "border border-ink/30 text-ink/80 hover:border-ink hover:text-ink",
        ink: "bg-paper text-gold tc-btn-ink",
        "ink-outline": "border-2 border-paper text-paper tc-btn-ink",
        form: "w-full border-2 border-ink/20 bg-paper text-ink hover:border-gold",
        danger: "border-2 border-destructive/60 text-destructive hover:bg-destructive/10",
        link: "text-gold underline-offset-4 hover:underline hover:!shadow-none hover:![transform:none] active:!shadow-none active:![transform:none]",
        icon: "h-10 w-10 border border-ink/30 text-ink/80 hover:border-ink hover:text-ink p-0",
      },
      size: {
        sm: "text-[11px] tracking-[0.2em] px-4 py-2.5",
        md: "text-[12px] tracking-[0.2em] px-5 py-3",
        lg: "text-[14px] tracking-[0.2em] px-8 py-4",
        form: "h-12 text-[12px] tracking-[0.14em] gap-3 px-4",
        none: "",
      },
    },
    compoundVariants: [
      { variant: "outline", size: "lg", className: "px-7 py-3.5" },
      { variant: "ink-outline", size: "lg", className: "px-7 py-3.5" },
      { variant: "icon", className: "px-0 py-0" },
      { variant: "link", className: "px-0 py-0" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** Class string for links styled as buttons, usable in server components. */
export function btn(
  variant: NonNullable<Parameters<typeof buttonVariants>[0]>["variant"] = "primary",
  size: NonNullable<Parameters<typeof buttonVariants>[0]>["size"] = "md",
) {
  return buttonVariants({ variant, size: variant === "icon" ? "none" : size });
}
