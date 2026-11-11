"use client";

import React, { useEffect, useState } from "react";
import { X, LogOut, RotateCcw, Download, Check } from "lucide-react";
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
  canInstallPwa?: boolean;
  isPwaInstalled?: boolean;
  onInstallPwa?: () => void;
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
  isPwaInstalled,
  onInstallPwa,
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
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
    const currentlyAllowed =
      settings.enableLiveCrud !== false &&
      resolvedPermissions[modKey] !== false;
    const nextVal = !currentlyAllowed;
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

  const enabledModulesCount = CRUD_MODULE_DEFINITIONS.filter(
    (m) =>
      settings.enableLiveCrud !== false && resolvedPermissions[m.key] !== false
  ).length;

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

  const renderSwitch = (checked: boolean) => {
    const trackBg = checked
      ? isDark
        ? "#f4f4f5"
        : "#18181b"
      : isDark
        ? "#272830"
        : isIvory
          ? "#e2d9c5"
          : "#e4e4e7";
    const thumbBg = checked ? (isDark ? "#090a0d" : "#ffffff") : "#ffffff";

    return (
      <span
        style={{ backgroundColor: trackBg }}
        className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-out ring-1 ring-inset ring-black/5 dark:ring-white/[0.08]"
      >
        <span
          style={{ backgroundColor: thumbBg }}
          className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full shadow-xs transition-transform duration-200 ease-out ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 ${
        isDark
          ? "bg-black/65 backdrop-blur-md"
          : "bg-zinc-950/35 backdrop-blur-sm"
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`sara-settings-modal relative w-full sm:max-w-[540px] max-h-[90dvh] sm:max-h-[85dvh] rounded-t-[24px] sm:rounded-[22px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
          isDark
            ? "bg-[#14151a] text-[#f4f4f5] shadow-[0_28px_80px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.08]"
            : isIvory
              ? "bg-[#fffdf8] text-[#1c1917] shadow-[0_28px_72px_-15px_rgba(28,25,23,0.18)] ring-1 ring-black/[0.07]"
              : "bg-white text-zinc-900 shadow-[0_28px_72px_-15px_rgba(15,23,42,0.18)] ring-1 ring-zinc-900/[0.08]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Responsive Segmented Navigation */}
        <div
          className={`px-5 sm:px-6 pt-4 pb-3.5 border-b shrink-0 ${
            isDark
              ? "border-white/[0.06]"
              : isIvory
                ? "border-[#e6decb]"
                : "border-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.015em]">
                Settings
              </h2>
              <div
                className={`hidden sm:inline-flex rounded-xl p-1 ${
                  isDark
                    ? "bg-[#0d0e12] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-zinc-100/90"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`px-3.5 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                    isDark
                      ? activeTab === "general"
                        ? "bg-[#23252f] text-white font-medium shadow-xs"
                        : "text-[#8e8ea0] hover:text-white"
                      : activeTab === "general"
                        ? "bg-white text-zinc-900 font-medium shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("permissions")}
                  className={`px-3.5 py-1 rounded-lg text-[12px] transition-all duration-150 cursor-pointer focus:outline-none ${
                    isDark
                      ? activeTab === "permissions"
                        ? "bg-[#23252f] text-white font-medium shadow-xs"
                        : "text-[#8e8ea0] hover:text-white"
                      : activeTab === "permissions"
                        ? "bg-white text-zinc-900 font-medium shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Permissions
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none shrink-0 ${
                isDark
                  ? "text-[#8e8ea0] hover:text-white hover:bg-white/[0.07]"
                  : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              aria-label="Close settings"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>

          {/* Full-width Segmented Tab Bar on Mobile (< 640px) */}
          <div
            className={`grid sm:hidden grid-cols-2 rounded-xl p-1 mt-3 ${
              isDark
                ? "bg-[#0d0e12] ring-1 ring-white/[0.06]"
                : isIvory
                  ? "bg-[#f3ede1]"
                  : "bg-zinc-100/90"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`py-1.5 rounded-lg text-[12.5px] transition-all duration-150 cursor-pointer focus:outline-none ${
                isDark
                  ? activeTab === "general"
                    ? "bg-[#23252f] text-white font-medium shadow-xs"
                    : "text-[#8e8ea0] hover:text-white"
                  : activeTab === "general"
                    ? "bg-white text-zinc-900 font-medium shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`py-1.5 rounded-lg text-[12.5px] transition-all duration-150 cursor-pointer focus:outline-none ${
                isDark
                  ? activeTab === "permissions"
                    ? "bg-[#23252f] text-white font-medium shadow-xs"
                    : "text-[#8e8ea0] hover:text-white"
                  : activeTab === "permissions"
                    ? "bg-white text-zinc-900 font-medium shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Permissions
            </button>
          </div>
        </div>

        {/* Tab 1: General Preferences */}
        {activeTab === "general" && (
          <div
            className={`px-5 sm:px-6 divide-y flex-1 overflow-y-auto overscroll-contain ${
              isDark
                ? "divide-white/[0.055]"
                : isIvory
                  ? "divide-[#e6decb]/70"
                  : "divide-zinc-100"
            }`}
          >
            {/* Theme */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">Theme</div>
                <div
                  className={`text-[11.5px] mt-0.5 ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                  }`}
                >
                  Choose your workspace color appearance
                </div>
              </div>
              <div
                className={`grid grid-cols-4 sm:inline-flex rounded-xl p-1 shrink-0 ${
                  isDark
                    ? "bg-[#0d0e12] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-zinc-100/90"
                }`}
              >
                {themeOptions.map((opt) => {
                  const active = settings.theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("theme", opt.id)}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-[12px] text-center transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#23252f] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-zinc-900 font-medium shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Size */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">Text size</div>
                <div
                  className={`text-[11.5px] mt-0.5 ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                  }`}
                >
                  Adjust chat density and card typography scale
                </div>
              </div>
              <div
                className={`grid grid-cols-3 sm:inline-flex rounded-xl p-1 shrink-0 ${
                  isDark
                    ? "bg-[#0d0e12] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-zinc-100/90"
                }`}
              >
                {fontSizeOptions.map((opt) => {
                  const active = settings.fontSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("fontSize", opt.id)}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-[12px] text-center transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#23252f] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-zinc-900 font-medium shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Response Mode */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">SARA mode</div>
                <div
                  className={`text-[11.5px] mt-0.5 ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                  }`}
                >
                  Balance between instant summaries and deep analysis
                </div>
              </div>
              <div
                className={`grid grid-cols-3 sm:inline-flex rounded-xl p-1 shrink-0 ${
                  isDark
                    ? "bg-[#0d0e12] ring-1 ring-white/[0.06]"
                    : isIvory
                      ? "bg-[#f3ede1]"
                      : "bg-zinc-100/90"
                }`}
              >
                {responseStyleOptions.map((opt) => {
                  const active = settings.responseStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField("responseStyle", opt.id)}
                      className={`px-3.5 py-1.5 sm:py-1 rounded-lg text-[12px] text-center transition-all duration-150 cursor-pointer focus:outline-none ${
                        isDark
                          ? active
                            ? "bg-[#23252f] text-white font-medium shadow-xs"
                            : "text-[#8e8ea0] hover:text-white"
                          : active
                            ? "bg-white text-zinc-900 font-medium shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900"
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
                  <div className="min-w-0 pr-2">
                    <div className="text-[13.5px] font-medium">
                      {item.label}
                    </div>
                    <div
                      className={`text-[11.5px] mt-0.5 leading-snug ${
                        isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>

                  {renderSwitch(isChecked)}
                </div>
              );
            })}

            {/* Progressive Web App (PWA) Installation Row */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <div className="text-[13.5px] font-medium">
                  Install app (PWA)
                </div>
                <div
                  className={`text-[11.5px] mt-0.5 leading-snug ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                  }`}
                >
                  {isPwaInstalled
                    ? "SARA is installed and running as a standalone app"
                    : "Install GT Assistant SARA on your desktop or mobile home screen"}
                </div>
              </div>

              {isPwaInstalled ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium shrink-0 select-none ${
                    isDark
                      ? "bg-[#1e2029]/60 text-[#8e8ea0] ring-1 ring-white/[0.06]"
                      : isIvory
                        ? "bg-[#f3ede1]/70 text-[#78716c]"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Installed</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer shrink-0 focus:outline-none ${
                    isDark
                      ? "bg-[#f4f4f5] hover:bg-white text-[#090a0d] shadow-xs"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>Install app</span>
                </button>
              )}
            </div>

            {/* Reset Preferences Row */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <div className="text-[13.5px] font-medium">
                  Reset preferences
                </div>
                <div
                  className={`text-[11.5px] mt-0.5 leading-snug ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
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
                    ? "bg-[#1e2029] hover:bg-[#282a36] text-[#e4e4e7] hover:text-white ring-1 ring-white/[0.08]"
                    : isIvory
                      ? "bg-[#f3ede1] hover:bg-[#eae1d0] text-[#1c1917]"
                      : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 hover:text-zinc-900"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Module CRUD Permissions */}
        {activeTab === "permissions" && (
          <div
            className={`px-5 sm:px-6 divide-y flex-1 overflow-y-auto overscroll-contain ${
              isDark
                ? "divide-white/[0.055]"
                : isIvory
                  ? "divide-[#e6decb]/70"
                  : "divide-zinc-100"
            }`}
          >
            {/* Master CRUD Overview & Bulk Actions */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium">
                    Module write access
                  </span>
                  <span
                    className={`text-[11.5px] ${
                      isDark ? "text-[#8e8ea0]" : "text-zinc-400"
                    }`}
                  >
                    ({enabledModulesCount} of {CRUD_MODULE_DEFINITIONS.length} active)
                  </span>
                </div>
                <div
                  className={`text-[11.5px] mt-0.5 leading-snug ${
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                  }`}
                >
                  Disabled modules remain readable in chat without write actions
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllModulePermissions(true)}
                  className={`px-3 py-1.5 rounded-xl text-[11.5px] font-medium transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#1e2029] hover:bg-[#282a36] text-[#e4e4e7] ring-1 ring-white/[0.07]"
                      : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800"
                  }`}
                >
                  Allow all
                </button>
                <button
                  type="button"
                  onClick={() => setAllModulePermissions(false)}
                  className={`px-3 py-1.5 rounded-xl text-[11.5px] font-medium transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#1e2029] hover:bg-[#282a36] text-[#8e8ea0] hover:text-white ring-1 ring-white/[0.07]"
                      : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-900"
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
                  className="py-3.5 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none focus:outline-none group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-[13.5px] font-medium">
                      {mod.label}
                    </div>
                    <div
                      className={`text-[11.5px] mt-0.5 leading-snug ${
                        isDark ? "text-[#8e8ea0]" : "text-zinc-500"
                      }`}
                    >
                      {mod.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11.5px] font-medium ${
                        isAllowed
                          ? isDark
                            ? "text-zinc-200"
                            : "text-zinc-800"
                          : isDark
                            ? "text-[#8e8ea0]"
                            : "text-zinc-400"
                      }`}
                    >
                      {isAllowed ? "Full CRUD" : "Read-only"}
                    </span>
                    {renderSwitch(isAllowed)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Bottom Account & Log Out Footer */}
        {currentUser && (
          <div
            className={`px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-t shrink-0 ${
              isDark
                ? "border-white/[0.06] bg-[#101116]"
                : isIvory
                  ? "border-[#e6decb] bg-[#f7f2e7]/60"
                  : "border-zinc-100 bg-zinc-50/70"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 bg-zinc-200 dark:bg-[#23252f] ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
                {userAvatarUrl && !avatarError ? (
                  <img
                    src={userAvatarUrl}
                    alt={currentUser.fullName}
                    onError={() => setAvatarError(true)}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-700 dark:text-[#e4e4e7]">
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
                    isDark ? "text-[#8e8ea0]" : "text-zinc-500"
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
                    ? "bg-[#1e2029] hover:bg-rose-500/20 text-[#f4f4f5] hover:text-rose-300 ring-1 ring-white/[0.08]"
                    : "bg-white hover:bg-rose-50 text-zinc-700 hover:text-rose-600 ring-1 ring-zinc-200/80"
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
