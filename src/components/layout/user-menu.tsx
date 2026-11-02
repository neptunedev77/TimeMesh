import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { messages } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";

export async function UserMenu() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mesh-1 text-xs font-medium text-primary"
      >
        {user.displayName.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.displayName}</span>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={messages.auth.logout}
          title={messages.auth.logout}
        >
          <LogOut aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
