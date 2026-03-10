import Link from "next/link";
import { APP_STORE_URL } from "@/lib/config";

interface AppStoreBadgeProps {
  className?: string;
  label?: string;
}

export function AppStoreBadge({ className = "", label }: AppStoreBadgeProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Link
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-opacity hover:opacity-80"
      >
        {/* Apple App Store badge — standard black pill */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 40"
          className="h-[40px] w-[120px]"
        >
          <rect width="120" height="40" rx="6" fill="#000" />
          <rect
            x="0.5"
            y="0.5"
            width="119"
            height="39"
            rx="5.5"
            stroke="#A6A6A6"
            strokeWidth="1"
            fill="none"
          />
          {/* Apple logo */}
          <g transform="translate(8, 7) scale(0.55)">
            <path
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.81-1.31.05-2.31-1.32-3.15-2.56C4.22 16 2.97 11.85 4.77 9.14c.9-1.35 2.5-2.21 4.22-2.23 1.29-.02 2.51.87 3.29.87.79 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.35 4.65c.69-.83 1.15-1.99.98-3.15-1.01.04-2.22.67-2.94 1.52-.64.75-1.2 1.95-1.05 3.1 1.12.09 2.27-.57 3.01-1.47"
              fill="#fff"
            />
          </g>
          {/* Text */}
          <text
            x="30"
            y="14"
            fill="#fff"
            fontSize="6"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Download on the
          </text>
          <text
            x="30"
            y="28"
            fill="#fff"
            fontSize="12"
            fontWeight="600"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            App Store
          </text>
        </svg>
      </Link>
      {label && (
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      )}
    </div>
  );
}

interface AppStoreCTAProps {
  title: string;
  subtitle?: string;
  variant?: "pink" | "gold";
  className?: string;
}

export function AppStoreCTA({
  title,
  subtitle,
  variant = "pink",
  className = "",
}: AppStoreCTAProps) {
  const colors =
    variant === "gold"
      ? "border-yellow/20 bg-yellow/5"
      : "border-pink/20 bg-pink/5";
  const buttonColors =
    variant === "gold"
      ? "bg-yellow text-[#0B0B0F] hover:bg-yellow/90"
      : "bg-pink text-white hover:bg-pink/90";

  return (
    <div
      className={`rounded-2xl border ${colors} p-6 text-center sm:p-8 ${className}`}
    >
      <h3 className="mb-2 text-lg font-bold sm:text-xl">{title}</h3>
      {subtitle && (
        <p className="mx-auto mb-5 max-w-md text-sm text-[var(--text-muted)]">
          {subtitle}
        </p>
      )}
      <Link
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-full ${buttonColors} px-6 py-3 text-sm font-semibold transition-colors`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.81-1.31.05-2.31-1.32-3.15-2.56C4.22 16 2.97 11.85 4.77 9.14c.9-1.35 2.5-2.21 4.22-2.23 1.29-.02 2.51.87 3.29.87.79 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.35 4.65c.69-.83 1.15-1.99.98-3.15-1.01.04-2.22.67-2.94 1.52-.64.75-1.2 1.95-1.05 3.1 1.12.09 2.27-.57 3.01-1.47" />
        </svg>
        Download on the App Store
      </Link>
    </div>
  );
}
