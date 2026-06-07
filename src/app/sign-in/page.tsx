"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "signed-in" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignUp = async () => {
    setStatus("idle");
    setErrorMsg("");
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: name || email,
    });
    if (error) {
      setErrorMsg(error.message ?? "Sign-up failed");
      setStatus("error");
    } else {
      setStatus("signed-in");
    }
  };

  const handleSignIn = async () => {
    setStatus("idle");
    setErrorMsg("");
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setErrorMsg(error.message ?? "Sign-in failed");
      setStatus("error");
    } else {
      setStatus("signed-in");
    }
  };

  if (status === "signed-in") {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p data-testid="signed-in-message">Signed in</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 360 }}>
      <h1>Forge — Auth</h1>
      {status === "error" && (
        <p style={{ color: "red" }} data-testid="error-message">
          {errorMsg}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Name (for sign-up)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="name-input"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="email-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="password-input"
        />
        <button onClick={handleSignUp} data-testid="signup-button">
          Sign up
        </button>
        <button onClick={handleSignIn} data-testid="signin-button">
          Sign in
        </button>
      </div>
    </main>
  );
}
