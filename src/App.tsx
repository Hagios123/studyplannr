import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StudyNotificationProvider } from "@/components/StudyNotificationProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Planner from "./pages/Planner";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Tutor from "./pages/Tutor";
import Analytics from "./pages/Analytics";
import Notes from "./pages/Notes";
import Habits from "./pages/Habits";
import Resources from "./pages/Resources";
import Groups from "./pages/Groups";
import Auth from "./pages/Auth";
import Friends from "./pages/Friends";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/planner" element={<PageTransition><Planner /></PageTransition>} />
        <Route path="/flashcards" element={<PageTransition><Flashcards /></PageTransition>} />
        <Route path="/quiz" element={<PageTransition><Quiz /></PageTransition>} />
        <Route path="/tutor" element={<PageTransition><Tutor /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="/notes" element={<PageTransition><Notes /></PageTransition>} />
        <Route path="/habits" element={<PageTransition><Habits /></PageTransition>} />
        <Route path="/resources" element={<PageTransition><Resources /></PageTransition>} />
        <Route path="/groups" element={<PageTransition><Groups /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <StudyNotificationProvider>
      <AppLayout>
        <AnimatedRoutes />
      </AppLayout>
    </StudyNotificationProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
