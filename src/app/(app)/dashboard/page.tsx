import { LayoutDashboard } from "lucide-react";
import { SectionPage } from "@/components/layout/section-page";
import { messages } from "@/i18n";

export default function DashboardPage() {
  return <SectionPage {...messages.pages.dashboard} icon={LayoutDashboard} />;
}
