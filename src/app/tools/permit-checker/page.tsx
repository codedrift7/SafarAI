import { PermitChecker } from "@/components/tools/permit-checker";
import { listPOIs } from "@/lib/api";
export default async function PermitPage() { return <PermitChecker places={await listPOIs({ requiresPermit: true })} />; }
