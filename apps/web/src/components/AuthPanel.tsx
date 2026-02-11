"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";

export function AuthPanel({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const { signIn, signUp, requestVerification } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [autoResent, setAutoResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const onSubmit = async () => {
    setError(null);
    setVerificationRequired(false);
    setVerificationSent(false);
    setAutoResent(false);
    if (isSignUp) {
      const result = await signUp(email, password, fullName);
      if (result.verificationRequired) {
        try {
          window.localStorage.setItem("appocar_pending_email", email);
        } catch {
          // ignore
        }
        setVerificationRequired(true);
        router.push("/verify-email");
        return;
      }
      if (!result.ok) {
        setError(result.message || t("auth.genericError"));
      }
      return;
    }
    const result = await signIn(email, password);
    if (result.verificationRequired) {
      try {
        window.localStorage.setItem("appocar_pending_email", email);
      } catch {
        // ignore
      }
      setVerificationRequired(true);
      router.push("/verify-email");
      return;
    }
    if (!result.ok) {
      setError(result.message || t("auth.genericError"));
    }
  };

  const onResend = async () => {
    setError(null);
    if (resendCooldown > 0) return;
    const res = await requestVerification(email);
    if (res.ok) {
      setVerificationSent(true);
      setAutoResent(true);
      setResendCooldown(60);
      return;
    }
    setError(res.message || t("auth.genericError"));
  };

  useEffect(() => {
    if (!verificationRequired || !email || autoResent) return;
    requestVerification(email)
      .then((res) => {
        if (res.ok) {
          setVerificationSent(true);
          setResendCooldown(60);
        }
        else setError(res.message || t("auth.genericError"));
      })
      .finally(() => setAutoResent(true));
  }, [verificationRequired, email, autoResent, requestVerification, t]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  return (
    <div className="glass" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
      <h3 className="section-title" style={{ fontSize: "1.4rem" }}>
        {isSignUp ? t("auth.createTitle") : t("auth.signInTitle")}
      </h3>
      {isSignUp && (
        <input
          className="input"
          placeholder={t("auth.fullName")}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      )}
      <input
        className="input"
        placeholder={t("auth.email")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        className="input"
        placeholder={t("auth.password")}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {verificationRequired && (
        <div className="muted" style={{ display: "grid", gap: "0.4rem" }}>
          <strong>{t("auth.verifyRequiredTitle")}</strong>
          <span>{t("auth.verifyRequiredBody")}</span>
          <button
            className="secondary"
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? t("verify.resendIn", { seconds: resendCooldown })
              : verificationSent
                ? t("auth.verifyResent")
                : t("auth.verifyResend")}
          </button>
          <button className="secondary" type="button" onClick={() => router.push("/verify-email")}>
            {t("auth.verifyOpen")}
          </button>
        </div>
      )}
      {error && <div className="muted">{error}</div>}
      <button className="primary" onClick={onSubmit}>
        {isSignUp ? t("auth.createAction") : t("auth.signInAction")}
      </button>
      <button
        className="secondary"
        onClick={() => setIsSignUp((prev) => !prev)}
      >
        {isSignUp ? t("auth.haveAccount") : t("auth.needAccount")}
      </button>
    </div>
  );
}
