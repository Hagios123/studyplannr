import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Send, ChevronLeft, Loader2, MessageCircle, Hash, Plus, BookOpen, Link2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  channel: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface GroupRow {
  id: string;
  name: string;
  color: string;
  description: string;
}

const DEFAULT_CHANNELS = [
  { name: "general", icon: MessageCircle, label: "General" },
  { name: "notes", icon: FileText, label: "Notes" },
  { name: "links", icon: Link2, label: "Links & Resources" },
  { name: "study", icon: BookOpen, label: "Study Discussion" },
];

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [channel, setChannel] = useState("general");
  const [customChannels, setCustomChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);

  const allChannels = [
    ...DEFAULT_CHANNELS,
    ...customChannels.map((c) => ({ name: c, icon: Hash, label: c })),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(200);

    const msgs = (data || []) as Message[];
    setMessages(msgs);

    // Fetch profiles
    const senderIds = new Set(msgs.map((m) => m.sender_id));
    if (senderIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", Array.from(senderIds));
      if (profs) {
        const map: Record<string, Profile> = { ...profiles };
        (profs as any[]).forEach((p) => { map[p.id] = p; });
        setProfiles(map);
      }
    }
  }, [groupId, channel]);

  useEffect(() => {
    if (!groupId) return;
    supabase.from("study_groups").select("*").eq("id", groupId).single()
      .then(({ data }) => { if (data) setGroup(data as any); });

    // Discover custom channels
    supabase
      .from("group_messages")
      .select("channel")
      .eq("group_id", groupId)
      .then(({ data }) => {
        if (data) {
          const defaultNames = DEFAULT_CHANNELS.map((c) => c.name);
          const customs = [...new Set((data as any[]).map((d) => d.channel).filter((c: string) => !defaultNames.includes(c)))];
          setCustomChannels(customs);
        }
      });
  }, [groupId]);

  useEffect(() => {
    fetchMessages().then(() => setLoading(false));
  }, [fetchMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!groupId) return;
    const sub = supabase
      .channel(`group-chat-${groupId}-${channel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.group_id === groupId && msg.channel === channel) {
            setMessages((prev) => [...prev, msg]);
            // Fetch sender profile if needed
            if (!profiles[msg.sender_id]) {
              supabase.from("profiles").select("id, username, display_name, avatar_url")
                .eq("id", msg.sender_id).single()
                .then(({ data }) => {
                  if (data) setProfiles((prev) => ({ ...prev, [msg.sender_id]: data as any }));
                });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [groupId, channel]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !groupId || sending) return;
    setSending(true);
    await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      content: newMessage.trim(),
      channel,
    });
    setNewMessage("");
    inputRef.current?.focus();
    setSending(false);
  };

  const handleAddChannel = () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name || allChannels.some((c) => c.name === name)) return;
    setCustomChannels((prev) => [...prev, name]);
    setChannel(name);
    setNewChannelName("");
    setChannelDialogOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
      {/* Channel sidebar */}
      <div className="w-[180px] border-r border-border shrink-0 flex flex-col overflow-hidden hidden md:flex">
        <div className="p-3 border-b border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => navigate("/groups")}>
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Groups
          </Button>
        </div>
        <div className="p-2 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            {group?.name || "Group"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {allChannels.map((ch) => (
            <button
              key={ch.name}
              onClick={() => setChannel(ch.name)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channel === ch.name
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <ch.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ch.label}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground">
                <Plus className="w-3.5 h-3.5" /> Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
              <DialogHeader><DialogTitle className="text-sm">New Channel</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="e.g. math, physics, exam-prep"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Create a subject-specific channel for focused discussion.</p>
                <Button onClick={handleAddChannel} disabled={!newChannelName.trim()} className="w-full" size="sm">
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="md:hidden shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="font-display font-semibold text-sm truncate">
            {allChannels.find((c) => c.name === channel)?.label || channel}
          </p>
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
            {group?.name}
          </span>
        </div>

        {/* Mobile channel selector */}
        <div className="md:hidden flex gap-1 p-2 overflow-x-auto border-b border-border">
          {allChannels.map((ch) => (
            <button
              key={ch.name}
              onClick={() => setChannel(ch.name)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                channel === ch.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <ch.icon className="w-3 h-3" />
              {ch.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Hash className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages in #{allChannels.find((c) => c.name === channel)?.label || channel}</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const sender = profiles[msg.sender_id];
              const isMine = msg.sender_id === user?.id;
              const showAvatar = i === 0 || messages[i - 1]?.sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={`flex gap-2.5 ${!showAvatar ? "pl-[38px]" : ""}`}>
                  {showAvatar && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary">
                          {(sender?.display_name || sender?.username || "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${isMine ? "text-primary" : "text-foreground"}`}>
                          {sender?.display_name || sender?.username || "User"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3 border-t border-border shrink-0">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Message #${allChannels.find((c) => c.name === channel)?.label || channel}...`}
            className="flex-1"
            autoFocus
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
