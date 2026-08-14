import { LandingPage } from "@/components/marketing/landing-page";
import { listRegions, listTemplates } from "@/lib/api";

export default async function HomePage() {
  const [regions, templates] = await Promise.all([listRegions(), listTemplates()]);
  return <LandingPage regions={regions} templates={templates} />;
}
