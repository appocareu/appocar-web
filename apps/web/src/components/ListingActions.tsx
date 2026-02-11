"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api";

export function ListingActions({
  listingId,
  sellerName,
  sellerEmail,
  phone,
  whatsapp
}: {
  listingId: string;
  sellerName: string;
  sellerEmail?: string;
  phone?: string;
  whatsapp?: string;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const requireAuth = () => {
    if (!user) {
      setStatus(t("listing.signInToContinue"));
      return false;
    }
    return true;
  };

  const saveFavorite = async () => {
    setStatus(null);
    if (!requireAuth()) return;
    try {
      await api("/api/favorites", { method: "POST", json: { listingId } });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
      return;
    }
    try {
      const stored = Number(window.localStorage.getItem("appocar_favorites_count") ?? "0");
      const next = Number.isNaN(stored) ? 1 : stored + 1;
      window.localStorage.setItem("appocar_favorites_count", String(next));
    } catch {
      // ignore
    }
    setStatus(t("listing.favoriteSaved"));
  };

  const startConversation = async () => {
    setStatus(null);
    if (!requireAuth()) return;
    try {
      api("/api/analytics/event", {
        method: "POST",
        json: { type: "contact_click", listingId, meta: { channel: "chat" } }
      }).catch(() => undefined);
      const convo = await api<{ id: string }>("/api/conversations", {
        method: "POST",
        json: { listingId, sellerEmail }
      });
      if (convo?.id) {
        await api("/api/messages", {
          method: "POST",
          json: { conversationId: convo.id, body: `Hello ${sellerName}, I'm interested in this listing.` }
        });
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to start conversation");
      return;
    }
    api("/api/history", {
      method: "POST",
      json: { action: "Contacted seller", meta: { listingId } }
    }).catch(() => undefined);
    setStatus(t("listing.conversationStarted"));
    router.push("/messages");
  };

  const trackContact = (channel: "call" | "whatsapp") => {
    api("/api/analytics/event", {
      method: "POST",
      json: { type: "contact_click", listingId, meta: { channel } }
    }).catch(() => undefined);
  };

  return (
    <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "1rem", height: "fit-content" }}>
      <h3 className="section-title" style={{ fontSize: "1.3rem" }}>{t("listing.contact")}</h3>
      <div className="muted">{sellerName}</div>
      <div className="listing-seller">
        {phone && (
          <a className="secondary" href={`tel:${phone}`} onClick={() => trackContact("call")}>
            {t("listing.callSeller")}
          </a>
        )}
        {whatsapp && (
          <a
            className="secondary"
            href={`https://wa.me/${whatsapp.replace(/\D+/g, "")}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackContact("whatsapp")}
          >
            {t("listing.whatsapp")}
          </a>
        )}
      </div>
      <button className="primary" onClick={startConversation}>{t("listing.messageSeller")}</button>
      <button className="secondary" onClick={saveFavorite}>{t("listing.saveFavorite")}</button>
      {status && <div className="muted">{status}</div>}
    </div>
  );
}
