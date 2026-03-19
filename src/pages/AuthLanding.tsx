import { Link, Navigate } from "react-router-dom";
import { GraduationCap, Users, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthLanding() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient-primary">StudyConnect</h1>
          </div>
          <p className="text-muted-foreground text-sm">Connecting students and teachers for effective learning</p>
        </div>

        <div className="grid gap-4">
          <Link
            to="/auth/student"
            className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">I'm a Student</p>
              <p className="text-xs text-muted-foreground">Access courses, quizzes, and study tools</p>
            </div>
          </Link>

          <Link
            to="/auth/teacher"
            className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center group-hover:bg-accent transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">I'm a Teacher</p>
              <p className="text-xs text-muted-foreground">Create assignments, manage groups, approve students</p>
            </div>
          </Link>

          <Link
            to="/auth/admin"
            className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Admin Login</p>
              <p className="text-xs text-muted-foreground">Full system administration access</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
