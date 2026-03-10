import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationStore } from "@/stores/useGamificationStore";
import { Trophy, Medal, Crown, Flame, TrendingUp, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  total_study_minutes: number;
  tasks_completed: number;
  current_streak: number;
}

type Tab = "xp" | "hours" | "streak" | "tasks";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "xp", label: "XP", icon: Trophy },
  { key: "hours", label: "Hours", icon: TrendingUp },
  { key: "streak", label: "Streak", icon: Flame },
  { key: "tasks", label: "Tasks", icon: Medal },
];

const RANK_ICONS = [Crown, Medal, Medal];
const RANK_COLORS = ["text-accent", "text-muted-foreground", "text-chart-5"];

export default function Leaderboard() {
  const { user } = useAuth();
  const { totalXP, getStreak, tasksCompleted } = useGamificationStore();
  const [tab, setTab] = useState<Tab>("xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync own stats to database
  useEffect(() => {
    if (!user) return;
    const syncStats = async () => {
      const stats = {
        user_id: user.id,
        total_xp: totalXP,
        current_streak: getStreak(),
        tasks_completed: tasksCompleted,
        updated_at: new Date().toISOString(),
      };
      // Upsert stats
      const { data: existing } = await supabase.from("user_study_stats").select("id").eq("user_id", user.id).single();
      if (existing) {
        await supabase.from("user_study_stats").update(stats as any).eq("user_id", user.id);
      } else {
        await supabase.from("user_study_stats").insert(stats as any);
      }
    };
    syncStats();
  }, [user, totalXP, tasksCompleted]);

  // Fetch leaderboard
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      // Get friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map((f: any) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );
      const allIds = [user.id, ...friendIds];

      // Get stats
      const { data: stats } = await supabase
        .from("user_study_stats")
        .select("*")
        .in("user_id", allIds);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", allIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const entries: LeaderboardEntry[] = allIds.map((id) => {
        const stat = (stats || []).find((s: any) => s.user_id === id) as any;
        const profile = profileMap.get(id) as any;
        return {
          user_id: id,
          username: profile?.username || "User",
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          total_xp: stat?.total_xp || 0,
          total_study_minutes: stat?.total_study_minutes || 0,
          tasks_completed: stat?.tasks_completed || 0,
          current_streak: stat?.current_streak || 0,
        };
      });

      setEntries(entries);
      setLoading(false);
    };
    load();
  }, [user]);

  const sorted = [...entries].sort((a, b) => {
    switch (tab) {
      case "xp": return b.total_xp - a.total_xp;
      case "hours": return b.total_study_minutes - a.total_study_minutes;
      case "streak": return b.current_streak - a.current_streak;
      case "tasks": return b.tasks_completed - a.tasks_completed;
    }
  });

  const getValue = (entry: LeaderboardEntry) => {
    switch (tab) {
      case "xp": return `${entry.total_xp} XP`;
      case "hours": return `${(entry.total_study_minutes / 60).toFixed(1)}h`;
      case "streak": return `${entry.current_streak}d`;
      case "tasks": return `${entry.tasks_completed}`;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" /> Leaderboard
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          Compete with your friends!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold">No data yet</p>
          <p className="text-sm mt-1">Add friends and start studying to see rankings!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {sorted.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {[1, 0, 2].map((rank) => {
                const entry = sorted[rank];
                if (!entry) return null;
                const isMe = entry.user_id === user?.id;
                const heights = ["h-28", "h-20", "h-16"];
                const sizes = ["w-16 h-16", "w-12 h-12", "w-12 h-12"];
                const textSizes = ["text-xl", "text-base", "text-base"];
                return (
                  <div key={rank} className="flex flex-col items-center gap-2">
                    <div className={`${sizes[rank]} rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border-2 ${isMe ? "border-primary" : "border-border"}`}>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className={`font-bold text-primary ${textSizes[rank]}`}>
                          {(entry.display_name || entry.username)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-semibold truncate max-w-20 ${isMe ? "text-primary" : ""}`}>
                        {isMe ? "You" : entry.display_name || entry.username}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">{getValue(entry)}</p>
                    </div>
                    <div className={`${heights[rank]} w-16 rounded-t-lg flex items-start justify-center pt-2 ${
                      rank === 0 ? "bg-accent/20 border border-accent/30" : "bg-secondary border border-border"
                    }`}>
                      {rank <= 2 && (() => {
                        const Icon = RANK_ICONS[rank];
                        return <Icon className={`w-5 h-5 ${RANK_COLORS[rank]}`} />;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="space-y-1">
            {sorted.map((entry, idx) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isMe ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className={`w-6 text-center font-display font-bold text-sm ${
                    idx === 0 ? "text-accent" : idx < 3 ? "text-muted-foreground" : "text-muted-foreground/50"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {(entry.display_name || entry.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                      {isMe ? "You" : entry.display_name || entry.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground">@{entry.username}</p>
                  </div>
                  <p className="text-sm font-display font-bold shrink-0">{getValue(entry)}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
