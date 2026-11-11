"use client";

import React, { useState, useEffect } from "react";
import { ChatMessage, ChatAttachment, EmailDraftData, AuthUser } from "../types/gt-operations";
import { ChatArea } from "../components/ChatArea";
import { ChatInput } from "../components/ChatInput";
import {
  SaraSettingsModal,
  SaraSettings,
  DEFAULT_SARA_SETTINGS,
} from "../components/SaraSettingsModal";
import SaraLoginScreen from "../components/SaraLoginScreen";
import EmailComposerModal from "../components/modals/EmailComposerModal";
import { Plus, Download, Check, Settings } from "lucide-react";
import { ProductZoomProvider } from "../context/ProductZoomContext";
import { saraSound } from "../lib/sara-sound";

const SETTINGS_STORAGE_KEY = "sara_assistant_settings_v2";
const AUTH_STORAGE_KEY = "sara_auth_user_v1";

export default function Home() {
  const initialBotMessage: ChatMessage = {
    id: "welcome-msg",
    role: "assistant",
    timestamp: "Live Now",
    departmentTag: "all",
    content: `Hi, I'm **SARA**, your operations assistant at GoldTouch Dealer Supply.

I can help you check on customer orders, track shipments, look up dealership accounts, review invoices, check purchase orders, or browse our automotive supply and corporate apparel catalogs. What can I help you find today?`,
    suggestedFollowUps: [],
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SaraSettings>(DEFAULT_SARA_SETTINGS);

  // Authentication & Mailbox Composer state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeEmailDraft, setActiveEmailDraft] = useState<EmailDraftData | null>(null);
  const [activeEmailMsgId, setActiveEmailMsgId] = useState<string | null>(null);

  // PWA Service Worker & Install Prompt State
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsPwaInstalled(Boolean(standalone));
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPwaPrompt(null);
      showToast("GT Assistant SARA installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPwaPrompt && typeof deferredPwaPrompt.prompt === "function") {
      try {
        await deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setIsPwaInstalled(true);
          setDeferredPwaPrompt(null);
        }
      } catch {}
      return;
    }
    showToast("Use your browser menu → 'Install app' or 'Add to Home Screen'");
  };

  // Load saved settings & authenticated user from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.email) {
          setCurrentUser(parsedUser);
          // Refresh user profile & real Gmail/Supabase avatar in background
          fetch(`/api/auth/login?email=${encodeURIComponent(parsedUser.email)}`)
            .then((r) => r.json())
            .then((res) => {
              if (res?.user) {
                setCurrentUser(res.user);
                try {
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.user));
                } catch {}
              }
            })
            .catch(() => {});
        }
      }
    } catch {} finally {
      setAuthHydrated(true);
    }
  }, []);

  // Apply theme and font-size attributes to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    const applyTheme = () => {
      let resolvedTheme = settings.theme;
      if (resolvedTheme === "system") {
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        resolvedTheme = prefersDark ? "dark" : "light";
      }
      root.setAttribute("data-theme", resolvedTheme);
      root.classList.toggle("dark", resolvedTheme === "dark");
    };

    applyTheme();
    root.setAttribute("data-font-size", settings.fontSize || "standard");
    root.setAttribute("data-response-style", settings.responseStyle || "balanced");

    if (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme();
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [settings.theme, settings.fontSize, settings.responseStyle]);

  // Global keyboard shortcuts (Ctrl/Cmd + , for Settings, Ctrl/Cmd + Shift + O for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setMessages([
          {
            ...initialBotMessage,
            id: `welcome-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        showToast("Started a new conversation");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUpdateSettings = (next: SaraSettings) => {
    const prevStyle = settings.responseStyle;
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    if (next.responseStyle !== prevStyle) {
      const modeName =
        next.responseStyle === "concise"
          ? "SARA Fast"
          : next.responseStyle === "detailed"
          ? "SARA Pro"
          : "SARA Auto";
      showToast(`Switched to ${modeName}`);
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser && !isLoading) {
        handleSendMessage(lastUser.content, lastUser.attachment, next.responseStyle, true);
      }
    }
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SARA_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SARA_SETTINGS));
    } catch {}
    showToast("Settings restored to defaults");
  };

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSendMessage = async (
    text: string,
    attachment?: ChatAttachment,
    overrideStyle?: SaraSettings["responseStyle"],
    replaceLastBotMsg?: boolean
  ) => {
    const activeStyle = overrideStyle || settings.responseStyle;
    const soundEnabled = settings.typingSound !== false;
    const requestStartTime = Date.now();

    if (soundEnabled) {
      saraSound.playSendSound();
      saraSound.startTypingLoop();
    }

    let baseMessages = messages;
    if (replaceLastBotMsg) {
      const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf("user");
      if (lastUserIdx !== -1) {
        baseMessages = messages.slice(0, lastUserIdx + 1);
        setMessages(baseMessages);
      }
    } else {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        departmentTag: settings.defaultDepartment || "all",
        attachment,
      };
      baseMessages = [...messages, userMsg];
      setMessages(baseMessages);
    }

    setIsLoading(true);

    try {
      const historySource = replaceLastBotMsg
        ? baseMessages.slice(0, -1)
        : messages;
      const historyPayload = historySource
        .filter((m) => m.id !== "welcome-msg" && !m.id.startsWith("welcome-"))
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const requestBody = JSON.stringify({
        query: text,
        history: historyPayload,
        activeDept: settings.defaultDepartment || "all",
        responseStyle: activeStyle,
        enableLiveCrud: settings.enableLiveCrud !== false,
        crudPermissions: settings.crudPermissions,
        attachment,
        currentUser,
      });

      let data: any = null;
      let lastFetchErr: any = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);
          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: requestBody,
              signal: controller.signal,
            });
            if (!res.ok) {
              throw new Error(`Server returned HTTP ${res.status}`);
            }
            data = await res.json();
            lastFetchErr = null;
            break;
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (fetchErr: any) {
          lastFetchErr = fetchErr;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (!data) {
        throw lastFetchErr || new Error("Request timed out");
      }

      // Brief natural thinking cadence (260ms minimum) so fast-path queries transition smoothly into text streaming
      if (soundEnabled) {
        const elapsed = Date.now() - requestStartTime;
        if (elapsed < 260) {
          await new Promise((resolve) => setTimeout(resolve, 260 - elapsed));
        }
      }

      const botMsgId = `bot-${Date.now()}`;
      const botContent = data.content || "I retrieved the requested records.";
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: "assistant",
        content: botContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        departmentTag: data.departmentTag || "all",
        structuredCard: data.structuredCard,
        suggestedFollowUps: [],
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically pop up the Mailbox Composer Modal when SARA prepares an email draft
      if (data.structuredCard?.type === "email_draft" && data.structuredCard.data) {
        setActiveEmailDraft(data.structuredCard.data);
        setActiveEmailMsgId(botMsgId);
        setIsEmailModalOpen(true);
      }
    } catch (err: any) {
      console.warn("[SARA] Handled query fallback:", err?.message || err);
      saraSound.stopTypingLoop(false);
      const errorBotMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        content:
          "I apologize, I experienced a momentary delay pulling those records from the system. Could you please ask that again or let me know which order or invoice you'd like me to look up?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        departmentTag: "all",
        suggestedFollowUps: [],
      };
      setMessages((prev) => [...prev, errorBotMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        ...initialBotMessage,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    showToast("Started a new conversation");
  };

  const handleExportTranscript = () => {
    const transcript = messages
      .map((m) => {
        const attachStr = m.attachment ? ` [Attached: ${m.attachment.name}]` : "";
        return `**${m.role === "user" ? "User" : "SARA"}** (${m.timestamp})${attachStr}:\n${m.content}\n`;
      })
      .join("\n---\n\n");

    navigator.clipboard.writeText(transcript);
    showToast("Chat transcript copied to clipboard");
  };

  const hasConversation = messages.some((m) => !m.id.startsWith("welcome"));

  const handleAuthenticated = (user: AuthUser) => {
    setAvatarLoadError(false);
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {}
    showToast(`Signed in as ${user.fullName}`);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
    showToast("Signed out of SARA Assistant");
  };

  const handleOpenEmailComposer = (draft?: EmailDraftData, msgId?: string) => {
    setActiveEmailDraft(
      draft || {
        to_email: "",
        to_name: "",
        subject: "",
        body: "",
        sender_name: currentUser?.fullName || "GoldTouch Operations",
        sender_email: currentUser?.email,
        status: "draft",
      }
    );
    setActiveEmailMsgId(msgId || null);
    setIsEmailModalOpen(true);
  };

  const handleDraftUpdated = (updated: EmailDraftData) => {
    setActiveEmailDraft(updated);
    if (activeEmailMsgId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeEmailMsgId && m.structuredCard?.type === "email_draft"
            ? {
                ...m,
                structuredCard: {
                  type: "email_draft",
                  data: updated,
                },
              }
            : m
        )
      );
    }
  };

  if (authHydrated && !currentUser) {
    const resolvedTheme: "dark" | "light" =
      settings.theme === "dark" ? "dark" : "light";
    return (
      <SaraLoginScreen
        onAuthenticated={handleAuthenticated}
        theme={resolvedTheme}
        onToggleTheme={() =>
          handleUpdateSettings({
            ...settings,
            theme: resolvedTheme === "dark" ? "light" : "dark",
          })
        }
      />
    );
  }

  const cleanEmail = (currentUser?.email || "").trim().toLowerCase();
  const userAvatarUrl =
    !cleanEmail || cleanEmail === "sadigulx05@gmail.com"
      ? "/saad-avatar.jpg"
      : currentUser?.avatar_url && !currentUser.avatar_url.includes("dicebear.com")
        ? currentUser.avatar_url
        : `/api/auth/avatar?email=${encodeURIComponent(cleanEmail)}`;

  return (
    <ProductZoomProvider>
      <div className="sara-app-canvas relative flex h-[100dvh] min-h-[100dvh] w-full max-w-full overflow-hidden flex-col bg-[#fcfcfd] dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        {/* Top Bar — Always visible on mobile/tablet (<1280px) to house Profile & Settings without overlapping chat; visible on desktop when a conversation is active */}
        <header
          className={`${
            hasConversation ? "flex" : "flex xl:hidden"
          } h-13 sm:h-14 items-center justify-between bg-transparent px-3.5 sm:px-6 shrink-0 z-20 w-full [scrollbar-gutter:stable]`}
        >
          <div className="max-w-3xl w-full mx-auto flex items-center justify-between gap-2">
            {/* Mobile & Tablet Profile + Settings Pill (< 1280px) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="xl:hidden group flex items-center gap-2.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-[#14151a]/90 ring-1 ring-slate-900/[0.07] dark:ring-white/[0.08] hover:bg-slate-100/90 dark:hover:bg-[#1c1d24] text-slate-900 dark:text-[#f4f4f5] focus:outline-none transition-colors cursor-pointer select-none min-w-0 max-w-[210px] sm:max-w-[240px]"
              title="Open Settings & Account (Ctrl+,)"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden bg-[#cbd5e1] dark:bg-[#272830] shrink-0 flex items-center justify-center">
                {!avatarLoadError ? (
                  <img
                    key={userAvatarUrl}
                    src={userAvatarUrl}
                    alt={currentUser?.fullName || "Saad Hassan"}
                    onError={() => setAvatarLoadError(true)}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-[#e4e4e7]">
                    {(currentUser?.fullName || "SH")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[12.5px] font-medium tracking-[-0.01em] text-slate-800 dark:text-[#e4e4e7] truncate">
                {currentUser?.fullName || "Saad Hassan"}
              </span>
              <Settings className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-[#a1a1aa] stroke-[1.75]" />
            </button>

            <div className="hidden xl:block" />

            {/* Right-side Conversation Actions */}
            {hasConversation && (
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportTranscript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                  title="Copy entire chat transcript"
                >
                  <Download className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ring-1 ring-slate-900/[0.07] dark:ring-white/[0.08] bg-white dark:bg-[#18191e] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#22232a] hover:text-slate-950 dark:hover:text-white shadow-2xs transition-all cursor-pointer"
                  title="Start new conversation (Ctrl+Shift+O)"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 stroke-[2]" />
                  <span>New Chat</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Chat Canvas */}
        <main className="flex-1 overflow-hidden flex flex-col bg-transparent min-h-0 w-full max-w-full">
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            currentUser={currentUser}
            onOpenEmailComposer={(draft) => handleOpenEmailComposer(draft)}
            onQuickQuery={(q) => handleSendMessage(q)}
            onSendMessage={handleSendMessage}
            sendOnEnter={settings.sendOnEnter}
            showStructuredCards={settings.showStructuredCards}
            clickableEntityCodes={settings.clickableEntityCodes}
            showFollowUpChips={settings.showFollowUpChips === true}
            enableLiveCrud={settings.enableLiveCrud !== false}
            crudPermissions={settings.crudPermissions}
            typingSound={settings.typingSound !== false}
            fontSize={settings.fontSize}
            responseStyle={settings.responseStyle}
            onChangeResponseStyle={(style) => {
              handleUpdateSettings({ ...settings, responseStyle: style });
            }}
          />

          {/* Bottom Docked Input (Only rendered when a conversation is active) */}
          {(hasConversation || isLoading) && (
            <div className="shrink-0 w-full">
              <ChatInput
                variant="docked"
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                sendOnEnter={settings.sendOnEnter}
                responseStyle={settings.responseStyle}
                onChangeResponseStyle={(style) => {
                  handleUpdateSettings({ ...settings, responseStyle: style });
                }}
              />
            </div>
          )}
        </main>

        {/* Bottom-Left User Profile + Settings Bar (Wide Desktop >=1280px only so it never overlaps mobile/tablet chat input) */}
        <div className="hidden xl:block fixed bottom-3.5 left-4 z-30">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="group flex items-center justify-between gap-6 w-[216px] sm:w-[228px] px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-slate-100/80 dark:hover:bg-white/[0.05] text-slate-900 dark:text-[#f4f4f5] focus:outline-none transition-colors cursor-pointer select-none"
            title="Open Settings & Account (Ctrl+,)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-[#cbd5e1] dark:bg-[#272830] shrink-0 flex items-center justify-center">
                {!avatarLoadError ? (
                  <img
                    key={userAvatarUrl}
                    src={userAvatarUrl}
                    alt={currentUser?.fullName || "Saad Hassan"}
                    onError={() => setAvatarLoadError(true)}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-[#e4e4e7]">
                    {(currentUser?.fullName || "SH")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[13.5px] font-normal tracking-[-0.01em] text-slate-800 dark:text-[#e4e4e7] group-hover:text-slate-950 dark:group-hover:text-white truncate">
                {currentUser?.fullName || "Saad Hassan"}
              </span>
            </div>

            <Settings className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-[#a1a1aa] group-hover:text-slate-950 dark:group-hover:text-white stroke-[1.75] transition-colors" />
          </button>
        </div>

        {/* GoldTouch Mailbox Composer Popup Modal */}
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          initialDraft={activeEmailDraft}
          currentUser={currentUser}
          onClose={() => setIsEmailModalOpen(false)}
          onDraftUpdated={handleDraftUpdated}
        />

        {/* SARA Settings Modal (Includes Log Out & PWA Installation) */}
        <SaraSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSettings={handleResetSettings}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          userAvatarUrl={userAvatarUrl}
          onExportTranscript={handleExportTranscript}
          onClearChat={handleNewChat}
          canInstallPwa={Boolean(deferredPwaPrompt)}
          isPwaInstalled={isPwaInstalled}
          onInstallPwa={handleInstallPwa}
        />

        {/* Floating Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 whitespace-nowrap">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </ProductZoomProvider>
  );
}
