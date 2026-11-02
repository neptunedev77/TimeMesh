"use client";

import { Copy, Eraser, Sparkles, Undo2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { messages } from "@/i18n";

const copy = messages.board.quick;

type QuickBarProps = {
  canCopy: boolean;
  canUndo: boolean;
  canClear: boolean;
  /** Returns false when the text wasn't understood. */
  onApply: (text: string) => boolean;
  onCopyPrevious: () => void;
  onUndo: () => void;
  onClear: () => void;
};

const chipStyle =
  "rounded-full border bg-background px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:border-foreground/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
const iconButtonStyle =
  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none enabled:hover:bg-muted enabled:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

export function QuickBar({ canCopy, canUndo, canClear, onApply, onCopyPrevious, onUndo, onClear }: QuickBarProps) {
  const [text, setText] = useState("");
  const [hasError, setHasError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    const understood = onApply(text);
    setHasError(!understood);
    if (understood) setText("");
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={submit} className="relative">
        <Sparkles className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setHasError(false);
          }}
          aria-label={copy.label}
          aria-invalid={hasError}
          placeholder={copy.placeholder}
          autoComplete="off"
          className="h-11 w-full rounded-xl border bg-card pr-4 pl-10 text-sm shadow-xs transition-shadow outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive"
        />
      </form>
      {hasError && (
        <p role="alert" className="text-xs text-destructive">
          {copy.notUnderstood}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {copy.suggestions.map(({ label, text: suggestion }) => (
          <button key={label} type="button" onClick={() => onApply(suggestion)} className={chipStyle}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center">
          {canCopy && (
            <button type="button" onClick={onCopyPrevious} className={iconButtonStyle}>
              <Copy className="size-3.5" aria-hidden="true" />
              {copy.copyPrevious}
            </button>
          )}
          <button type="button" onClick={onUndo} disabled={!canUndo} className={iconButtonStyle}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            {copy.undo}
          </button>
          <button type="button" onClick={onClear} disabled={!canClear} className={iconButtonStyle}>
            <Eraser className="size-3.5" aria-hidden="true" />
            {copy.clear}
          </button>
        </div>
      </div>
    </div>
  );
}
