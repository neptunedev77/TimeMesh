"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { messages } from "@/i18n";

const { button, copied: copiedLabel } = messages.projects.invite;

export function InviteButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const shareable = typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;
    try {
      if (shareable) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" onClick={copy} className="h-10 gap-2 px-4 transition-all">
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span aria-live="polite">{copied ? copiedLabel : button}</span>
    </Button>
  );
}
