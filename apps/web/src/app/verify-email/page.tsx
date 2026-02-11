"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useI18n } from "@/components/I18nProvider";

type Status = "idle" | "loading" | "success" | "error" | "waiting";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const token = params.get("token") ?? "";
  const redirectParam = params.get("redirect") ?? "";
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);

  const openMailApp = () => {
    if (!email) return;
    window.location.href = `mailto:${encodeURIComponent(email)}`;
  };

  const safeRedirect = useMemo(() => {
    if (!redirectParam) return "";
    try {
      const parsed = new URL(redirectParam);
      if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
        return parsed.href;
      }
      return "";
    } catch {
      return "";
    }
  }, [redirectParam]);

  useEffect(() => {
    if (!token) {
      setStatus("waiting");
      return;
    }
    let mounted = true;
    setStatus("loading");
    api("/api/auth/verify/confirm", { method: "POST", json: { token } })
      .then(() => {
        if (!mounted) return;
        setStatus("success");
        try {
          window.localStorage.removeItem("appocar_pending_email");
        } catch {
          // ignore
        }
        const target = safeRedirect || "/profile";
        setTimeout(() => router.push(target), 1500);
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [token, safeRedirect, router]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("appocar_pending_email");
      if (stored) setEmail(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (status === "waiting" || status === "loading") {
      interval = window.setInterval(async () => {
        try {
          const res = await api<{ user: { emailVerified?: boolean } | null }>("/api/auth/me");
          if (res.user?.emailVerified) {
            setStatus("success");
            if (safeRedirect) {
              setTimeout(() => router.push(safeRedirect), 1200);
            }
          }
        } catch {
          // ignore
        }
      }, 5000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [status, safeRedirect, router]);

  const resend = async () => {
    setResendStatus("idle");
    if (resendCooldown > 0) return;
    if (!email) {
      setResendStatus("error");
      return;
    }
    try {
      await api("/api/auth/verify/request", {
        method: "POST",
        json: email ? { email } : undefined
      });
      setResendStatus("sent");
      setResendCooldown(60);
    } catch {
      setResendStatus("error");
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "3rem 1.5rem" }}>
      <div className="glass" style={{ maxWidth: 520, width: "100%", padding: "2rem", textAlign: "center" }}>
        <h1 className="section-title" style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          {t("verify.title")}
        </h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          {t("verify.subtitle")}
        </p>
        {status === "loading" && <p className="muted">{t("verify.loading")}</p>}
        {status === "waiting" && (
          <>
            <h2 style={{ margin: "0.8rem 0" }}>{t("verify.waitingTitle")}</h2>
            <p className="muted">{t("verify.waitingBody")}</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2 style={{ margin: "0.8rem 0" }}>{t("verify.successTitle")}</h2>
            <p className="muted">{t("verify.successBody")}</p>
            {!safeRedirect && (
              <button className="primary" style={{ marginTop: "1.5rem" }} onClick={() => router.push("/")}>
                {t("verify.ctaHome")}
              </button>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <h2 style={{ margin: "0.8rem 0" }}>{t("verify.errorTitle")}</h2>
            <p className="muted">{t("verify.errorBody")}</p>
            <button className="primary" style={{ marginTop: "1.5rem" }} onClick={() => router.push("/")}>
              {t("verify.ctaHome")}
            </button>
          </>
        )}
        {(status === "waiting" || status === "error") && (
          <div style={{ marginTop: "1.5rem", textAlign: "left", display: "grid", gap: "0.6rem" }}>
            <label className="muted" style={{ fontSize: "0.9rem" }}>
              {t("verify.emailLabel")}
            </label>
            <input
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.email")}
            />
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <button className="secondary" onClick={resend} disabled={resendCooldown > 0}>
                {resendCooldown > 0
                  ? t("verify.resendIn", { seconds: resendCooldown })
                  : resendStatus === "sent"
                    ? t("verify.resendSent")
                    : t("verify.resendAction")}
              </button>
              <button className="ghost" onClick={openMailApp}>
                {t("verify.openMail")}
              </button>
            </div>
            {resendStatus === "error" && <div className="muted">{t("auth.genericError")}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
