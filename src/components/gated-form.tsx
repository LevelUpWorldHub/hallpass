"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GatedForm({
  actionLabel,
  children,
}: {
  actionLabel: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      data-testid="gated-form"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const bypass = form.getAttribute("data-hallpass-bypass") === "1";
        event.preventDefault();
        setStatus(
          bypass
            ? "The extension signed this pass. The drill stopped before anything left the page."
            : "The drill swallowed the submit. With the extension loaded, HallPass decides before this message.",
        );
      }}
    >
      {children}
      <Button type="submit" className="mt-4 rounded-full">
        {actionLabel}
      </Button>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
    </form>
  );
}
