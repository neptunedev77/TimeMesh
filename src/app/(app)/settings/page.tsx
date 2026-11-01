import { Settings } from "lucide-react";
import { SectionPage } from "@/components/layout/section-page";
import { messages } from "@/i18n";

export default function SettingsPage() {
  return <SectionPage {...messages.pages.settings} icon={Settings} />;
}
