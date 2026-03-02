import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  Layers,
  HelpCircle,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Monitor,
  BookOpen,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ONBOARDING_KEY = "novastudy_onboarding_complete";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/planner", icon: CalendarDays, label: "Planner" },
  { to: "/timer", icon: Timer, label: "Focus" },
  { to: "/flashcards", icon: Layers, label: "Cards" },
  { to: "/quiz", icon: HelpCircle, label: "Quiz" },
  { to: "/tutor", icon: MessageSquare, label: "Tutor" },
  { to: "/analytics", icon: BarChart3, label: "Stats" },
];

const modeOptions = [
  { value: "system" as const, icon: Monitor, label: "System" },
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
];

const colorOptions = [
  { value: "blue" as const, label: "Cyan Blue", swatch: "bg-[hsl(187,80%,52%)]" },
  { value: "green" as const, label: "Forest Green", swatch: "bg-[hsl(152,72%,48%)]" },
  { value: "red" as const, label: "Crimson Red", swatch: "bg-[hsl(0,78%,58%)]" },
  { value: "grey" as const, label: "Steel Grey", swatch: "bg-[hsl(220,15%,60%)]" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const { mode, setMode, colorTheme, setColorTheme } = useTheme();

  const replayTutorial = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-gradient-primary whitespace-nowrap">
              NovaStudy
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary glow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          {/* Settings button */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <button className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}>
                <Settings className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                {/* Appearance mode */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Sun className="w-4 h-4 text-muted-foreground" /> Appearance
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {modeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMode(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                          mode === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <opt.icon className="w-5 h-5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color theme */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" /> Color Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setColorTheme(opt.value)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all duration-200",
                          colorTheme === opt.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full shrink-0 ring-2 ring-border", opt.swatch)} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Replay tutorial */}
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={replayTutorial}
                    className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
                  >
                    <BookOpen className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <p>Replay Tutorial</p>
                      <p className="text-xs text-muted-foreground">Show the onboarding guide again</p>
                    </div>
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {[...navItems, { to: "#settings", icon: Settings, label: "More" }].map((item) => {
            if (item.to === "#settings") {
              return (
                <button
                  key="settings"
                  onClick={() => setSettingsOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-0 text-sidebar-foreground"
                >
                  <Settings className="w-5 h-5" />
                  <span className="truncate">More</span>
                </button>
              );
            }
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-0",
                  isActive ? "text-primary" : "text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
