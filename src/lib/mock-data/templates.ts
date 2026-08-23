import type { TripTemplate } from "@/lib/domain/types";

export const tripTemplates: TripTemplate[] = [
  {
    id: "template-hunza-karakoram-slow-route",
    title: "The Karakoram Slow Route",
    regionId: "region-hunza",
    durationDays: 5,
    tags: ["scenic drives", "heritage", "first north trip", "balanced pace"],
    priceTier: "MID_RANGE",
    coverImageUrl:
      "https://hunzaadventuretours.com/wp-content/uploads/2020/06/Blossom-in-Karimabad-Hunza-Pakistan.jpg",
    description:
      "A well-paced first Hunza journey: historic forts, orchard villages, Attabad's water and the long Karakoram Highway run to Khunjerab when the pass is open.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-hunza",
          notes: "Arrive in Karimabad, settle in gently and keep the first evening light.",
          activities: [
            {
              customTitle: "Private transfer into Karimabad via the Karakoram Highway",
              category: "TRANSPORT",
              startTime: "09:00",
              endTime: "15:30",
              notes: "Build in photo, meal and road-condition stops.",
              estimatedCost: 18000,
            },
            {
              poiId: "poi-altit-fort",
              category: "SIGHTSEEING",
              startTime: "16:30",
              endTime: "18:00",
              notes: "An easy first heritage stop after the drive.",
              estimatedCost: 1000,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-hunza",
          notes: "Stay local in Karimabad and use the cooler hours for walking.",
          activities: [
            {
              poiId: "poi-baltit-fort",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "10:30",
              estimatedCost: 1200,
            },
            {
              customTitle: "Karimabad bazaar lunch and apricot shopping",
              category: "SHOPPING",
              startTime: "12:00",
              endTime: "14:00",
              notes: "Keep cash for small purchases.",
              estimatedCost: 2500,
            },
            {
              poiId: "poi-eagles-nest-duikar",
              category: "SIGHTSEEING",
              startTime: "17:00",
              endTime: "19:00",
              estimatedCost: 3000,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-hunza",
          notes: "Drive north with generous stops; do not rush the lake and Passu section.",
          activities: [
            {
              poiId: "poi-attabad-lake",
              category: "ADVENTURE",
              startTime: "09:00",
              endTime: "11:30",
              estimatedCost: 3500,
            },
            {
              poiId: "poi-hussaini-bridge",
              category: "SIGHTSEEING",
              startTime: "13:00",
              endTime: "14:00",
              estimatedCost: 500,
            },
            {
              poiId: "poi-passu-cones",
              category: "SIGHTSEEING",
              startTime: "16:30",
              endTime: "17:30",
            },
          ],
        },
        {
          dayNumber: 4,
          regionId: "region-hunza",
          notes: "Khunjerab is only included when the road and border opening are confirmed for your exact date.",
          activities: [
            {
              poiId: "poi-khunjerab-pass",
              category: "ADVENTURE",
              startTime: "07:00",
              endTime: "15:00",
              notes: "Carry water, sun protection and a warm layer; this is a very high-altitude day.",
              estimatedCost: 15000,
            },
            {
              customTitle: "Rest and dinner in Passu",
              category: "REST",
              startTime: "18:30",
              endTime: "20:00",
              estimatedCost: 2500,
            },
          ],
        },
        {
          dayNumber: 5,
          regionId: "region-hunza",
          notes: "Return south with a slow final morning, or use this as a weather buffer.",
          activities: [
            {
              customTitle: "Karakoram Highway return / flexible buffer day",
              category: "TRANSPORT",
              startTime: "09:00",
              endTime: "16:00",
              notes: "Keep this flexible if mountain weather delays an earlier day.",
              estimatedCost: 18000,
            },
          ],
        },
      ],
    },
    usageCount: 128,
  },
  {
    id: "template-skardu-high-frontier",
    title: "Skardu High Frontier",
    regionId: "region-skardu",
    durationDays: 6,
    tags: ["high altitude", "4x4", "mountain landscapes", "permit-aware"],
    priceTier: "MID_RANGE",
    coverImageUrl:
      "https://images.unsplash.com/photo-1667922210719-566cbfec2b11?auto=format&fit=crop&w=1600&q=85",
    description:
      "Six summer days through Skardu's lakes, cold desert and Deosai, ending with an optional, clearly flagged expedition-planning session for the K2 corridor.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-skardu",
          notes: "Keep arrival light and retain a flight-delay buffer if arriving by air.",
          activities: [
            {
              poiId: "poi-katpana-desert",
              category: "SIGHTSEEING",
              startTime: "17:00",
              endTime: "18:30",
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-skardu",
          activities: [
            {
              poiId: "poi-shangrila-lake",
              category: "SIGHTSEEING",
              startTime: "09:30",
              endTime: "11:30",
              estimatedCost: 1500,
            },
            {
              poiId: "poi-upper-kachura-lake",
              category: "ADVENTURE",
              startTime: "13:00",
              endTime: "16:00",
              estimatedCost: 500,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-skardu",
          activities: [
            {
              poiId: "poi-shigar-fort",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "11:00",
              estimatedCost: 1000,
            },
            {
              poiId: "poi-satpara-lake",
              category: "SIGHTSEEING",
              startTime: "15:30",
              endTime: "17:00",
            },
          ],
        },
        {
          dayNumber: 4,
          regionId: "region-skardu",
          notes: "A long high-altitude 4x4 day. Run this only within Deosai's open season.",
          activities: [
            {
              poiId: "poi-deosai-plains",
              category: "ADVENTURE",
              startTime: "07:00",
              endTime: "16:00",
              estimatedCost: 22000,
            },
          ],
        },
        {
          dayNumber: 5,
          regionId: "region-skardu",
          activities: [
            {
              poiId: "poi-basho-valley",
              category: "ADVENTURE",
              startTime: "08:00",
              endTime: "16:00",
              estimatedCost: 20000,
            },
          ],
        },
        {
          dayNumber: 6,
          regionId: "region-skardu",
          notes: "The final stop is planning context only—not a promise of access or a day tour.",
          activities: [
            {
              poiId: "poi-k2-concordia-trek",
              category: "ADVENTURE",
              startTime: "10:00",
              endTime: "11:00",
              notes: "Meet a licensed operator to discuss permits, expedition dates and equipment. Do not treat this as a confirmed trek booking.",
            },
          ],
        },
      ],
    },
    usageCount: 76,
  },
  {
    id: "template-lahore-layers-of-history",
    title: "Lahore, Layers of History",
    regionId: "region-lahore",
    durationDays: 3,
    tags: ["heritage", "food", "walking", "culture"],
    priceTier: "BUDGET",
    coverImageUrl:
      "https://images.unsplash.com/photo-1768084202876-a3d75afce914?auto=format&fit=crop&w=1600&q=85",
    description:
      "Three dense but unhurried days through Lahore's Mughal monuments, living old city and food culture, best enjoyed in the cooler months.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-lahore",
          activities: [
            {
              poiId: "poi-lahore-fort",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "11:30",
              estimatedCost: 1000,
            },
            {
              poiId: "poi-badshahi-mosque",
              category: "RELIGIOUS",
              startTime: "12:00",
              endTime: "13:30",
            },
            {
              poiId: "poi-fort-road-food-street",
              category: "FOOD",
              startTime: "19:00",
              endTime: "20:30",
              estimatedCost: 2500,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-lahore",
          activities: [
            {
              poiId: "poi-walled-city-delhi-gate",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "12:00",
            },
            {
              poiId: "poi-wazir-khan-mosque",
              category: "RELIGIOUS",
              startTime: "12:30",
              endTime: "13:30",
            },
            {
              poiId: "poi-anarkali-bazaar",
              category: "SHOPPING",
              startTime: "16:30",
              endTime: "18:30",
              estimatedCost: 3000,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-lahore",
          activities: [
            {
              poiId: "poi-shalimar-gardens",
              category: "SIGHTSEEING",
              startTime: "09:30",
              endTime: "11:00",
              estimatedCost: 500,
            },
            {
              poiId: "poi-data-darbar",
              category: "RELIGIOUS",
              startTime: "15:30",
              endTime: "16:30",
            },
            {
              poiId: "poi-minar-e-pakistan",
              category: "SIGHTSEEING",
              startTime: "17:30",
              endTime: "18:30",
            },
          ],
        },
      ],
    },
    usageCount: 204,
  },
  {
    id: "template-swat-buddhist-trail",
    title: "Swat Valley — Buddhist Trail & Alpine Rivers",
    regionId: "region-swat-valley",
    durationDays: 4,
    tags: ["heritage", "nature", "walking", "budget-friendly"],
    priceTier: "BUDGET",
    coverImageUrl:
      "https://plus.unsplash.com/premium_photo-1697729729075-3e56242aef49?auto=format&fit=crop&w=1600&q=85",
    description:
      "Four days through Swat's Gandhara heritage, riverside towns, and alpine lakes — ending with a forest walk in the upper valley.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-swat-valley",
          notes: "Arrive in Mingora and ease in with the museum and bazaar.",
          activities: [
            {
              poiId: "poi-swat-museum",
              category: "SIGHTSEEING",
              startTime: "10:00",
              endTime: "12:00",
              estimatedCost: 500,
            },
            {
              poiId: "poi-mingora-bazaar",
              category: "SHOPPING",
              startTime: "16:00",
              endTime: "18:00",
              estimatedCost: 1500,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-swat-valley",
          notes: "A full day with the river park and the emerald viewpoint.",
          activities: [
            {
              poiId: "poi-fizagat-park",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "11:00",
              estimatedCost: 50,
            },
            {
              poiId: "poi-swat-emerald-mines",
              category: "SIGHTSEEING",
              startTime: "14:00",
              endTime: "15:30",
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-swat-valley",
          notes: "Head up-valley to Kalam; the jeep ride to Mahodand is the highlight.",
          activities: [
            {
              customTitle: "Drive from Mingora to Kalam via Bahrain",
              category: "TRANSPORT",
              startTime: "07:00",
              endTime: "11:00",
              estimatedCost: 8000,
            },
            {
              poiId: "poi-mahodand-lake",
              category: "ADVENTURE",
              startTime: "13:00",
              endTime: "16:30",
              notes: "4x4 required; confirm road status before committing.",
              estimatedCost: 6000,
            },
          ],
        },
        {
          dayNumber: 4,
          regionId: "region-swat-valley",
          notes: "A gentle final morning in the forest before returning south.",
          activities: [
            {
              poiId: "poi-ushu-forest",
              category: "SIGHTSEEING",
              startTime: "08:00",
              endTime: "10:00",
            },
            {
              customTitle: "Return drive to Mingora / onward travel",
              category: "TRANSPORT",
              startTime: "11:00",
              endTime: "15:00",
              estimatedCost: 8000,
            },
          ],
        },
      ],
    },
    usageCount: 62,
  },
  {
    id: "template-islamabad-weekend",
    title: "Islamabad Weekend — Margallas to Taxila",
    regionId: "region-islamabad",
    durationDays: 2,
    tags: ["weekend", "hiking", "culture", "easy access"],
    priceTier: "BUDGET",
    coverImageUrl:
      "https://images.unsplash.com/photo-1655841182960-d881381be362?auto=format&fit=crop&w=1800&q=85",
    description:
      "A compact two-day introduction to the capital: morning hikes in the Margalla Hills, Mughal-era village lanes, and the city's best viewpoints.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-islamabad",
          notes: "An active day starting with a hike and finishing at the viewpoint.",
          activities: [
            {
              poiId: "poi-margalla-trail-5",
              category: "ADVENTURE",
              startTime: "07:00",
              endTime: "10:00",
            },
            {
              poiId: "poi-faisal-mosque",
              category: "SIGHTSEEING",
              startTime: "11:30",
              endTime: "12:30",
            },
            {
              poiId: "poi-daman-e-koh",
              category: "SIGHTSEEING",
              startTime: "16:00",
              endTime: "17:30",
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-islamabad",
          notes: "Culture-focused morning before departure.",
          activities: [
            {
              poiId: "poi-saidpur-village",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "11:00",
            },
            {
              poiId: "poi-pakistan-monument",
              category: "SIGHTSEEING",
              startTime: "11:30",
              endTime: "13:00",
              estimatedCost: 50,
            },
            {
              poiId: "poi-lok-virsa-museum",
              category: "SIGHTSEEING",
              startTime: "14:00",
              endTime: "16:00",
              estimatedCost: 500,
            },
          ],
        },
      ],
    },
    usageCount: 94,
  },
  {
    id: "template-naran-kaghan-lakes",
    title: "Naran & Kaghan — Lakes & High Passes",
    regionId: "region-naran-kaghan",
    durationDays: 3,
    tags: ["lakes", "scenic drives", "high altitude", "summer only"],
    priceTier: "MID_RANGE",
    coverImageUrl:
      "https://images.pexels.com/photos/13087894/pexels-photo-13087894.jpeg",
    description:
      "Three days through Kaghan's famous lake circuit: Shogran's meadows, the legendary Saif-ul-Malook, and a drive toward Babusar Pass when the road allows.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-naran-kaghan",
          notes: "Arrive via Mansehra and settle into the lower valley.",
          activities: [
            {
              poiId: "poi-shogran",
              category: "SIGHTSEEING",
              startTime: "10:00",
              endTime: "13:00",
              notes: "4x4 needed for the Shogran turn-off.",
              estimatedCost: 5000,
            },
            {
              customTitle: "Drive from Shogran to Naran",
              category: "TRANSPORT",
              startTime: "15:00",
              endTime: "17:30",
              estimatedCost: 6000,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-naran-kaghan",
          notes: "The marquee day — jeep up to Saif-ul-Malook early before the crowds arrive.",
          activities: [
            {
              poiId: "poi-saiful-malook",
              category: "ADVENTURE",
              startTime: "07:00",
              endTime: "12:00",
              notes: "Jeep hire from Naran; carry warm layers — the altitude is over 3,200 m.",
              estimatedCost: 8000,
            },
            {
              poiId: "poi-naran-bazaar",
              category: "SHOPPING",
              startTime: "16:00",
              endTime: "18:00",
              estimatedCost: 2000,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-naran-kaghan",
          notes: "Drive toward Babusar if the pass is open; otherwise visit Lalazar and Lulusar.",
          activities: [
            {
              poiId: "poi-lalazar",
              category: "SIGHTSEEING",
              startTime: "07:30",
              endTime: "10:00",
              estimatedCost: 5000,
            },
            {
              poiId: "poi-lulusar-lake",
              category: "SIGHTSEEING",
              startTime: "11:00",
              endTime: "12:30",
            },
            {
              poiId: "poi-babusar-pass",
              category: "ADVENTURE",
              startTime: "13:30",
              endTime: "15:00",
              notes: "Only attempt if the pass is confirmed open for your dates (typically late June–October).",
            },
          ],
        },
      ],
    },
    usageCount: 112,
  },
  {
    id: "template-chitral-kalash-festivals",
    title: "Chitral & Kalash — Festivals & Frontiers",
    regionId: "region-chitral-kalash",
    durationDays: 5,
    tags: ["culture", "off-grid", "festivals", "permit-aware"],
    priceTier: "MID_RANGE",
    coverImageUrl:
      "https://images.pexels.com/photos/28319571/pexels-photo-28319571.jpeg",
    description:
      "Five days exploring Chitral town, the Kalash valleys and their living traditions, hot springs, and the road toward Shandur — best timed around a Kalash festival.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-chitral-kalash",
          notes: "Arrive in Chitral via the Lowari Tunnel or by flight. Keep the first day easy.",
          activities: [
            {
              poiId: "poi-chitral-fort",
              category: "SIGHTSEEING",
              startTime: "14:00",
              endTime: "15:30",
            },
            {
              poiId: "poi-chitral-bazaar",
              category: "SHOPPING",
              startTime: "16:30",
              endTime: "18:30",
              estimatedCost: 2000,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-chitral-kalash",
          notes: "Drive south to Ayun and enter the Kalash valleys.",
          activities: [
            {
              poiId: "poi-ayun-valley",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "11:00",
            },
            {
              poiId: "poi-kalash-valley",
              category: "SIGHTSEEING",
              startTime: "13:00",
              endTime: "18:00",
              notes: "A permit is required for the Kalash valleys; arrange it in Chitral beforehand.",
              estimatedCost: 1000,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-chitral-kalash",
          notes: "Full day immersed in Bumburet. If a festival is on, this is the day to witness it.",
          activities: [
            {
              poiId: "poi-kalash-valley",
              category: "SIGHTSEEING",
              startTime: "09:00",
              endTime: "17:00",
              notes: "Explore the village, visit the Kalash museum, and attend any community events.",
            },
            {
              customTitle: "Evening with a Kalash host family",
              category: "REST",
              startTime: "18:00",
              endTime: "20:00",
              estimatedCost: 3000,
            },
          ],
        },
        {
          dayNumber: 4,
          regionId: "region-chitral-kalash",
          notes: "Return to Chitral and head to the hot springs for a well-earned soak.",
          activities: [
            {
              customTitle: "Drive back from Bumburet to Chitral",
              category: "TRANSPORT",
              startTime: "08:00",
              endTime: "10:30",
              estimatedCost: 4000,
            },
            {
              poiId: "poi-garam-chashma",
              category: "ADVENTURE",
              startTime: "13:00",
              endTime: "16:00",
              estimatedCost: 3000,
            },
          ],
        },
        {
          dayNumber: 5,
          regionId: "region-chitral-kalash",
          notes: "Optional Shandur day-trip if you have a 4x4 and the road is clear, otherwise a buffer day.",
          activities: [
            {
              poiId: "poi-shandur-pass",
              category: "ADVENTURE",
              startTime: "07:00",
              endTime: "15:00",
              notes: "Only feasible in summer with a suitable vehicle. The polo festival in July is unforgettable.",
              estimatedCost: 15000,
            },
          ],
        },
      ],
    },
    usageCount: 48,
  },
  {
    id: "template-karachi-coastal-heritage",
    title: "Karachi — Coastal Metropolis & Street Food",
    regionId: "region-karachi",
    durationDays: 3,
    tags: ["coastal", "heritage", "food", "city life"],
    priceTier: "MID_RANGE",
    coverImageUrl:
      "https://images.unsplash.com/photo-1696588719811-f3c1bc090841?auto=format&fit=crop&w=1600&q=85",
    description:
      "Three vibrant days exploring Karachi's founder's memorial, colonial landmarks, Arabian Sea coastline, and legendary food streets.",
    itineraryJson: {
      days: [
        {
          dayNumber: 1,
          regionId: "region-karachi",
          notes: "Arrive in Karachi and explore the central heritage landmarks.",
          activities: [
            {
              poiId: "poi-mazar-e-quaid",
              category: "SIGHTSEEING",
              startTime: "09:30",
              endTime: "11:30",
            },
            {
              poiId: "poi-empress-market",
              category: "SHOPPING",
              startTime: "12:00",
              endTime: "14:00",
            },
            {
              poiId: "poi-burns-road",
              category: "FOOD",
              startTime: "19:00",
              endTime: "21:30",
              notes: "Try classic Nihari, Haleem, and Rabri on the pedestrian food street.",
              estimatedCost: 2000,
            },
          ],
        },
        {
          dayNumber: 2,
          regionId: "region-karachi",
          notes: "Art, architecture, and sunset by the Arabian Sea.",
          activities: [
            {
              poiId: "poi-mohatta-palace",
              category: "SIGHTSEEING",
              startTime: "11:00",
              endTime: "13:30",
              estimatedCost: 150,
            },
            {
              poiId: "poi-clifton-beach",
              category: "SIGHTSEEING",
              startTime: "16:30",
              endTime: "18:30",
              notes: "Enjoy the sea breeze, camel rides, and street snacks along Seaview.",
              estimatedCost: 1000,
            },
          ],
        },
        {
          dayNumber: 3,
          regionId: "region-karachi",
          notes: "Harbour views and evening boardwalk dining.",
          activities: [
            {
              customTitle: "Saddar colonial heritage walk & National Museum",
              category: "SIGHTSEEING",
              startTime: "10:00",
              endTime: "13:00",
              estimatedCost: 500,
            },
            {
              poiId: "poi-port-grand",
              category: "FOOD",
              startTime: "17:30",
              endTime: "20:30",
              notes: "Pedestrian promenade with harbor views, open-air dining, and music.",
              estimatedCost: 3500,
            },
          ],
        },
      ],
    },
    usageCount: 88,
  },
];
