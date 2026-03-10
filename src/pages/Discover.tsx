import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Compass, Search, Loader2, UserPlus, UserCheck, BookOpen, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface DiscoverUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  stats?: { total_xp: number; current_streak: number };
}

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friends = new Set<string>();
      const pending = new Set<string>();
      (friendships || []).forEach((f: any) => {
        const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
        if (f.status === "accepted") friends.add(otherId);
        else pending.add(otherId);
      });
      setFriendIds(friends);
      setPendingIds(pending);

      // Fetch all users with stats
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .neq("id", user.id)
        .limit(100);

      const { data: stats } = await supabase
        .from("user_study_stats")
        .select("user_id, total_xp, current_streak");

      const statsMap = new Map((stats || []).map((s: any) => [s.user_id, s]));

      const enriched = (profiles || []).map((p: any) => ({
        ...p,
        stats: statsMap.get(p.id) || null,
      }));

      // Sort: users with stats first, then by XP
      enriched.sort((a: any, b: any) => {
        const aXp = a.stats?.total_xp || 0;
        const bXp = b.stats?.total_xp || 0;
        return bXp - aXp;
      });

      setUsers(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const sendRequest = async (friendId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: friendId,
      status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPendingIds((prev) => new Set(prev).add(friendId));
      toast({ title: "Friend request sent!" });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: friendId,
        type: "friend_request",
        title: "New Friend Request",
        body: `Someone wants to connect with you!`,
      } as any);
    }
  };

  const filtered = users.filter((u) =>
    (u.display_name || u.username).toLowerCase().includes(search.toLowerCase()) ||
    (u.bio || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Compass className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Discover Study Buddies
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          Find and connect with other students
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or bio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold">No users found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((u) => {
            const isFriend = friendIds.has(u.id);
            const isPending = pendingIds.has(u.id);
            return (
              <div
                key={u.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {(u.display_name || u.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                    {u.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.bio}</p>
                    )}
                    {u.stats && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-accent font-medium">
                          <BookOpen className="w-3 h-3" /> {u.stats.total_xp} XP
                        </span>
                        {u.stats.current_streak > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-chart-5 font-medium">
                            <Flame className="w-3 h-3" /> {u.stats.current_streak}d streak
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  {isFriend ? (
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" disabled>
                      <UserCheck className="w-3.5 h-3.5 text-success" /> Friends
                    </Button>
                  ) : isPending ? (
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" disabled>
                      Pending...
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => sendRequest(u.id)}>
                      <UserPlus className="w-3.5 h-3.5" /> Add Friend
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
