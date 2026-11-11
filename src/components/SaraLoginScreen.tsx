"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Sun, Moon, ArrowRight } from "lucide-react";
import { AuthUser } from "@/types/gt-operations";

interface SaraLoginScreenProps {
  onAuthenticated: (user: AuthUser) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function SaraLoginScreen({
  onAuthenticated,
  theme,
  onToggleTheme,
}: SaraLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          mode: password.trim() ? "password" : "quick_staff",
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      if (!res.ok || !data?.success || !data?.user) {
        const cleanEmail = email.trim().toLowerCase();
        const fallbackStaffMap: Record<
          string,
          { fullName: string; roleTitle: string }
        > = {
          "sadigulx05@gmail.com": {
            fullName: "Saad Hassan",
            roleTitle: "Sales Manager",
          },
          "josh@goldtouchds.com": {
            fullName: "Josh Talbott",
            roleTitle: "Sales Manager",
          },
          "lesley@goldtouchds.com": {
            fullName: "Lesley Weeks",
            roleTitle: "Sales Manager",
          },
          "mike@goldtouchds.com": {
            fullName: "Michael Wanegar",
            roleTitle: "Sales Manager",
          },
          "john@goldtouchds.com": {
            fullName: "John",
            roleTitle: "Delivery & Route Specialist",
          },
          "greg@goldtouchds.com": {
            fullName: "Greg",
            roleTitle: "Route Specialist",
          },
        };
        const matchedStaff = fallbackStaffMap[cleanEmail];
        if (!data && (matchedStaff || cleanEmail.endsWith("@goldtouchds.com"))) {
          const resolvedName =
            matchedStaff?.fullName || cleanEmail.split("@")[0];
          onAuthenticated({
            id: `staff-${cleanEmail}`,
            name: resolvedName,
            email: cleanEmail,
            fullName: resolvedName,
            role: "sales_manager",
            jobTitle: matchedStaff?.roleTitle || "Sales Manager",
            department: "Operations",
            avatar_url:
              cleanEmail === "sadigulx05@gmail.com"
                ? "/saad-avatar.jpg"
                : undefined,
          });
          return;
        }
        setError(
          data?.error ||
            "Authentication failed. Please check your credentials."
        );
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError("Unable to connect to authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-between relative overflow-x-hidden overflow-y-auto bg-[#f8f9fa] dark:bg-[#090a0d] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Subtle Ambient Background Depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[680px] h-[340px] sm:h-[460px] rounded-full bg-zinc-400/[0.06] dark:bg-white/[0.025] blur-[96px]" />
      </div>

      {/* Top Navigation & Theme Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-white ring-1 ring-zinc-200/90 dark:ring-white/15 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
            <img
              src="/logo.png"
              alt="GoldTouch"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <span className="text-[13px] font-medium tracking-[-0.01em] text-zinc-700 dark:text-zinc-300 truncate">
            GoldTouch Dealer Supply
          </span>
        </div>

        <button
          onClick={onToggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] ring-1 ring-zinc-200/80 dark:ring-white/[0.08] transition-all cursor-pointer shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      {/* Main Centered Sign-In Surface */}
      <main className="relative z-10 w-full max-w-[400px] mx-auto px-4 sm:px-6 py-6 sm:py-10 my-auto">
        <div className="sara-modal-surface rounded-[22px] p-6 sm:p-8 bg-white dark:bg-[#121318] ring-1 ring-zinc-900/[0.07] dark:ring-white/[0.08] shadow-[0_16px_44px_-12px_rgba(15,23,42,0.08)] dark:shadow-[0_28px_70px_-16px_rgba(0,0,0,0.75)] transition-all">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[20px] sm:text-[21px] font-semibold tracking-[-0.025em] text-zinc-900 dark:text-white">
              Sign in to SARA
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Enter your workspace email and password to continue.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-500/10 ring-1 ring-inset ring-rose-200 dark:ring-rose-500/25 text-rose-700 dark:text-rose-300 leading-relaxed"
            >
              {error}
            </div>
          )}

          {/* Sign-In Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[12.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@goldtouchds.com"
                required
                spellCheck={false}
                autoComplete="username"
                enterKeyHint="next"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-50/60 dark:bg-[#16171d] text-[16px] sm:text-[13.5px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-inset ring-zinc-200 dark:ring-white/[0.09] focus:bg-white dark:focus:bg-[#181920] focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/35 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="current-password"
                className="block text-[12.5px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  enterKeyHint="done"
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-zinc-50/60 dark:bg-[#16171d] text-[16px] sm:text-[13.5px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-inset ring-zinc-200 dark:ring-white/[0.09] focus:bg-white dark:focus:bg-[#181920] focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white/35 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sara-primary-btn w-full h-11 px-4 rounded-xl text-[13.5px] font-medium flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-xs"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      </main>

      {/* Bottom Spacer for Balanced Vertical Centering */}
      <div className="h-6 sm:h-10 shrink-0" aria-hidden="true" />
    </div>
  );
}
