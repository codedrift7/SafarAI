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
      "https://images.unsplash.com/photo-1640881193563-b5f0bf20019a?auto=format&fit=crop&w=1800&q=85",
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
      "https://images.unsplash.com/photo-1667922210719-566cbfec2b11?auto=format&fit=crop&w=1800&q=85",
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
      "https://images.unsplash.com/photo-1768084202876-a3d75afce914?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["AUTUMN", "WINTER", "SPRING"],
    typicalTripDays: 3,
    planningNotes:
      "October through March is most comfortable. In summer, schedule outdoor landmarks early and avoid long afternoon walks in high heat and humidity.",
  },
  {
    id: "region-swat-valley",
    name: "Swat Valley",
    province: "KPK",
    slug: "swat-valley",
    description: "Often called the Switzerland of the East, Swat offers lush alpine valleys, ancient Buddhist stupas, and clear rivers.",
    heroImageUrl: "https://plus.unsplash.com/premium_photo-1697729729075-3e56242aef49?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["SPRING", "SUMMER", "AUTUMN"],
    typicalTripDays: 4,
    planningNotes: "Summer is peak season for domestic tourism. Winters offer skiing at Malam Jabba, but higher valleys like Kalam might be snowbound.",
  },
  {
    id: "region-islamabad",
    name: "Islamabad",
    province: "ICT",
    slug: "islamabad",
    description: "Pakistan's green and orderly capital, known for the Margalla Hills, broad avenues, and modern landmarks.",
    heroImageUrl: "https://images.unsplash.com/photo-1608020932658-d0e19a69580b?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["SPRING", "AUTUMN", "WINTER"],
    typicalTripDays: 2,
    planningNotes: "A convenient hub for northern travel. Spring brings beautiful blooms, while summer can be humid.",
  },
  {
    id: "region-naran-kaghan",
    name: "Naran & Kaghan",
    province: "KPK",
    slug: "naran-kaghan",
    description: "A famous alpine valley route featuring the emerald Lake Saif-ul-Malook and the high Babusar Pass gateway to Gilgit.",
    heroImageUrl: "https://images.pexels.com/photos/13087894/pexels-photo-13087894.jpeg",
    bestSeasons: ["SUMMER", "AUTUMN"],
    typicalTripDays: 3,
    planningNotes: "The road to Naran often opens in late May. Babusar Pass typically opens in late June and closes by October.",
  },
  {
    id: "region-peshawar",
    name: "Peshawar",
    province: "KPK",
    slug: "peshawar",
    description: "One of South Asia's oldest living cities, celebrated for its historic bazaars, rich culinary heritage, and robust Pashtun hospitality.",
    heroImageUrl: "https://images.pexels.com/photos/5838486/pexels-photo-5838486.jpeg",
    bestSeasons: ["SPRING", "AUTUMN", "WINTER"],
    typicalTripDays: 2,
    planningNotes: "Winters and spring are the best times to visit to avoid the extreme summer heat.",
  },
  {
    id: "region-chitral-kalash",
    name: "Chitral & Kalash",
    province: "KPK",
    slug: "chitral-kalash",
    description: "A culturally unique region dominated by Tirich Mir, home to the pagan Kalash people and spectacular high-altitude passes.",
    heroImageUrl: "https://images.pexels.com/photos/28319571/pexels-photo-28319571.jpeg",
    bestSeasons: ["SPRING", "SUMMER", "AUTUMN"],
    typicalTripDays: 5,
    planningNotes: "The Lowari Tunnel makes year-round access easier, but summer is best for festivals in the Kalash valleys.",
  },
  {
    id: "region-fairy-meadows-nanga-parbat",
    name: "Fairy Meadows & Nanga Parbat",
    province: "Gilgit-Baltistan",
    slug: "fairy-meadows-nanga-parbat",
    description: "Pine-clad pastures resting directly beneath the immense, sheer north face of Nanga Parbat.",
    heroImageUrl: "https://images.unsplash.com/photo-1653163517210-2e3b56190680?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["SUMMER", "AUTUMN"],
    typicalTripDays: 3,
    planningNotes: "Requires a hair-raising jeep ride from Raikot Bridge followed by a 2-3 hour hike. Not accessible in winter.",
  },
  {
    id: "region-multan",
    name: "Multan",
    province: "Punjab",
    slug: "multan",
    description: "The City of Saints, defined by its spectacular Sufi shrines, blue glazed tile work, and ancient history.",
    heroImageUrl: "https://images.unsplash.com/photo-1600434890250-44df6e4c0d05?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["AUTUMN", "WINTER", "SPRING"],
    typicalTripDays: 2,
    planningNotes: "Summers are exceptionally hot; visiting between November and March is strongly recommended.",
  },
  {
    id: "region-karachi",
    name: "Karachi",
    province: "Sindh",
    slug: "karachi",
    description:
      "Pakistan's bustling coastal metropolis: colonial heritage, Arabian Sea beaches, historic markets, and an unmatched culinary culture.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1696588719811-f3c1bc090841?auto=format&fit=crop&w=1800&q=85",
    bestSeasons: ["AUTUMN", "WINTER", "SPRING"],
    typicalTripDays: 3,
    planningNotes:
      "November to February is the ideal window with mild coastal breezes. Traffic can be heavy, so grouping activities by area is recommended.",
  }
];
