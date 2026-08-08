"use client";

/**
 * Hero banana with FunkyStats on the outer top crest.
 * Banana art: banana-svgrepo-com.svg (SVG Repo).
 * Glow uses a blurred duplicate with opacity ramp.
 */

function BananaGraphic({
  className,
  glow,
}: {
  className?: string;
  glow?: boolean;
}) {
  const fill = glow
    ? {
        bodyLight: "var(--yellow-color)",
        body: "var(--yellow-color)",
        stem: "var(--yellow-color)",
        tip: "var(--yellow-color)",
      }
    : {
        bodyLight: "#FFE082",
        body: "#FFCA28",
        stem: "#C0CA33",
        tip: "#5D4037",
        stemTip: "#827717",
      };

  return (
    <svg
      className={className}
      viewBox="-20 -60 1060 1080"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={glow || undefined}
      role={glow ? undefined : "img"}
      aria-label={glow ? undefined : "FunkyStats"}
    >
      {!glow && (
        <defs>
          <path
            id="funky-title-arc"
            d="M -20 745 C 350 745, 680 415, 940 -280"
            fill="none"
          />
        </defs>
      )}

      <path
        d="M746.666667 234.666667c21.333333 0 149.333333-21.333333 149.333333 170.666666S618.666667 938.666667 234.666667 938.666667c-42.666667 0-85.333333-21.333333-85.333334-21.333334l-21.333333-64s21.333333-85.333333 149.333333-149.333333 218.944-117.632 273.344-172.010667C593.344 489.344 661.333333 405.333333 661.333333 341.333333c0-41.770667 42.666667-85.333333 42.666667-85.333333"
        fill={fill.bodyLight}
      />
      <path
        d="M170.666667 874.666667s149.333333-42.666667 277.333333-106.666667 405.333333-256 320-533.333333c0 0 128-21.333333 128 170.666666S618.666667 938.666667 234.666667 938.666667c-42.666667 0-85.333333-21.333333-85.333334-21.333334l21.333334-42.666666z"
        fill={fill.body}
      />
      <path
        d="M876.010667 297.344C836.010667 211.562667 746.666667 256 746.666667 85.333333c-64 0-106.666667 42.666667-106.666667 42.666667s64 64 64 128c42.666667 0 77.056-3.349333 80.874667 101.333333 28.842667-122.218667 91.136-59.989333 91.136-59.989333z"
        fill={fill.stem}
      />
      <path
        d="M661.333333 341.333333s-1.344-38.677333 42.666667-85.333333 85.994667-8.661333 85.994667-8.661333l-5.12 109.994666s-18.666667-69.333333-48-71.104C675.008 282.496 661.333333 341.333333 661.333333 341.333333z"
        fill={fill.stem}
      />
      <path
        d="M128 874.666667l21.333333 42.666666h21.333334v-42.666666l-42.666667-21.333334z"
        fill={glow ? fill.tip : "#5D4037"}
      />
      <path
        d="M746.666667 85.333333c-64 0-106.666667 42.666667-106.666667 42.666667h64l42.666667-42.666667z"
        fill={glow ? fill.stem : "#827717"}
      />

      {!glow && (
        <text
          className="hero-banana-title-text"
          fontSize="142"
          fontWeight="800"
          letterSpacing="2"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          <textPath href="#funky-title-arc" startOffset="3%">
            FunkyStats
          </textPath>
        </text>
      )}
    </svg>
  );
}

export default function HeroBanana() {
  return (
    <>
      <style>{`
        .hero-banana {
          display: block;
          position: relative;
          width: min(100%, clamp(300px, 40vw, 580px));
          margin-inline: auto;
          line-height: 0;
          cursor: default;
          z-index: 1;
        }
        .hero-banana-glow {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          filter: blur(10px) brightness(1.02);
          transform: scale(0.88);
          transform-origin: center;
          transition: opacity 0.65s ease-in-out;
          pointer-events: none;
          z-index: 0;
          line-height: 0;
        }
        .hero-banana:hover .hero-banana-glow {
          opacity: 0.22;
        }
        .hero-banana-main {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .hero-banana-glow-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .hero-banana-title-text {
          fill: var(--yellow-color);
          paint-order: stroke fill;
          stroke: color-mix(in srgb, var(--background) 70%, transparent);
          stroke-width: 14px;
          stroke-linejoin: round;
        }
      `}</style>
      <div className="hero-banana">
        <div className="hero-banana-glow" aria-hidden>
          <BananaGraphic className="hero-banana-glow-svg" glow />
        </div>
        <BananaGraphic className="hero-banana-main" />
      </div>
    </>
  );
}
