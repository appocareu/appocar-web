"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";

export function ListingActions({ listingId, sellerName }: { listingId: string; sellerName: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);

  const requireAuth = () => {
    if (!user) {
      setStatus(t("listing.signInToContinue"));
      return false;
    }
    return true;
  };

  const saveFavorite = async () => {
    setStatus(null);
    if (!supabaseClient) {
      setStatus(t("listing.supabaseMissing"));
      return;
    }
    if (!requireAuth()) return;
    const { error } = await supabaseClient.from("favorites").insert({
      user_id: user?.id,
      listing_id: listingId
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(t("listing.favoriteSaved"));
  };

  const startConversation = async () => {
    setStatus(null);
    if (!supabaseClient) {
      setStatus(t("listing.supabaseMissing"));
      return;
    }
    if (!requireAuth()) return;
    const { data, error } = await supabaseClient
      .from("conversations")
      .insert({ listing_id: listingId, buyer_id: user?.id })
      .select("id")
      .single();
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data?.id) {
      await supabaseClient.from("messages").insert({
        conversation_id: data.id,
        sender_id: user?.id,
        body: `Hello ${sellerName}, I'm interested in this listing.`
      });
    }
    setStatus(t("listing.conversationStarted"));
  };

  return (
    <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "1rem", height: "fit-content" }}>
      <h3 className="section-title" style={{ fontSize: "1.3rem" }}>{t("listing.contact")}</h3>
      <div className="muted">{sellerName}</div>
      <button className="primary" onClick={startConversation}>{t("listing.messageSeller")}</button>
      <button className="secondary" onClick={saveFavorite}>{t("listing.saveFavorite")}</button>
      {status && <div className="muted">{status}</div>}
    </div>
  );
}
