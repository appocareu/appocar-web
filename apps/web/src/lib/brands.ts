export const BRANDS = [
  "Volkswagen",
  "Skoda",
  "Toyota",
  "BMW",
  "Renault",
  "Mercedes-Benz",
  "Dacia",
  "Peugeot",
  "Audi",
  "Ford",
  "Hyundai",
  "Kia",
  "Opel",
  "Citroen",
  "Tesla",
  "Seat",
  "Volvo",
  "Fiat",
  "Nissan",
  "Mazda",
  "Alfa Romeo",
  "Cupra",
  "Honda",
  "Jaguar",
  "Land Rover",
  "Lexus",
  "Mini",
  "Mitsubishi",
  "Porsche",
  "Subaru",
  "Suzuki",
  "Bentley",
  "Ferrari",
  "Lamborghini",
  "Maserati",
  "Rolls-Royce",
  "BYD",
  "MG",
  "Nio",
  "XPeng",
  "Lada",
  "Saab",
  "Smart"
];

export const MODELS_BY_BRAND: Record<string, string[]> = {
  Volkswagen: ["Golf", "Passat", "Tiguan", "T-Roc", "ID.4", "Polo", "Touareg"],
  Skoda: ["Octavia", "Superb", "Kodiaq", "Kamiq", "Fabia", "Enyaq"],
  Toyota: ["Corolla", "Yaris", "RAV4", "Camry", "C-HR", "Prius"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "X1", "i4", "iX"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Austral", "Zoe"],
  "Mercedes-Benz": ["C-Class", "E-Class", "A-Class", "GLC", "GLE", "EQB", "EQE"],
  Dacia: ["Duster", "Sandero", "Jogger", "Spring"],
  Peugeot: ["208", "308", "3008", "2008", "508", "e-208"],
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "e-tron"],
  Ford: ["Focus", "Fiesta", "Kuga", "Puma", "Mondeo", "Mustang Mach-E"],
  Hyundai: ["i30", "Tucson", "Kona", "Santa Fe", "Ioniq 5"],
  Kia: ["Ceed", "Sportage", "Niro", "EV6", "Sorento"],
  Opel: ["Astra", "Corsa", "Mokka", "Insignia", "Grandland"],
  Citroen: ["C3", "C4", "C5 Aircross", "Berlingo"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Seat: ["Leon", "Ateca", "Ibiza", "Arona", "Tarraco"],
  Volvo: ["XC40", "XC60", "XC90", "V60", "S60", "EX30"],
  Fiat: ["500", "Panda", "Tipo", "500e"],
  Nissan: ["Qashqai", "Juke", "Leaf", "X-Trail"],
  Mazda: ["3", "6", "CX-5", "CX-30"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
  Cupra: ["Formentor", "Born", "Leon"],
  Honda: ["Civic", "CR-V", "Jazz", "HR-V"],
  Jaguar: ["F-Pace", "E-Pace", "I-Pace"],
  "Land Rover": ["Range Rover", "Discovery", "Defender"],
  Lexus: ["NX", "RX", "ES", "UX"],
  Mini: ["Cooper", "Countryman"],
  Mitsubishi: ["Outlander", "ASX"],
  Porsche: ["Cayenne", "Macan", "Taycan", "911"],
  Subaru: ["Forester", "Outback", "XV"],
  Suzuki: ["Vitara", "Swift", "S-Cross"],
  Bentley: ["Bentayga", "Continental"],
  Ferrari: ["Roma", "Portofino"],
  Lamborghini: ["Urus", "Huracan"],
  Maserati: ["Ghibli", "Levante"],
  "Rolls-Royce": ["Ghost", "Cullinan"],
  BYD: ["Atto 3", "Seal", "Dolphin"],
  MG: ["ZS EV", "MG4", "HS"],
  Nio: ["ET5", "ES6"],
  XPeng: ["G9", "P7"],
  Lada: ["Vesta", "Niva"],
  Saab: ["9-3", "9-5"],
  Smart: ["Fortwo", "Forfour"]
};

export function getModelsForBrand(brand?: string) {
  if (!brand) return [];
  return MODELS_BY_BRAND[brand] ?? [];
}

export async function fetchBrandsFromBackend(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!base) return BRANDS;
  try {
    const res = await fetch(`${base}/api/brands`, { cache: "no-store" });
    if (!res.ok) return BRANDS;
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const names = items.map((item: any) => item.name).filter(Boolean);
    return names.length ? names : BRANDS;
  } catch {
    return BRANDS;
  }
}

export async function fetchModelsFromBackend(brand?: string): Promise<string[]> {
  if (!brand) return [];
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!base) return getModelsForBrand(brand);
  try {
    const res = await fetch(`${base}/api/models?brand=${encodeURIComponent(brand)}`, { cache: "no-store" });
    if (!res.ok) return getModelsForBrand(brand);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items.length ? items : getModelsForBrand(brand);
  } catch {
    return getModelsForBrand(brand);
  }
}
