import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppButton, TextField, SurfaceCard } from "../components/SharedUI";

export default function LoginScreen({ onNavigateRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    login(email, password);
  };

  const handleDemoLogin = () => {
    login("ravindra@echoes.local", "Echoes2026!");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative bg-[var(--paper)]">
      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="heading-hero text-4xl text-[var(--ink)] mb-2">
            Echoes
          </h1>
          <p className="text-xs text-[var(--ink-soft)]">
            Personal music journal
          </p>
        </div>

        {/* Form Card */}
        <SurfaceCard className="p-7 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                Email
              </label>
              <TextField
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                type="email"
                autoComplete="email"
                testID="loginEmail"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                Password
              </label>
              <TextField
                icon={Lock}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                testID="loginPassword"
                rightAccessory={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[var(--ink-faint)] hover:text-[var(--ink)] transition p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <div className="pt-2">
              <AppButton
                label="Sign In"
                icon={ArrowRight}
                onPress={handleLogin}
                className="w-full justify-center py-3"
                testID="loginBtn"
              />
            </div>

            <div className="pt-1 flex items-center justify-center">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2 px-4 rounded-full border border-dashed border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--aubergine-soft)] text-xs font-medium transition"
              >
                Instant Guest Access →
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--ink-soft)]">
            <span>Don't have an account? </span>
            <button
              onClick={onNavigateRegister}
              className="font-semibold text-[var(--primary)] hover:underline ml-1"
            >
              Sign Up
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
