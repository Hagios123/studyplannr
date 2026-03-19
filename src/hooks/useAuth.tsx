import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "teacher" | "student" | null;

interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: {
    username: string;
    display_name: string | null;
    bio?: string;
    avatar_url?: string | null;
    approval_status?: string;
    year_level?: string | null;
    studying?: string | null;
  } | null;
  role: UserRole;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  role: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContext["profile"]>(null);
  const [role, setRole] = useState<UserRole>(null);

  const fetchProfileAndRole = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url, approval_status, year_level, studying")
      .eq("id", userId)
      .single();
    if (profileData) setProfile(profileData as any);

    const { data: roleData } = await (supabase.rpc as any)("get_user_role", { _user_id: userId });
    setRole((roleData as UserRole) || "student");
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfileAndRole(session.user.id).then(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, loading, profile, role, refreshProfile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
