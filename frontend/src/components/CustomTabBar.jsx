import React from "react";
import { Home, Calendar, Search, BarChart2, ShieldCheck } from "lucide-react";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "search", label: "Search", icon: Search },
  { id: "stats", label: "Stats", icon: BarChart2 },
  { id: "accounts", label: "Accounts", icon: ShieldCheck },
];

export default function CustomTabBar({ activeTab, onSelectTab }) {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  return (
    <nav
      className="fixed bottom-3 sm:bottom-6 left-0 right-0 z-50 flex justify-center px-2 sm:px-4 pointer-events-none"
      style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom, 4px))" }}
    >
      <div className="relative pointer-events-auto flex items-center p-1 sm:p-1.5 rounded-full liquid-glass border border-[var(--glass-border)] shadow-2xl backdrop-blur-2xl w-full max-w-[370px] sm:max-w-md">
        {/* Active sliding lens */}
        <div
          className="absolute top-1 bottom-1 sm:top-1.5 sm:bottom-1.5 rounded-full bg-[var(--primary)] shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
          style={{
            width: `calc((100% - 8px) / ${TABS.length})`,
            left: `calc(4px + ${activeIndex} * (100% - 8px) / ${TABS.length})`,
          }}
        />

        {/* Tab Buttons */}
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              type="button"
              className={`relative z-10 flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 sm:py-2 border-0 bg-transparent outline-none cursor-pointer rounded-full transition-all duration-200 ${
                isActive
                  ? "text-white font-semibold"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)] font-normal"
              }`}
            >
              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`}
              />
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
