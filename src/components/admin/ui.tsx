import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-400">
        {label}
        {hint && <span className="text-neutral-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-md border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-yellow-400/60 ${props.className ?? ""}`}
    />
  );
}

type Variant = "primary" | "ghost" | "danger" | "toggle";
export function Button({
  variant = "ghost",
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; active?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles: Record<Variant, string> = {
    primary: "bg-yellow-400 text-neutral-950 hover:bg-yellow-300",
    ghost: "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
    danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
    toggle: active
      ? "border border-yellow-400/70 bg-yellow-400/15 text-yellow-200"
      : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10",
  };
  return <button type="button" {...props} className={`${base} ${styles[variant]} ${className ?? ""}`} />;
}
