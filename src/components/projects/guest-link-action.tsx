"use client";

import { useActionState, useState } from "react";
import type { GuestLinkState } from "@/app/(app)/projects/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/ui-extra/copy-button";
import { messages } from "@/i18n";

const { manage, cancel } = messages.projects;

export function GuestLinkAction({ action }: { action: () => Promise<GuestLinkState> }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>{manage.newLink}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.link ? manage.newLink : manage.newLinkTitle}</AlertDialogTitle>
          {!state.link && <AlertDialogDescription>{manage.newLinkDescription}</AlertDialogDescription>}
        </AlertDialogHeader>
        {state.link && <CopyLink value={state.link} label={manage.newLink} />}
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancel}</AlertDialogCancel>
          {!state.link && (
            <form action={formAction}>
              <Button type="submit" disabled={isPending} className="w-full">
                {manage.newLink}
              </Button>
            </form>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
