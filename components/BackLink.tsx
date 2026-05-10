"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Back navigation that respects browser history. If the user navigated
 * here from another in-app page, router.back() takes them exactly there.
 * If this is the first page (deep link, refresh, QR scan, new tab), we
 * fall back to the configured fallbackHref so the user always has an
 * exit. Renders the same visual as a Link.
 */
export function BackLink({
  fallbackHref,
  className,
  style,
  children,
}: {
  fallbackHref: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    // window.history.length > 1 generally means there's an entry to go
    // back to within the SPA; on a fresh tab it's 1.
    if (typeof window !== "undefined") {
      setHasHistory(window.history.length > 1);
    }
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Allow Cmd/Ctrl-click and middle-click to behave like a normal link
    // to fallbackHref so users can open it in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (hasHistory) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
