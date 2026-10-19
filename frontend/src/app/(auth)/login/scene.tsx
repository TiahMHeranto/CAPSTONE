export function Scene() {
  return (
    <div className="relative h-full min-h-56 overflow-hidden bg-scene-mint text-scene-card lg:rounded-br-[40%] lg:rounded-tr-[18%]" aria-hidden="true">
      <svg className="absolute -left-6 top-4 h-16 w-16 opacity-40" viewBox="0 0 64 64">
        <path d="M28 8h8v16h16v8H36v16h-8V32H12v-8h16V8z" fill="currentColor" />
      </svg>
      <svg className="absolute right-6 bottom-6 h-10 w-10 opacity-30" viewBox="0 0 64 64">
        <path d="M28 8h8v16h16v8H36v16h-8V32H12v-8h16V8z" fill="currentColor" />
      </svg>
      <svg className="absolute inset-x-0 bottom-0 h-full w-full" viewBox="0 0 640 420" preserveAspectRatio="xMidYMax meet">
        <path d="M0 250 C120 180 180 120 280 150 C400 186 470 80 640 40 L640 420 L0 420 Z" fill="currentColor" opacity="0.12" />
        <g transform="translate(70 120)">
          <rect x="0" y="20" width="340" height="210" rx="12" fill="currentColor" opacity="0.25" />
          <rect x="16" y="36" width="308" height="168" rx="4" fill="white" />
          <rect x="150" y="230" width="40" height="16" fill="currentColor" opacity="0.35" />
          <rect x="110" y="246" width="120" height="8" rx="2" fill="currentColor" opacity="0.28" />
          <rect x="28" y="52" width="78" height="110" rx="4" fill="white" stroke="currentColor" />
          <circle cx="67" cy="78" r="12" fill="currentColor" />
          <rect x="48" y="96" width="38" height="6" rx="2" fill="currentColor" opacity="0.45" />
          <rect x="48" y="108" width="28" height="6" rx="2" fill="currentColor" opacity="0.3" />
          <rect x="120" y="52" width="90" height="48" rx="4" fill="white" stroke="currentColor" />
          <rect x="220" y="52" width="90" height="48" rx="4" fill="white" stroke="currentColor" />
          <rect x="120" y="114" width="190" height="10" rx="2" fill="currentColor" opacity="0.35" />
          <rect x="120" y="132" width="160" height="10" rx="2" fill="currentColor" opacity="0.25" />
          <rect x="120" y="150" width="140" height="10" rx="2" fill="currentColor" opacity="0.2" />
        </g>
        <g transform="translate(390 250)">
          <rect x="0" y="10" width="36" height="58" rx="8" fill="currentColor" />
          <rect x="8" y="0" width="20" height="16" rx="4" fill="currentColor" />
          <rect x="10" y="28" width="16" height="22" rx="2" fill="white" />
        </g>
        <g transform="translate(440 268)">
          <rect x="0" y="8" width="48" height="36" rx="6" fill="currentColor" />
          <path d="M16 0h16v14H16z" fill="currentColor" />
          <rect x="18" y="20" width="12" height="12" fill="white" />
        </g>
        <g transform="translate(250 300)">
          <rect x="0" y="8" width="70" height="22" rx="11" fill="currentColor" />
          <rect x="36" y="8" width="34" height="22" rx="11" fill="white" />
          <rect x="86" y="14" width="28" height="14" rx="7" fill="currentColor" opacity="0.7" />
        </g>
        <rect x="80" y="330" width="150" height="14" rx="7" fill="currentColor" opacity="0.25" />
        <rect x="80" y="330" width="90" height="14" rx="7" fill="currentColor" />
      </svg>
    </div>
  );
}
