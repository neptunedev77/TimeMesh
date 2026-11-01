import { FolderKanban } from "lucide-react";
import { SectionPage } from "@/components/layout/section-page";
import { messages } from "@/i18n";

export default function ProjectsPage() {
  return <SectionPage {...messages.pages.projects} icon={FolderKanban} />;
}
