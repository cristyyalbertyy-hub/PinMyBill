export function DashboardIllustration() {
  return (
    <div
      className="pin-dash-float pin-dash-illu relative mx-auto w-full max-w-[min(100%,20rem)] select-none"
      aria-hidden
    >
      <svg
        viewBox="0 0 320 280"
        className="h-auto w-full drop-shadow-lg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pin-dash-paper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(255 255 255)" stopOpacity="0.98" />
            <stop offset="100%" stopColor="rgb(240 253 250)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="pin-dash-pin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <filter id="pin-dash-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="opacity-90">
          <rect
            x="52"
            y="48"
            width="198"
            height="248"
            rx="20"
            fill="url(#pin-dash-paper)"
            stroke="rgb(13 148 136 / 0.25)"
            strokeWidth="1.5"
            transform="rotate(-10 151 172)"
          />
          <rect
            x="72"
            y="88"
            width="140"
            height="10"
            rx="4"
            fill="rgb(13 148 136 / 0.15)"
            transform="rotate(-10 142 93)"
          />
          <rect
            x="72"
            y="112"
            width="100"
            height="8"
            rx="3"
            fill="rgb(234 88 12 / 0.12)"
            transform="rotate(-10 122 116)"
          />
          <rect
            x="72"
            y="132"
            width="120"
            height="8"
            rx="3"
            fill="rgb(13 148 136 / 0.1)"
            transform="rotate(-10 132 136)"
          />
        </g>

        <g className="pin-dash-receipt-front">
          <rect
            x="64"
            y="36"
            width="210"
            height="260"
            rx="22"
            fill="url(#pin-dash-paper)"
            stroke="rgb(13 148 136 / 0.35)"
            strokeWidth="1.5"
            filter="url(#pin-dash-soft)"
          />
          <rect x="92" y="76" width="154" height="12" rx="5" fill="rgb(13 148 136 / 0.2)" />
          <rect x="92" y="102" width="120" height="9" rx="4" fill="rgb(120 113 108 / 0.18)" />
          <rect x="92" y="122" width="140" height="9" rx="4" fill="rgb(120 113 108 / 0.12)" />
          <rect x="92" y="142" width="90" height="9" rx="4" fill="rgb(120 113 108 / 0.12)" />
          <rect x="92" y="178" width="100" height="36" rx="10" fill="rgb(13 148 136 / 0.12)" />
          <text
            x="142"
            y="202"
            textAnchor="middle"
            style={{
              fill: "var(--pin-accent)",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "var(--font-jakarta), system-ui, sans-serif",
            }}
          >
            OK
          </text>
        </g>

        <circle cx="238" cy="52" r="28" fill="url(#pin-dash-pin)" className="pin-dash-pin-glow" />
        <circle cx="238" cy="52" r="10" fill="rgb(255 255 255 / 0.35)" />

        <circle cx="48" cy="220" r="4" fill="rgb(13 148 136 / 0.45)" className="pin-dash-sparkle" />
        <circle cx="278" cy="198" r="3" fill="rgb(234 88 12 / 0.5)" className="pin-dash-sparkle-delay" />
        <circle cx="270" cy="72" r="2.5" fill="rgb(13 148 136 / 0.4)" className="pin-dash-sparkle-delay-2" />
      </svg>
    </div>
  );
}
