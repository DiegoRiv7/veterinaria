"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ComponentType, SVGProps } from "react";

export type TabItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

export function TabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  const cols = items.length === 3 ? "grid-cols-3" : items.length === 4 ? "grid-cols-4" : "grid-cols-5";
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[480px] px-3 pb-3">
        <div className={cn(
          "grid", cols,
          "gap-1 p-1.5 rounded-[22px] border border-white/60 bg-white/75 backdrop-blur-2xl shadow-[var(--shadow-soft-lg)]"
        )}>
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium rounded-[16px] transition-all",
                  active
                    ? "bg-gradient-to-br from-[#dbeafe] via-[#e0e7ff] to-[#ede9fe] text-[#4f46e5]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 h-[16px] min-w-[16px] rounded-full bg-[#ef4444] text-white text-[10px] leading-none font-semibold px-1 flex items-center justify-center shadow-[0_2px_6px_rgba(239,68,68,0.5)]">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
