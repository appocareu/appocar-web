"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { I18nProvider } from "@/components/I18nProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}
