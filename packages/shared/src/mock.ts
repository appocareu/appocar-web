import type { Listing, Conversation, Message } from "./types";

export const mockListings: Listing[] = [
  {
    id: "l1",
    title: "2022 Audi Q5 45 TFSI quattro",
    price: 45900,
    currency: "EUR",
    year: 2022,
    mileageKm: 18500,
    fuel: "Petrol",
    transmission: "Automatic",
    powerKw: 195,
    location: "Munich, DE",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1493238792000-8113da705763?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=60&w=1600&auto=format&fit=crop"
    ],
    sellerName: "Bavarian Autohaus",
    sellerType: "Dealer",
    createdAt: "2025-11-18T09:00:00.000Z",
    body: "SUV",
    color: "Daytona Gray",
    drive: "AWD",
    doors: 5,
    seats: 5,
    description:
      "One-owner Q5 with premium plus package, adaptive cruise, panoramic roof, and full service history.",
    features: [
      "Panoramic roof",
      "Matrix LED",
      "Adaptive cruise",
      "Heated seats",
      "360 camera"
    ]
  },
  {
    id: "l2",
    title: "2021 BMW 330e M Sport",
    price: 38900,
    currency: "EUR",
    year: 2021,
    mileageKm: 26500,
    fuel: "Plug-in Hybrid",
    transmission: "Automatic",
    powerKw: 215,
    location: "Hamburg, DE",
    images: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1462396881884-de2c07cb95ed?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=60&w=1600&auto=format&fit=crop"
    ],
    sellerName: "Nordic Mobility",
    sellerType: "Dealer",
    createdAt: "2025-12-02T14:30:00.000Z",
    body: "Sedan",
    color: "Mineral White",
    drive: "RWD",
    doors: 4,
    seats: 5,
    description:
      "M Sport with live cockpit, Harman Kardon, HUD, and extended warranty until 2027.",
    features: ["HUD", "Harman Kardon", "Wireless CarPlay", "Sport seats"]
  },
  {
    id: "l3",
    title: "2020 Tesla Model 3 Long Range",
    price: 36900,
    currency: "EUR",
    year: 2020,
    mileageKm: 32000,
    fuel: "Electric",
    transmission: "Automatic",
    powerKw: 258,
    location: "Berlin, DE",
    images: [
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441148345475-03a2e82f9719?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=60&w=1600&auto=format&fit=crop"
    ],
    sellerName: "Private Seller",
    sellerType: "Private",
    createdAt: "2025-12-19T08:15:00.000Z",
    body: "Sedan",
    color: "Pearl White",
    drive: "AWD",
    doors: 4,
    seats: 5,
    description:
      "Full self-driving capability, premium interior, and recent tire replacement.",
    features: ["FSD", "Premium audio", "Heated steering", "Glass roof"]
  },
  {
    id: "l4",
    title: "2019 Mercedes-Benz E 220d AMG Line",
    price: 32900,
    currency: "EUR",
    year: 2019,
    mileageKm: 54000,
    fuel: "Diesel",
    transmission: "Automatic",
    powerKw: 143,
    location: "Cologne, DE",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1493238792000-8113da705763?q=60&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=60&w=1600&auto=format&fit=crop"
    ],
    sellerName: "Rhein Auto",
    sellerType: "Dealer",
    createdAt: "2025-10-28T10:20:00.000Z",
    body: "Sedan",
    color: "Obsidian Black",
    drive: "RWD",
    doors: 4,
    seats: 5,
    description:
      "AMG Line with ambient lighting, Burmester audio, and full service records.",
    features: ["Burmester", "Ambient lighting", "Driver assist", "Keyless"]
  }
];

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    listingId: "l1",
    listingTitle: "2022 Audi Q5 45 TFSI quattro",
    participants: ["You", "Bavarian Autohaus"],
    lastMessage: "We can schedule a test drive this week.",
    updatedAt: "2026-01-28T15:20:00.000Z"
  },
  {
    id: "c2",
    listingId: "l3",
    listingTitle: "2020 Tesla Model 3 Long Range",
    participants: ["You", "Private Seller"],
    lastMessage: "Battery health is 92%, happy to share report.",
    updatedAt: "2026-01-30T09:40:00.000Z"
  }
];

export const mockMessages: Message[] = [
  {
    id: "m1",
    conversationId: "c1",
    sender: "Bavarian Autohaus",
    body: "We can schedule a test drive this week.",
    sentAt: "2026-01-28T15:20:00.000Z"
  },
  {
    id: "m2",
    conversationId: "c2",
    sender: "Private Seller",
    body: "Battery health is 92%, happy to share report.",
    sentAt: "2026-01-30T09:40:00.000Z"
  }
];
