"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { mockConversations, mockMessages } from "@appocar/shared";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api";

export default function MessagesPage() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<typeof mockConversations>([]);
  const [messages, setMessages] = useState<Array<{
    id: string;
    conversationId: string;
    sender: string;
    body: string;
    sentAt: string;
    readAt?: string | null;
    senderEmail?: string;
  }>>([]);
  const [activeConversation, setActiveConversation] = useState<typeof mockConversations[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<"idle" | "connected" | "error">("idle");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<{ items: any[] }>("/api/conversations")
      .then((res) => {
        const items = Array.isArray(res.items) ? res.items : [];
        if (items.length > 0) {
          const mapped = items.map((row: any) => ({
            id: row.id,
            listingId: row.listingId,
            listingTitle: row.listingTitle ?? "Listing",
            participants: ["You"],
            lastMessage: t("messages.start"),
            updatedAt: row.updatedAt ?? row.updated_at
          }));
          setConversations(mapped);
          setActiveConversation(mapped[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [user, t]);

  useEffect(() => {
    if (!user || !activeConversation) return;
    api<{ items: any[] }>(`/api/conversations/${activeConversation.id}/messages`)
      .then((res) => {
        const items = Array.isArray(res.items) ? res.items : [];
        setMessages(
          items.map((row: any) => ({
            id: row.id,
            conversationId: activeConversation.id,
            sender: row.sender_email === user.email ? "You" : "Seller",
            body: row.body,
            sentAt: row.sent_at,
            readAt: row.read_at,
            senderEmail: row.sender_email
          }))
        );
      })
      .catch(() => undefined);
  }, [activeConversation, user]);

  useEffect(() => {
    setTypingUsers([]);
    setOnlineUsers([]);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!user || !activeConversation) return;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const wsUrl = base.startsWith("https")
      ? base.replace("https", "wss")
      : base.replace("http", "ws");
    const socket = new WebSocket(`${wsUrl}/ws`);
    setSocketStatus("idle");
    setSocket(socket);

    socket.addEventListener("open", () => {
      setSocketStatus("connected");
      socket.send(JSON.stringify({ type: "subscribe", conversationId: activeConversation.id }));
      socket.send(JSON.stringify({ type: "read", conversationId: activeConversation.id }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "message" && payload.conversationId) {
          const msg = payload.message;
          if (!msg || msg.conversationId !== activeConversation.id) return;
          setMessages((prev) => {
            if (prev.some((item) => item.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                conversationId: msg.conversationId,
                sender: msg.senderEmail === user.email ? "You" : "Seller",
                body: msg.body,
                sentAt: msg.sentAt,
                readAt: msg.readAt,
                senderEmail: msg.senderEmail
              }
            ];
          });
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === msg.conversationId
                ? { ...conv, lastMessage: msg.body, updatedAt: msg.sentAt }
                : conv
            )
          );
        }
        if (payload?.type === "read" && payload.conversationId === activeConversation.id) {
          const ids = Array.isArray(payload.messageIds) ? payload.messageIds : [];
          const readAt = payload.readAt;
          if (!ids.length) return;
          setMessages((prev) =>
            prev.map((item) =>
              ids.includes(item.id) ? { ...item, readAt: readAt || item.readAt } : item
            )
          );
        }
        if (payload?.type === "typing" && payload.conversationId === activeConversation.id) {
          const email = String(payload.userEmail || "");
          if (!email || email === user.email) return;
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (payload.isTyping) next.add(email);
            else next.delete(email);
            return Array.from(next);
          });
        }
        if (payload?.type === "presence" && payload.conversationId === activeConversation.id) {
          const online = Array.isArray(payload.online) ? payload.online.map(String) : [];
          setOnlineUsers(online);
        }
      } catch {
        // ignore
      }
    });

    socket.addEventListener("close", () => setSocketStatus("error"));
    socket.addEventListener("error", () => setSocketStatus("error"));

    return () => {
      socket.send(JSON.stringify({ type: "unsubscribe" }));
      socket.close();
    };
  }, [user, activeConversation]);

  return (
    <AppShell active="/messages">
      <div className="page-header">
        <div>
          <h2 className="section-title">{t("messages.title")}</h2>
          <p className="muted">{t("messages.subtitle")}</p>
        </div>
        <div className="page-header__badge">Secure chat</div>
      </div>
      {!ready ? (
        <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>
      ) : !user ? (
        <AuthPanel />
      ) : (
        <div className="messages-layout">
          <div className="surface messages-panel">
            {loading && <div className="muted">{t("messages.loading")}</div>}
            <div className="message-list">
              {conversations.length === 0 && !loading && (
                <div className="muted">{t("messages.start")}</div>
              )}
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
          <div className="surface messages-panel messages-thread">
            <div>
              <strong>{activeConversation?.listingTitle ?? t("messages.title")}</strong>
              {activeConversation && (
                <div className="muted">
                  {activeConversation.participants.join(" · ")}
                  {onlineUsers.some((email) => email !== user?.email) && (
                    <span style={{ marginLeft: "0.6rem", color: "#16a34a", fontWeight: 600 }}>
                      {t("messages.online")}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="grid" style={{ gap: "0.8rem" }}>
              {messages.map((message) => (
                <div key={message.id} className="message-card">
                  <strong>{message.sender}</strong>
                  <div className="muted" style={{ marginTop: "0.2rem" }}>{message.body}</div>
                  {message.sender === "You" && message.readAt && (
                    <div className="muted" style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                      {t("messages.read")}
                    </div>
                  )}
                </div>
              ))}
              {typingUsers.length > 0 && (
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {t("messages.typing")}
                </div>
              )}
            </div>
            {activeConversation && <MessageComposer conversationId={activeConversation.id} socket={socket} />}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MessageComposer({ conversationId, socket }: { conversationId?: string; socket: WebSocket | null }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
      }
      if (socket && socket.readyState === WebSocket.OPEN && conversationId) {
        socket.send(JSON.stringify({ type: "typing", conversationId, isTyping: false }));
      }
    };
  }, [socket, conversationId]);

  const send = async () => {
    if (!conversationId || !user) return;
    setStatus(null);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "send", conversationId, body }));
      socket.send(JSON.stringify({ type: "typing", conversationId, isTyping: false }));
    } else {
      try {
        await api("/api/messages", { method: "POST", json: { conversationId, body } });
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed");
        return;
      }
    }
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
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
          onChange={(event) => {
            setBody(event.target.value);
            if (socket && socket.readyState === WebSocket.OPEN && conversationId) {
              socket.send(JSON.stringify({ type: "typing", conversationId, isTyping: true }));
              if (typingTimer.current) {
                window.clearTimeout(typingTimer.current);
              }
              typingTimer.current = window.setTimeout(() => {
                socket.send(JSON.stringify({ type: "typing", conversationId, isTyping: false }));
              }, 1200);
            }
          }}
        />
        <button className="primary" onClick={send}>{t("messages.send")}</button>
      </div>
      {status && <div className="muted">{status}</div>}
    </div>
  );
}
