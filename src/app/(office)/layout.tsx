import { Suspense } from "react";
import { OfficeShell } from "@/components/office-shell";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Opening the office…</div>}>
      <OfficeShell>{children}</OfficeShell>
    </Suspense>
  );
}
