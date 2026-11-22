import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PlayerProvider } from "./context/PlayerContext";
import BrandHeader from "./components/BrandHeader";
import CustomTabBar from "./components/CustomTabBar";
import MiniPlayer from "./components/MiniPlayer";
import { api } from "./config/api";

// Screens
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import SearchScreen from "./screens/SearchScreen";
import AccountsScreen from "./screens/AccountsScreen";
import TimelineScreen from "./screens/TimelineScreen";
import StatsScreen from "./screens/StatsScreen";

function MainApp() {
  const { isLoggedIn } = useAuth();
  const [authView, setAuthView] = useState("login"); // "login" | "register"
  const [activeTab, setActiveTab] = useState("home"); // "home" | "timeline" | "search" | "stats" | "accounts"
  const [searchInitialQuery, setSearchInitialQuery] = useState("");
  const [timelineSelectedDay, setTimelineSelectedDay] = useState(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth screen display
  if (!isLoggedIn) {
    if (authView === "register") {
      return <RegisterScreen onNavigateLogin={() => setAuthView("login")} />;
    }
    return <LoginScreen onNavigateRegister={() => setAuthView("register")} />;
  }

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      await api.triggerSync(null, false);
      setTimeout(() => {
        setIsSyncing(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const handleNavigateSearchWithQuery = (query) => {
    setSearchInitialQuery(query);
    setActiveTab("search");
  };

  const handleNavigateTimelineWithDay = (day) => {
    setTimelineSelectedDay(day);
    setActiveTab("timeline");
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col transition-colors duration-200">
      {/* Brand Header */}
      <BrandHeader onSyncClick={handleGlobalSync} isSyncing={isSyncing} />

      {/* Main Content Pages */}
      <main className="flex-1">
        {activeTab === "home" && (
          <HomeScreen
            onNavigateSearch={handleNavigateSearchWithQuery}
            onNavigateTimeline={handleNavigateTimelineWithDay}
            onNavigateAccounts={() => setActiveTab("accounts")}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineScreen
            selectedDay={timelineSelectedDay}
          />
        )}

        {activeTab === "search" && (
          <SearchScreen
            initialQuery={searchInitialQuery}
          />
        )}

        {activeTab === "stats" && <StatsScreen />}

        {activeTab === "accounts" && <AccountsScreen />}
      </main>

      {/* Floating MiniPlayer when browsing non-home screens */}
      {activeTab !== "home" && (
        <MiniPlayer onExpandHome={() => setActiveTab("home")} />
      )}

      {/* Floating Bottom Tab Bar */}
      <CustomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <MainApp />
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
