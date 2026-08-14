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
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85",
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
      "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1600&q=85",
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
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=85",
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
];
