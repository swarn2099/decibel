import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] bg-bg px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
        <Link href="/" className="text-lg font-bold">
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
            DECIBEL
          </span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-gray">
          <a
            href="https://instagram.com/decibel.live"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-pink"
          >
            Instagram
          </a>
          <span className="text-light-gray/40">·</span>
          <Link href="/privacy" className="transition-colors hover:text-[var(--text)]">
            Privacy
          </Link>
          <span className="text-light-gray/40">·</span>
          <Link href="/terms" className="transition-colors hover:text-[var(--text)]">
            Terms
          </Link>
        </div>
        <p className="text-xs text-light-gray">© 2026 Decibel</p>
      </div>
    </footer>
  );
}
