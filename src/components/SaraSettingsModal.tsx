"use client";

import React, { useEffect, useState } from "react";
import { X, LogOut, RotateCcw } from "lucide-react";
import {
  Department,
  AuthUser,
  SaraCrudPermissions,
  DEFAULT_CRUD_PERMISSIONS,
  CRUD_MODULE_DEFINITIONS,
  CrudModuleKey,
} from "../types/gt-operations";
import { saraSound } from "../lib/sara-sound";
import { SaraFemaleVoiceId } from "../lib/sara-voice";

export type ThemeMode = "light" | "dark" | "ivory" | "system";
export type FontSizeMode = "compact" | "standard" | "large";
export type ResponseStyleMode = "concise" | "balanced" | "detailed";
export type VoiceReadbackMode = "voice-only" | "always" | "off";

export interface SaraSettings {
  theme: ThemeMode;
  fontSize: FontSizeMode;
  responseStyle: ResponseStyleMode;
  defaultDepartment: Department;
  voiceMode: VoiceReadbackMode;
  voiceName: SaraFemaleVoiceId;
  voiceRate: number;
  showStructuredCards: boolean;
  clickableEntityCodes: boolean;
  showFollowUpChips: boolean;
  enableLiveCrud: boolean;
  crudPermissions: SaraCrudPermissions;
  sendOnEnter: boolean;
  typingSound: boolean;
}

export const DEFAULT_SARA_SETTINGS: SaraSettings = {
  theme: "dark",
  fontSize: "standard",
  responseStyle: "balanced",
  defaultDepartment: "all",
  voiceMode: "off",
  voiceName: "Aoede",
  voiceRate: 1.0,
  showStructuredCards: true,
  clickableEntityCodes: true,
  showFollowUpChips: false,
  enableLiveCrud: true,
  crudPermissions: { ...DEFAULT_CRUD_PERMISSIONS },
  sendOnEnter: true,
  typingSound: true,
};

interface SaraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SaraSettings;
  onUpdateSettings: (next: SaraSettings) => void;
  onResetSettings: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  userAvatarUrl?: string;
  onExportTranscript?: () => void;
  onClearChat?: () => void;
}

