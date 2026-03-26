import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const AuthModal = ({ onSuccess }: { onSuccess: () => void }) => {
  const { login, register, isAuthenticated, logout, loading, error } =
    useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (mode === "register" && password !== confirmPassword) {
      setLocalError("Password and confirm password must match");
      return;
    }
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, phone, password);
      }
      onSuccess();
    } catch (e) {
      // error is set in useAuth
    }
  };

  const sideText =
    mode === "login" ? "Log in to continue" : "Create your account";

  const formatAuthError = (raw: string | null): string | null => {
    if (!raw) return null;
    if (raw.includes("Email already registered"))
      return "Email exists, please login.";
    if (raw.includes("Invalid email")) return "Invalid Email or Password.";
    return raw;
  };

  const renderedError = formatAuthError(localError || error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md rounded-lg border border-border bg-card">
        <div className="border-b border-border py-3 px-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{sideText}</h2>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {mode === "register" && (
            <>
              <label className="block text-xs text-muted-foreground">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <label className="block text-xs text-muted-foreground">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </>
          )}
          <label className="block text-xs text-muted-foreground">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <label className="block text-xs text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {mode === "register" && (
            <>
              <label className="block text-xs text-muted-foreground">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </>
          )}

          {renderedError && (
            <p className="text-xs text-red-500">{renderedError}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            {loading ? "Working…" : mode === "login" ? "Log in" : "Register"}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            {mode === "login" ? (
              <>
                Need account?{" "}
                <button
                  className="text-primary underline"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Have account?{" "}
                <button
                  className="text-primary underline"
                  onClick={() => setMode("login")}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
