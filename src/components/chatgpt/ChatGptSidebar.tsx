"use client";

import React, { useState } from "react";
import {
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  Search,
  MessageSquare,
  Sparkles,
  Compass,
  MoreHorizontal,
  LogOut,
  Settings,
  ChevronDown,
  Trash2,
  Share2,
  Edit2,
  Building2,
  FileText,
  Package,
  Factory
} from "lucide-react";

interface ChatGptSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectPrompt: (prompt: string) => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const ChatGptSidebar: React.FC<ChatGptSidebarProps> = ({
  isOpen,
  onToggle,
  onNewChat,
  onSelectPrompt,
  userEmail = "sadigulx05@gmail.com",
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const historyToday = [
    { id: "1", title: "Lancashire Line A Batch 9941 Status", prompt: "What is the operational status of the Lancashire site today?" },
    { id: "2", title: "Bentley Bespoke Overdue Invoice", prompt: "Show me all overdue invoices and outstanding balances" },
    { id: "3", title: "Raw Material PO GT-PO-2026-8941", prompt: "Check our purchasing orders for raw materials and chemicals" }
  ];

  const historyYesterday = [
    { id: "4", title: "Aston Martin CRM Deal Scope", prompt: "Who are our top CRM prospects closing this quarter?" },
    { id: "5", title: "Lancashire Central Storage Audit", prompt: "Check inventory levels in the Lancashire warehouse and vaults" }
  ];

  const historyPrevious = [
    { id: "6", title: "Rolls-Royce Treadplates Invoicing", prompt: "What did we bill Rolls-Royce Bespoke Coachbuild?" },
    { id: "7", title: "Chemical cyanide supply chain ETA", prompt: "Trace chemical suppliers for Gold Potassium Cyanide" }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col h-full bg-[#171717] text-[#ececec] border-r border-[#262626] transition-all duration-300 ease-in-out ${
          isOpen ? "w-[260px] translate-x-0" : "-translate-x-full md:w-0 md:translate-x-0 md:border-none overflow-hidden"
        }`}
      >
        <div className="flex flex-col h-full w-[260px]">
          {/* Top Bar with New Chat & Collapse */}
          <div className="flex items-center justify-between p-3">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#212121] transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            <button
              onClick={onNewChat}
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#212121] transition-colors"
              title="New chat"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Pill Button */}
          <div className="px-3 pb-2">
            <button
              onClick={onNewChat}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#ececec] hover:bg-[#212121] transition-colors group text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white p-0.5 transition-colors">
                <img
                  src="/logo.png"
                  alt="GoldTouch"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-medium text-sm">New chat</span>
            </button>
          </div>

          {/* Quick Shortcuts / Explore GPTs */}
          <div className="px-3 py-1 space-y-0.5 border-b border-[#262626] pb-3">
            <button
              onClick={() => onSelectPrompt("Give me a complete executive overview of GoldTouch operations")}
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#b4b4b4] hover:text-white hover:bg-[#212121] transition-colors text-left"
            >
              <img
                src="/logo.png"
                alt="GoldTouch"
                className="h-5 w-auto object-contain shrink-0"
              />
              <span className="truncate">Operations AI</span>
            </button>
          </div>

          {/* Conversation History List */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs">
            {/* Today */}
            <div>
              <div className="px-3 pb-1 text-[11px] font-semibold text-[#8e8e8e]">Today</div>
              <div className="space-y-0.5">
                {historyToday.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectPrompt(item.prompt)}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs text-[#ececec] hover:bg-[#212121] group transition-colors text-left"
                  >
                    <span className="truncate pr-2">{item.title}</span>
                    <MoreHorizontal className="w-3.5 h-3.5 text-transparent group-hover:text-[#8e8e8e] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Yesterday */}
            <div>
              <div className="px-3 pb-1 text-[11px] font-semibold text-[#8e8e8e]">Yesterday</div>
              <div className="space-y-0.5">
                {historyYesterday.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectPrompt(item.prompt)}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs text-[#ececec] hover:bg-[#212121] group transition-colors text-left"
                  >
                    <span className="truncate pr-2">{item.title}</span>
                    <MoreHorizontal className="w-3.5 h-3.5 text-transparent group-hover:text-[#8e8e8e] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Previous 7 Days */}
            <div>
              <div className="px-3 pb-1 text-[11px] font-semibold text-[#8e8e8e]">Previous 7 Days</div>
              <div className="space-y-0.5">
                {historyPrevious.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectPrompt(item.prompt)}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs text-[#ececec] hover:bg-[#212121] group transition-colors text-left"
                  >
                    <span className="truncate pr-2">{item.title}</span>
                    <MoreHorizontal className="w-3.5 h-3.5 text-transparent group-hover:text-[#8e8e8e] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile Pill at Bottom (ChatGPT standard) */}
          <div className="p-3 border-t border-[#262626] relative">
            {showUserMenu && (
              <div className="absolute bottom-16 left-3 right-3 rounded-xl bg-[#212121] border border-[#2f2f2f] p-1.5 space-y-1 z-30 animate-in fade-in">
                <div className="px-3 py-2 border-b border-[#2f2f2f] text-xs">
                  <div className="font-semibold text-white">{userEmail}</div>
                  <div className="text-[10px] text-[#8e8e8e]">Operations Director (Enterprise)</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSelectPrompt("What is the status of the Lancashire site today?");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#ececec] hover:bg-[#2f2f2f] transition-colors"
                >
                  <Factory className="w-3.5 h-3.5 text-[#8e8e8e]" />
                  <span>Lancashire Site Telemetry</span>
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-[#2f2f2f] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center justify-between p-2 rounded-lg hover:bg-[#212121] transition-colors group text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Sadi Gul</div>
                  <div className="text-[10px] text-[#8e8e8e] truncate">{userEmail}</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#8e8e8e] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
