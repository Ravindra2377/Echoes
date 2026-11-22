import React, { useState } from "react";
import { ArrowLeft, User, Mail, Lock, ShieldCheck, Eye, EyeOff, UserPlus, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppButton, TextField, SurfaceCard } from "../components/SharedUI";

export default function RegisterScreen({ onNavigateLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();

  const isValid =
    name.trim() &&
    email.trim() &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreed;

  const handleRegister = (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms & Conditions");
      return;
    }

    setError("");
    register(name, email, password);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative bg-[var(--paper)]">
      <div className="w-full max-w-sm relative z-10">
        {/* Back Button */}
        <button
          onClick={onNavigateLogin}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] mb-4 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-hero text-3xl text-[var(--ink)]">
            Create Account
          </h1>
        </div>

        {/* Form Card */}
        <SurfaceCard className="p-7 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                Full Name
              </label>
              <TextField
                icon={User}
                value={name}
                onChangeText={setName}
                placeholder="Alex Mercer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                Email
              </label>
              <TextField
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                placeholder="alex@example.com"
                type="email"
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
                placeholder="At least 6 characters"
                secureTextEntry={!showPassword}
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

            <div>
              <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
                Confirm Password
              </label>
              <TextField
                icon={ShieldCheck}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                secureTextEntry={true}
              />
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                  agreed
                    ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                    : "border-[var(--ink-faint)] hover:border-[var(--primary)]"
                }`}
              >
                {agreed && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
              <span className="text-xs text-[var(--ink-soft)]">
                I agree to the <span className="font-medium text-[var(--primary)] underline cursor-pointer">Terms & Conditions</span>
              </span>
            </div>

            <div className="pt-2">
              <AppButton
                label="Create Account"
                icon={UserPlus}
                onPress={handleRegister}
                disabled={!isValid}
                className="w-full justify-center py-3"
              />
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--ink-soft)]">
            <span>Already have an account? </span>
            <button
              onClick={onNavigateLogin}
              className="font-semibold text-[var(--primary)] hover:underline ml-1"
            >
              Sign In
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