export const SaraSettingsModal: React.FC<SaraSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  currentUser,
  onSignOut,
  userAvatarUrl,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "permissions">(
    "general"
  );
  const [avatarError, setAvatarError] = useState(false);
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    setAvatarError(false);
  }, [userAvatarUrl, currentUser?.email]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDark =
    settings.theme === "dark" || (settings.theme === "system" && systemDark);
  const isIvory = settings.theme === "ivory";

  const updateField = <K extends keyof SaraSettings>(
    key: K,
    value: SaraSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const resolvedPermissions: SaraCrudPermissions = {
    ...DEFAULT_CRUD_PERMISSIONS,
    ...(settings.crudPermissions || {}),
  };

  const toggleModulePermission = (modKey: CrudModuleKey) => {
    const nextVal = !resolvedPermissions[modKey];
    onUpdateSettings({
      ...settings,
      enableLiveCrud: nextVal ? true : settings.enableLiveCrud,
      crudPermissions: {
        ...resolvedPermissions,
        [modKey]: nextVal,
      },
    });
  };

  const setAllModulePermissions = (allowed: boolean) => {
    const nextPerms: SaraCrudPermissions = {
      accounts: allowed,
      hr: allowed,
      catalog: allowed,
      sales: allowed,
      billing: allowed,
      purchasing: allowed,
      fulfillment: allowed,
    };
    onUpdateSettings({
      ...settings,
      enableLiveCrud: allowed,
      crudPermissions: nextPerms,
    });
  };

  const themeOptions: Array<{ id: ThemeMode; label: string }> = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "ivory", label: "Ivory" },
    { id: "system", label: "System" },
  ];

  const fontSizeOptions: Array<{ id: FontSizeMode; label: string }> = [
    { id: "compact", label: "Compact" },
    { id: "standard", label: "Default" },
    { id: "large", label: "Large" },
  ];

  const responseStyleOptions: Array<{ id: ResponseStyleMode; label: string }> = [
    { id: "concise", label: "Fast" },
    { id: "balanced", label: "Auto" },
    { id: "detailed", label: "Pro" },
  ];

  const toggleItems: Array<{
    key:
      | "showStructuredCards"
      | "clickableEntityCodes"
      | "showFollowUpChips"
      | "typingSound"
      | "sendOnEnter";
    label: string;
    description: string;
  }> = [
    {
      key: "showStructuredCards",
      label: "Structured data cards",
      description: "Display interactive ERP order, invoice, and analytics cards",
    },
    {
      key: "clickableEntityCodes",
      label: "Entity quick-links",
      description: "Click order numbers, invoices, and SKUs to inspect",
    },
    {
      key: "showFollowUpChips",
      label: "Follow-up action chips",
      description: "Show contextual quick-action pills below responses",
    },
    {
      key: "typingSound",
      label: "Sound effects",
      description: "Subtle acoustic feedback when sending and streaming",
    },
    {
      key: "sendOnEnter",
      label: "Send with Enter",
      description: "Press Enter to send, or Shift+Enter for a new line",
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
        isDark
          ? "bg-black/60 backdrop-blur-md"
          : "bg-slate-950/30 backdrop-blur-sm"
      }`}
      onClick={onClose}
    >
      <div
        className={`sara-settings-modal relative w-full max-w-[490px] rounded-[22px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
          isDark
            ? "bg-[#17181d]/98 text-[#f4f4f5] shadow-[0_28px_72px_-12px_rgba(0,0,0,0.88)] ring-1 ring-white/[0.08]"
            : isIvory
              ? "bg-[#fffdf8] text-[#1c1917] shadow-[0_28px_72px_-15px_rgba(28,25,23,0.16)] ring-1 ring-black/[0.07]"
              : "bg-white text-slate-900 shadow-[0_28px_72px_-15px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/[0.08]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header with Segmented Tabs */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-b ${
            isDark
              ? "border-white/[0.06]"
              : isIvory
                ? "border-[#e6decb]"
                : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <h2 className="text-[15.5px] font-medium tracking-[-0.01em]">
              Settings
            </h2>
            <div
              className={`inline-flex rounded-xl p-1 ${
                isDark
                  ? "bg-[#101115] ring-1 ring-white/[0.06]"
                  : isIvory
                    ? "bg-[#f3ede1]"
                    : "bg-slate-100/90"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`px-3 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                  isDark
                    ? activeTab === "general"
                      ? "bg-[#262832] text-white font-medium shadow-xs"
                      : "text-[#8e8ea0] hover:text-white"
                    : activeTab === "general"
                      ? "bg-white text-slate-900 font-medium shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("permissions")}
                className={`px-3 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                  isDark
                    ? activeTab === "permissions"
                      ? "bg-[#262832] text-white font-medium shadow-xs"
                      : "text-[#8e8ea0] hover:text-white"
                    : activeTab === "permissions"
                      ? "bg-white text-slate-900 font-medium shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Permissions
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none ${
              isDark
                ? "text-[#8e8ea0] hover:text-white hover:bg-white/[0.07]"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Tab 1: General Preferences */}
        {activeTab === "general" && (
          <div
            className={`px-6 divide-y max-h-[76vh] overflow-y-auto ${
              isDark
                ? "divide-white/[0.055]"
                : isIvory
                  ? "divide-[#e6decb]/70"
                  : "divide-slate-100/90"
            }`}
          >
            {/* Theme */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <span className="text-[13.5px] font-normal">Theme</span>
              <div
                className={`inline-flex rounded-xl p-1 ${
                  isDark
                    ? "bg-[#101115] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-slate-100/90"
                }`}
              >
                {themeOptions.map((opt) => {
                  const active = settings.theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("theme", opt.id)}
                      className={`px-3 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#262832] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-slate-900 font-medium shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Size */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <span className="text-[13.5px] font-normal">Text size</span>
              <div
                className={`inline-flex rounded-xl p-1 ${
                  isDark
                    ? "bg-[#101115] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-slate-100/90"
                }`}
              >
                {fontSizeOptions.map((opt) => {
                  const active = settings.fontSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("fontSize", opt.id)}
                      className={`px-3 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#262832] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-slate-900 font-medium shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Response Mode */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <span className="text-[13.5px] font-normal">SARA mode</span>
              <div
                className={`inline-flex rounded-xl p-1 ${
                  isDark
                    ? "bg-[#101115] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-slate-100/90"
                }`}
              >
                {responseStyleOptions.map((opt) => {
                  const active = settings.responseStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("responseStyle", opt.id)}
                      className={`px-3.5 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#262832] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-slate-900 font-medium shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle Rows */}
            {toggleItems.map((item) => {
              const isChecked =
                item.key === "typingSound"
                  ? settings.typingSound !== false
                  : Boolean(settings[item.key]);

              const handleToggle = () => {
                const nextVal = !isChecked;
                updateField(item.key, nextVal);
                if (item.key === "typingSound") {
                  if (nextVal) {
                    saraSound.playPreviewSequence();
                  } else {
                    saraSound.stopTypingLoop(false);
                  }
                }
              };

              return (
                <div
                  key={item.key}
                  onClick={handleToggle}
                  role="switch"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle();
                    }
                  }}
                  className="py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none group"
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-normal">{item.label}</div>
                    <div
                      className={`text-[11.5px] mt-0.5 leading-snug ${
                        isDark ? "text-[#8e8ea0]" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor: isChecked
                        ? "#22c55e"
                        : isDark
                          ? "#2b2d38"
                          : "#e2e8f0",
                    }}
                    className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-out ring-1 ring-inset ring-black/5 dark:ring-white/[0.08]"
                  >
                    <span
                      style={{
                        backgroundColor: "#ffffff",
                      }}
                      className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full shadow-xs transition-transform duration-200 ease-out ${
                        isChecked ? "translate-x-[18px]" : "translate-x-0"
                      }`}
                    />
                  </span>
                </div>
              );
            })}

            {/* Reset Preferences Row */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-normal">Reset preferences</div>
                <div
                  className={`text-[11.5px] mt-0.5 leading-snug ${
                    isDark ? "text-[#8e8ea0]" : "text-slate-500"
                  }`}
                >
                  Restore default theme, mode, and interface settings
                </div>
              </div>

              <button
                type="button"
                onClick={onResetSettings}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer shrink-0 focus:outline-none ${
                  isDark
                    ? "bg-[#22242d] hover:bg-[#2c2e3a] text-[#e4e4e7] hover:text-white ring-1 ring-white/[0.08]"
                    : isIvory
                      ? "bg-[#f3ede1] hover:bg-[#eae1d0] text-[#1c1917]"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Reset defaults</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Module CRUD Permissions */}
        {activeTab === "permissions" && (
          <div
            className={`px-6 divide-y max-h-[76vh] overflow-y-auto ${
              isDark
                ? "divide-white/[0.055]"
                : isIvory
                  ? "divide-[#e6decb]/70"
                  : "divide-slate-100/90"
            }`}
          >
            {/* Master CRUD Switch & Bulk Actions */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">
                  Live database write access
                </div>
                <div
                  className={`text-[11.5px] mt-0.5 leading-snug ${
                    isDark ? "text-[#8e8ea0]" : "text-slate-500"
                  }`}
                >
                  Disabled modules remain readable in chat without write actions
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllModulePermissions(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#22242d] hover:bg-[#2c2e3a] text-[#e4e4e7]"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                  }`}
                >
                  Allow all
                </button>
                <button
                  type="button"
                  onClick={() => setAllModulePermissions(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#22242d] hover:bg-[#2c2e3a] text-[#8e8ea0] hover:text-white"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Read-only all
                </button>
              </div>
            </div>

            {/* Individual ERP Module Permission Rows */}
            {CRUD_MODULE_DEFINITIONS.map((mod) => {
              const isAllowed =
                settings.enableLiveCrud !== false &&
                resolvedPermissions[mod.key] !== false;

              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModulePermission(mod.key)}
                  role="switch"
                  aria-checked={isAllowed}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleModulePermission(mod.key);
                    }
                  }}
                  className="py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-normal">
                        {mod.label}
                      </span>
                      <span
                        className={`text-[11px] font-normal ${
                          isDark ? "text-[#8e8ea0]" : "text-slate-400"
                        }`}
                      >
                        {isAllowed ? "Full CRUD" : "Read-only"}
                      </span>
                    </div>
                    <div
                      className={`text-[11.5px] mt-0.5 leading-snug ${
                        isDark ? "text-[#8e8ea0]" : "text-slate-500"
                      }`}
                    >
                      {mod.description}
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor: isAllowed
                        ? "#22c55e"
                        : isDark
                          ? "#2b2d38"
                          : "#e2e8f0",
                    }}
                    className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-out ring-1 ring-inset ring-black/5 dark:ring-white/[0.08]"
                  >
                    <span
                      style={{
                        backgroundColor: "#ffffff",
                      }}
                      className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full shadow-xs transition-transform duration-200 ease-out ${
                        isAllowed ? "translate-x-[18px]" : "translate-x-0"
                      }`}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Clean Bottom Account & Log Out Footer */}
        {currentUser && (
          <div
            className={`px-6 py-3.5 flex items-center justify-between gap-3 border-t ${
              isDark
                ? "border-white/[0.06] bg-[#131418]"
                : isIvory
                  ? "border-[#e6decb] bg-[#f7f2e7]/60"
                  : "border-slate-100 bg-slate-50/70"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-[#262832] ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
                {userAvatarUrl && !avatarError ? (
                  <img
                    src={userAvatarUrl}
                    alt={currentUser.fullName}
                    onError={() => setAvatarError(true)}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700 dark:text-[#e4e4e7]">
                    {(currentUser.fullName || "S")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate leading-tight">
                  {currentUser.fullName}
                </div>
                <div
                  className={`text-[11.5px] truncate mt-0.5 ${
                    isDark ? "text-[#8e8ea0]" : "text-slate-500"
                  }`}
                >
                  {currentUser.email}
                </div>
              </div>
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer shrink-0 focus:outline-none ${
                  isDark
                    ? "bg-[#22242d] hover:bg-rose-500/20 text-[#f4f4f5] hover:text-rose-300 ring-1 ring-white/[0.08]"
                    : "bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 ring-1 ring-slate-200/80"
                }`}
              >
                <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Log out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
