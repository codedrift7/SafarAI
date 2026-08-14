import type { Region } from "@/lib/domain/types";

export const regions: Region[] = [
  {
    id: "region-hunza",
    name: "Hunza",
    province: "Gilgit-Baltistan",
    slug: "hunza",
    description:
      "A high Karakoram valley of apricot orchards, turquoise lakes, centuries-old forts and the legendary Karakoram Highway.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["SPRING", "SUMMER", "AUTUMN"],
    typicalTripDays: 5,
    planningNotes:
      "May to October is the reliable window. Keep a flexible buffer if you are flying to Gilgit, and check the Khunjerab road status before travelling north of Passu.",
  },
  {
    id: "region-skardu",
    name: "Skardu",
    province: "Gilgit-Baltistan",
    slug: "skardu",
    description:
      "An austere mountain basin where cold desert, glacial lakes, fort towns and expedition routes meet beneath the Karakoram.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["SUMMER", "AUTUMN"],
    typicalTripDays: 5,
    planningNotes:
      "Plan June to September for Deosai and remote valleys. Weather frequently disrupts flights, so a road or time buffer is a smart part of the itinerary.",
  },
  {
    id: "region-lahore",
    name: "Lahore",
    province: "Punjab",
    slug: "lahore",
    description:
      "Pakistan's cultural heart: Mughal monuments, layered old-city lanes, living craft traditions and a food scene worth planning around.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["AUTUMN", "WINTER", "SPRING"],
    typicalTripDays: 3,
    planningNotes:
      "October through March is most comfortable. In summer, schedule outdoor landmarks early and avoid long afternoon walks in high heat and humidity.",
  },
];
