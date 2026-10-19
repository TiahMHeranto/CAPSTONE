import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const bouton =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:opacity-50";

export function Button({
  variante = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "border border-border bg-surface text-foreground",
    ghost: "text-foreground",
    danger: "bg-danger text-white",
  }[variante];
  return <button className={`${bouton} ${styles} ${className}`} {...props} />;
}

export function Champ({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground ${className}`}
      {...props}
    />
  );
}

export function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-xl font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

export function Etiquette({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`mb-1 block text-sm text-muted ${className}`}>{children}</span>;
}
