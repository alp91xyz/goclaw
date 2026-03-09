import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Menu, LogOut, Bell, Globe } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/use-ui-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { useIsMobile } from "@/hooks/use-media-query";
import { usePendingPairingsCount } from "@/hooks/use-pending-pairings-count";
import { ROUTES, SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type Language } from "@/lib/constants";

export function Topbar() {
  const { t } = useTranslation("topbar");
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const userId = useAuthStore((s) => s.userId);
  const logout = useAuthStore((s) => s.logout);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pendingCount } = usePendingPairingsCount({ showToast: true });

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleSidebarToggle = isMobile
    ? () => setMobileSidebarOpen(true)
    : toggleSidebar;

  const cycleLanguage = () => {
    const idx = SUPPORTED_LANGUAGES.indexOf(language);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length] as Language;
    setLanguage(next);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleSidebarToggle}
          className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={isMobile ? t("openMenu") : sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          {isMobile ? (
            <Menu className="h-4 w-4" />
          ) : sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {userId && !isMobile && (
          <span className="text-xs text-muted-foreground">{userId}</span>
        )}

        <button
          onClick={() => navigate(ROUTES.NODES)}
          className="relative cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={pendingCount > 0 ? t("pendingPairing", { count: pendingCount }) : t("pairingRequests")}
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>

        <button
          onClick={cycleLanguage}
          className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-1"
          title={t("language")}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs">{LANGUAGE_LABELS[language]}</span>
        </button>

        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={t("toggleTheme")}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={logout}
          className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={t("logout")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
