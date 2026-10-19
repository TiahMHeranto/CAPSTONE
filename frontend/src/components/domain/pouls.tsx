export function Pouls({ className = "h-8 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-hidden="true">
      <path
        d="M0 12 H12 L16 12 L20 4 L26 20 L30 12 H64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
