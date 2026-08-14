import { notFound } from "next/navigation";
import { TemplateDetail } from "@/components/templates/template-detail";
import { getTemplate, listPOIs } from "@/lib/api";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  const places = await listPOIs({ regionId: template.regionId });
  return <TemplateDetail template={template} places={places} />;
}
