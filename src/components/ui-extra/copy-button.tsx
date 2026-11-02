"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/i18n";

const { copy, copied: copiedLabel } = messages.projects.invite;

/** Shows a link in a read-only field, so it can still be selected by hand if copying fails. */
export function CopyLink({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="h-10 min-w-0 flex-1 font-mono text-xs"
      />
      <Button type="button" variant="outline" onClick={handleCopy} className="h-10 shrink-0 gap-2">
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite">{copied ? copiedLabel : copy}</span>
      </Button>
    </div>
  );
}
