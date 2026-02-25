import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Planner from "./pages/Planner";
import FocusTimer from "./pages/FocusTimer";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Tutor from "./pages/Tutor";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/timer" element={<FocusTimer />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
