import { CalendarCheck } from "lucide-react";
import { SectionPage } from "@/components/layout/section-page";
import { messages } from "@/i18n";

export default function SessionsPage() {
  return <SectionPage {...messages.pages.sessions} icon={CalendarCheck} />;
}
