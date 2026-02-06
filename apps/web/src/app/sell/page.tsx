import { AppShell } from "@/components/AppShell";
import { SellGate } from "@/components/SellGate";

export default function SellPage() {
  return (
    <AppShell active="/sell">
      <SellGate />
    </AppShell>
  );
}
