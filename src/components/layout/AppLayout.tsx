import { AppSidebar } from "./AppSidebar";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { FloatingTimer } from "@/components/FloatingTimer";
import { CommandPalette } from "@/components/CommandPalette";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarPosition } = useTheme();
  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", sidebarPosition === "right" && "flex-row-reverse")}>
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <FloatingTimer />
      <OnboardingTutorial />
      <CommandPalette />
    </div>
  );
}
