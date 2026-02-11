import { AppShell } from "@/components/AppShell";
import { SellClient } from "@/components/SellClient";
import { SellHero } from "@/components/SellHero";

export const metadata = {
  title: "Prodejte auto online v EU – rychle a bezpečně | AppoCar",
  description:
    "Prodejte auto rychle a bezpečně po celé EU. Vytvořte ověřený inzerát za 5 minut, přidejte fotky a oslovte kupce z celé Evropy."
};

export default function SellPage() {
  return (
    <AppShell active="/sell">
      <SellHero />
      <SellClient />
    </AppShell>
  );
}
