import { CalendarClock } from "lucide-react";
import { SectionPage } from "@/components/layout/section-page";
import { messages } from "@/i18n";

export default function AvailabilityPage() {
  return <SectionPage {...messages.pages.availability} icon={CalendarClock} />;
}
