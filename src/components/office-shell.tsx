"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useHallpass } from "@/components/hallpass-provider";
import { InferenceBadge } from "@/components/inference-badge";

const LINKS = [
  { href: "/", label: "Desk" },
  { href: "/policies", label: "Guardrails" },
  { href: "/bench", label: "Test bench" },
  { href: "/audit", label: "Ledger" },
  { href: "/sdk", label: "SDK" },
];

const DRILLS = [
  { href: "/redteam/checkout", label: "Checkout" },
  { href: "/redteam/email", label: "Mail" },
  { href: "/redteam/injection", label: "Injection" },
  { href: "/redteam/lookalike", label: "Lookalike" },
  { href: "/redteam/taxes", label: "Taxes" },
];

export function OfficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, activePolicy } = useHallpass();
  const source = mode === "hybrid" ? "on_device" : "rules";

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-[#f2c14e] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[#1b2836]"
      >
        Skip to content
      </a>
      <aside className="border-b border-white/10 bg-[#1b2836] text-[#f4efe4] lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex items-end justify-between gap-4 px-5 py-5 lg:block">
          <Link href="/" className="block">
            <p className="text-[11px] tracking-[0.28em] text-[#f2c14e] uppercase">Hall pass</p>
            <p className="font-display text-3xl leading-none">HallPass</p>
          </Link>
          <InferenceBadge
            source={source}
            className="lg:mt-4"
            label={mode === "hybrid" ? "Hybrid ready" : "Rules only"}
            hint={
              mode === "hybrid"
                ? "Firebase is configured. Compilation prefers Gemini Nano and falls back to cloud Gemini."
                : "No model call. The rules engine compiles and enforces."
            }
          />
        </div>
        <nav aria-label="Desk" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:px-3 lg:pb-6">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block shrink-0 rounded-full px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c14e] lg:rounded-lg",
                  active ? "bg-[#f2c14e] text-[#1b2836]" : "text-[#f4efe4]/80 hover:bg-white/10",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <p className="mt-4 hidden px-3 text-[11px] tracking-[0.18em] text-[#f4efe4]/50 uppercase lg:block">
            Red team
          </p>
          {DRILLS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "block shrink-0 rounded-full px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c14e] lg:rounded-lg",
                  pathname === link.href ? "bg-white/15 text-white" : "text-[#f4efe4]/70 hover:bg-white/10",
                )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="hidden px-6 pb-6 text-xs leading-5 text-[#f4efe4]/60 lg:block">
          Active policy
          <span className="mt-1 block text-sm text-[#f4efe4]">{activePolicy.name}</span>
        </p>
      </aside>
      <div id="main" tabIndex={-1} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
