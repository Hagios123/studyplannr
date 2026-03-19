import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Clock, Ban as BanIcon, LogOut } from "lucide-react";

import AuthLanding from "./pages/AuthLanding";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import Index from "./pages/Index";
import Planner from "./pages/Planner";
import Learn from "./pages/Learn";
import Tutor from "./pages/Tutor";
import Groups from "./pages/Groups";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import ChatList from "./pages/ChatList";
import GroupChat from "./pages/GroupChat";
import AdminPanel from "./pages/AdminPanel";
import Approvals from "./pages/Approvals";
import Assignments from "./pages/Assignments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PendingApproval() {
  const { signOut, role } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <Clock className="w-16 h-16 text-muted-foreground/40 mx-auto" />
        <h1 className="text-2xl font-bold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          {role === "teacher"
            ? "Your teacher account is waiting for admin approval."
            : "Your account is waiting for approval from a teacher or admin."}
        </p>
        <Button variant="outline" onClick={signOut} className="gap-2"><LogOut className="w-4 h-4" /> Sign Out</Button>
      </div>
    </div>
  );
}

function BannedScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <BanIcon className="w-16 h-16 text-destructive/40 mx-auto" />
        <h1 className="text-2xl font-bold">Account Suspended</h1>
        <p className="text-muted-foreground">Your account has been suspended. Please contact an administrator.</p>
        <Button variant="outline" onClick={signOut} className="gap-2"><LogOut className="w-4 h-4" /> Sign Out</Button>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading, profile, role } = useAuth();

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
  if (profile?.approval_status === "banned") return <BannedScreen />;
  if (profile?.approval_status === "pending" || profile?.approval_status === "rejected") return <PendingApproval />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<ChatList />} />
        <Route path="/chat/:recipientId" element={<Chat />} />
        <Route path="/group-chat/:groupId" element={<GroupChat />} />
        <Route path="/assignments" element={<Assignments />} />
        {(role === "admin" || role === "teacher") && (
          <Route path="/approvals" element={<Approvals />} />
        )}
        {role === "admin" && (
          <Route path="/admin" element={<AdminPanel />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
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
              <Route path="/auth" element={<AuthLanding />} />
              <Route path="/auth/student" element={<Auth role="student" />} />
              <Route path="/auth/teacher" element={<Auth role="teacher" />} />
              <Route path="/auth/admin" element={<AdminAuth />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
