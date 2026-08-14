import { TemplateGallery } from "@/components/templates/template-gallery";
import { listRegions, listTemplates } from "@/lib/api";

export default async function TemplatesPage() {
  const [templates, regions] = await Promise.all([listTemplates(), listRegions()]);
  return <TemplateGallery templates={templates} regions={regions} />;
}
