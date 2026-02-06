"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function AuthPanel({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (isSignUp) {
      const msg = await signUp(email, password, fullName);
      if (msg) setError(msg);
      return;
    }
    const msg = await signIn(email, password);
    if (msg) setError(msg);
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
      <h3 className="section-title" style={{ fontSize: "1.4rem" }}>
        {isSignUp ? "Create account" : "Sign in"}
      </h3>
      {isSignUp && (
        <input
          className="input"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      )}
      <input
        className="input"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        className="input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && <div className="muted">{error}</div>}
      <button className="primary" onClick={onSubmit}>
        {isSignUp ? "Create account" : "Sign in"}
      </button>
      <button
        className="secondary"
        onClick={() => setIsSignUp((prev) => !prev)}
      >
        {isSignUp ? "I already have an account" : "Create a new account"}
      </button>
    </div>
  );
}
