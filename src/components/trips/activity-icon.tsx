import { BedDouble, Camera, CarFront, Coffee, Landmark, MapPin, Mountain, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { ActivityCategory } from "@/lib/domain/types";

const icons: Record<ActivityCategory, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  SIGHTSEEING: Camera, FOOD: UtensilsCrossed, TRANSPORT: CarFront, LODGING: BedDouble, REST: Coffee, ADVENTURE: Mountain, SHOPPING: ShoppingBag, RELIGIOUS: Landmark,
};

export function ActivityIcon({ category, size = 18 }: { category: ActivityCategory; size?: number }) {
  const Icon = icons[category] ?? MapPin;
  return <Icon size={size} strokeWidth={1.85} />;
}
