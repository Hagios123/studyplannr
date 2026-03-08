import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Conversation {
  friendId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get all private messages involving the user
      const { data: msgs } = await supabase
        .from("private_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!msgs || msgs.length === 0) { setLoading(false); return; }

      // Group by conversation partner
      const convMap = new Map<string, { lastMessage: string; lastAt: string; unread: number }>();
      for (const m of msgs as any[]) {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, { lastMessage: m.content, lastAt: m.created_at, unread: 0 });
        }
        if (m.receiver_id === user.id && !m.read) {
          const c = convMap.get(otherId)!;
          c.unread++;
        }
      }

      // Fetch profiles
      const ids = Array.from(convMap.keys());
      const { data: profiles } = await supabase.from("profiles")
        .select("id, username, display_name, avatar_url").in("id", ids);

      const convos: Conversation[] = ids.map((id) => {
        const p = (profiles || []).find((pr: any) => pr.id === id) as any;
        const c = convMap.get(id)!;
        return {
          friendId: id,
          username: p?.username || "User",
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          lastMessage: c.lastMessage,
          lastAt: c.lastAt,
          unread: c.unread,
        };
      });

      // Also add accepted friends with no messages
      const { data: friendships } = await supabase.from("friendships")
        .select("*").eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      if (friendships) {
        const friendIds = friendships.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
          .filter((id: string) => !convMap.has(id));
        if (friendIds.length > 0) {
          const { data: friendProfs } = await supabase.from("profiles")
            .select("id, username, display_name, avatar_url").in("id", friendIds);
          for (const p of (friendProfs || []) as any[]) {
            convos.push({
              friendId: p.id,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              lastMessage: "",
              lastAt: "",
              unread: 0,
            });
          }
        }
      }

      setConversations(convos);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = conversations.filter((c) =>
    (c.display_name || c.username).toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Messages
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          {conversations.length} conversations
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold">No conversations</p>
          <p className="text-sm mt-1">Add friends and start chatting!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <button
              key={c.friendId}
              onClick={() => navigate(`/chat/${c.friendId}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {(c.display_name || c.username)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate">{c.display_name || c.username}</p>
                  {c.lastAt && <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.lastAt)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage || "No messages yet"}</p>
                  {c.unread > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
