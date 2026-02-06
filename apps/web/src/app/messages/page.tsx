"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { mockConversations, mockMessages } from "@appocar/shared";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { useI18n } from "@/components/I18nProvider";

export default function MessagesPage() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState(mockConversations);
  const [messages, setMessages] = useState(mockMessages);
  const [activeConversation, setActiveConversation] = useState(mockConversations[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const client = supabaseClient;
    if (!client || !user) return;
    setLoading(true);
    const run = async () => {
      try {
        const { data } = await client
          .from("conversations")
          .select("id, listing_id, updated_at, listings (title)")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("updated_at", { ascending: false });
        if (data && data.length > 0) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            listingId: row.listing_id,
            listingTitle: row.listings?.title ?? "Listing",
            participants: ["You"],
            lastMessage: t("messages.start"),
            updatedAt: row.updated_at
          }));
          setConversations(mapped);
          setActiveConversation(mapped[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, t]);

  useEffect(() => {
    if (!supabaseClient || !user || !activeConversation) return;
    supabaseClient
      .from("messages")
      .select("id, body, sent_at, sender_id")
      .eq("conversation_id", activeConversation.id)
      .order("sent_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(
            data.map((row: any) => ({
              id: row.id,
              conversationId: activeConversation.id,
              sender: row.sender_id === user.id ? "You" : "Seller",
              body: row.body,
              sentAt: row.sent_at
            }))
          );
        }
      });
  }, [activeConversation, user]);

  return (
    <AppShell active="/messages">
      <div>
        <h2 className="section-title">{t("messages.title")}</h2>
        <p className="muted">{t("messages.subtitle")}</p>
      </div>
      {!ready ? (
        <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>
      ) : !user ? (
        <AuthPanel />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "0.9fr 1.1fr", gap: "1.5rem" }}>
          <div className="surface" style={{ padding: "1rem" }}>
            {loading && <div className="muted">{t("messages.loading")}</div>}
            <div className="message-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className="message-card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => setActiveConversation(conversation)}
                >
                  <strong>{conversation.listingTitle}</strong>
                  <div className="muted" style={{ marginTop: "0.3rem" }}>{conversation.lastMessage}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="surface" style={{ padding: "1.2rem", display: "grid", gap: "1rem" }}>
            <div>
              <strong>{activeConversation?.listingTitle ?? "Conversation"}</strong>
              <div className="muted">{activeConversation?.participants.join(" · ")}</div>
            </div>
            <div className="grid" style={{ gap: "0.8rem" }}>
              {messages.map((message) => (
                <div key={message.id} className="message-card">
                  <strong>{message.sender}</strong>
                  <div className="muted" style={{ marginTop: "0.2rem" }}>{message.body}</div>
                </div>
              ))}
            </div>
            <MessageComposer conversationId={activeConversation?.id} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MessageComposer({ conversationId }: { conversationId?: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const send = async () => {
    if (!conversationId || !user) return;
    if (!supabaseClient) return;
    setStatus(null);
    const { error } = await supabaseClient.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setBody("");
    setStatus(t("messages.sent"));
  };

  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <input
          className="input"
          placeholder={t("messages.placeholder")}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <button className="primary" onClick={send}>{t("messages.send")}</button>
      </div>
      {status && <div className="muted">{status}</div>}
    </div>
  );
}
