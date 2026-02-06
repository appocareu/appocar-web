export type Listing = {
  id: string;
  sellerId?: string;
  title: string;
  price: number;
  currency: string;
  year: number;
  mileageKm: number;
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric" | "Plug-in Hybrid";
  transmission: "Automatic" | "Manual";
  powerKw: number;
  location: string;
  images: string[];
  sellerName: string;
  sellerType: "Dealer" | "Private";
  createdAt: string;
  body: "Sedan" | "SUV" | "Hatchback" | "Coupe" | "Wagon" | "Convertible";
  color: string;
  drive: "FWD" | "RWD" | "AWD";
  doors: number;
  seats: number;
  description: string;
  features: string[];
};

export type FilterState = {
  query: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  fuel?: Listing["fuel"];
  transmission?: Listing["transmission"];
  body?: Listing["body"];
  drive?: Listing["drive"];
};

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: string;
  body: string;
  sentAt: string;
};
