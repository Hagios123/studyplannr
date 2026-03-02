import { AppSidebar } from "./AppSidebar";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <OnboardingTutorial />
    </div>
  );
}
