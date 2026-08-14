import { PackingListTool } from "@/components/tools/packing-list";
import { listRegions } from "@/lib/api";
export default async function PackingPage() { return <PackingListTool regions={await listRegions()} />; }
