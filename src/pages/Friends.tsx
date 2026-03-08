import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  UserPlus, Users, Search, Check, X, Loader2, UserCheck, UserMinus,
  MessageCircle, Clock, Send, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

type Tab = "friends" | "received" | "sent";

export default function Friends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, FriendProfile>>({});
  const [loading, setLoading] = useState(true);

  const fetchFriendships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (data) {
      setFriendships(data as FriendshipRow[]);
      const ids = new Set<string>();
      data.forEach((f: FriendshipRow) => {
        if (f.user_id !== user.id) ids.add(f.user_id);
        if (f.friend_id !== user.id) ids.add(f.friend_id);
      });
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", Array.from(ids));
        if (profiles) {
          const map: Record<string, FriendProfile> = {};
          (profiles as any[]).forEach((p) => { map[p.id] = p; });
          setFriendProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchFriendships(); }, [user]);

  const handleSearch = async () => {
    if (!search.trim() || !user) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
      .neq("id", user.id)
      .limit(10);
    setSearchResults((data || []) as FriendProfile[]);
    setSearching(false);
  };

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
      toast({ title: "Friend request sent!" });
      fetchFriendships();
    }
  };

  const respondRequest = async (id: string, accept: boolean) => {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast({ title: "Friend request accepted!" });
    } else {
      await supabase.from("friendships").delete().eq("id", id);
      toast({ title: "Request declined" });
    }
    fetchFriendships();
  };

  const removeFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast({ title: "Friend removed" });
    fetchFriendships();
  };

  const incoming = friendships.filter((f) => f.friend_id === user?.id && f.status === "pending");
  const outgoing = friendships.filter((f) => f.user_id === user?.id && f.status === "pending");
  const accepted = friendships.filter((f) => f.status === "accepted");
  const existingIds = new Set(friendships.map((f) => f.user_id === user?.id ? f.friend_id : f.user_id));

  const Avatar = ({ profile, size = "w-9 h-9" }: { profile?: FriendProfile | null; size?: string }) => (
    <div className={`${size} rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0`}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-primary">
          {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
        </span>
      )}
    </div>
  );

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "friends", label: "Friends", icon: Users, count: accepted.length },
    { key: "received", label: "Received", icon: Inbox, count: incoming.length },
    { key: "sent", label: "Sent", icon: Send, count: outgoing.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Friends
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          {accepted.length} friends · Find study partners
        </p>
      </div>

      {/* Search users */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" /> Find Users
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-3">
                  <Avatar profile={p} size="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                </div>
                {existingIds.has(p.id) ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => sendRequest(p.id)} className="gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Friends tab */}
          {tab === "friends" && (
            accepted.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">No friends yet</p>
                <p className="text-sm mt-1">Search for users above to add friends.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accepted.map((f) => {
                  const otherId = f.user_id === user?.id ? f.friend_id : f.user_id;
                  const profile = friendProfiles[otherId];
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar profile={profile} />
                        <div>
                          <p className="text-sm font-medium">{profile?.display_name || profile?.username || "User"}</p>
                          <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/chat/${otherId}`)}
                          title="Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive w-8 h-8"
                          onClick={() => removeFriend(f.id)}
                          title="Remove"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Received tab */}
          {tab === "received" && (
            incoming.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">No pending requests</p>
                <p className="text-sm mt-1">When someone sends you a friend request, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incoming.map((f) => {
                  const profile = friendProfiles[f.user_id];
                  return (
                    <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-accent/30 bg-accent/5">
                      <div className="flex items-center gap-3">
                        <Avatar profile={profile} />
                        <div>
                          <p className="text-sm font-medium">{profile?.display_name || profile?.username || "User"}</p>
                          <p className="text-xs text-muted-foreground">@{profile?.username} · Wants to be your friend</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => respondRequest(f.id, true)}>
                          <Check className="w-3.5 h-3.5 text-success" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => respondRequest(f.id, false)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Sent tab */}
          {tab === "sent" && (
            outgoing.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">No sent requests</p>
                <p className="text-sm mt-1">Requests you send will appear here until accepted.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outgoing.map((f) => {
                  const profile = friendProfiles[f.friend_id];
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar profile={profile} size="w-8 h-8" />
                        <div>
                          <p className="text-sm font-medium">{profile?.display_name || profile?.username || "User"}</p>
                          <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => removeFriend(f.id)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
