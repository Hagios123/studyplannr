import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Send, ChevronLeft, Loader2, MessageCircle, Search, Smile, Paperclip,
  Reply, Trash2, Copy, Check, CheckCheck, X, Image as ImageIcon, File,
  ArrowDown, Pin, PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  reply_to: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  reactions: Record<string, string[]>;
  edited_at: string | null;
  pinned: boolean;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
}

const EMOJI_LIST = ["❤️", "😂", "👍", "🔥", "😮", "😢", "🎉", "💯"];
const QUICK_EMOJIS = ["😀", "😂", "😍", "🥺", "😎", "🤔", "👀", "💀", "🙏", "❤️", "🔥", "💯", "👍", "👎", "🎉", "✨", "😭", "🤣", "😊", "🥰", "😤", "😱", "🤯", "💪", "📚", "✅", "⭐", "🚀", "💡", "🧠"];

export default function Chat() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user || !recipientId) return;
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });
    setMessages((data || []) as unknown as Message[]);
    // Mark as read
    await supabase
      .from("private_messages")
      .update({ read: true })
      .eq("sender_id", recipientId)
      .eq("receiver_id", user.id)
      .eq("read", false);
  }, [user, recipientId]);

  // Fetch recipient profile
  useEffect(() => {
    if (!recipientId) return;
    supabase.from("profiles").select("id, username, display_name, avatar_url")
      .eq("id", recipientId).single()
      .then(({ data }) => { if (data) setRecipient(data as any); });
  }, [recipientId]);

  useEffect(() => { fetchMessages().then(() => setLoading(false)); }, [fetchMessages]);
  useEffect(() => { scrollToBottom(false); }, [messages.length]);

  // Scroll detection for "scroll to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Realtime messages (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!user || !recipientId) return;
    const channel = supabase
      .channel(`dm-${[user.id, recipientId].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" },
        (payload) => {
          const msg = payload.new as unknown as Message;
          if ((msg.sender_id === user.id && msg.receiver_id === recipientId) ||
              (msg.sender_id === recipientId && msg.receiver_id === user.id)) {
            setMessages((prev) => {
              // Remove any optimistic temp message and avoid duplicates
              const filtered = prev.filter((m) => m.id !== msg.id && !(m.id.startsWith("temp-") && m.sender_id === msg.sender_id && m.content === msg.content));
              return [...filtered, msg];
            });
            // Auto mark as read if from recipient
            if (msg.sender_id === recipientId) {
              supabase.from("private_messages").update({ read: true }).eq("id", msg.id).then(() => {});
            }
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "private_messages" },
        (payload) => {
          const updated = payload.new as unknown as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "private_messages" },
        (payload) => {
          const deleted = payload.old as any;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, recipientId]);

  // Presence channel for typing & online status
  useEffect(() => {
    if (!user || !recipientId) return;
    const presenceChannel = supabase.channel(`presence-dm-${[user.id, recipientId].sort().join("-")}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = presenceChannel;
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const recipientState = state[recipientId];
        if (recipientState && recipientState.length > 0) {
          setRecipientOnline(true);
          setRecipientTyping((recipientState[0] as any).typing === true);
        } else {
          setRecipientOnline(false);
          setRecipientTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, typing: false });
        }
      });
    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(presenceChannel);
    };
  }, [user, recipientId]);

  // Update typing status via the existing presence channel
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const broadcastTyping = useCallback(async (typing: boolean) => {
    if (!presenceChannelRef.current) return;
    await presenceChannelRef.current.track({ user_id: user?.id, typing });
  }, [user]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 2000);
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !recipientId || sending) return;
    setSending(true);
    setIsTyping(false);
    broadcastTyping(false);
    const content = newMessage.trim();
    const replyId = replyingTo?.id || null;
    
    // Optimistic update - add message immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: recipientId,
      content,
      created_at: new Date().toISOString(),
      read: false,
      reply_to: replyId,
      message_type: "text",
      file_url: null,
      file_name: null,
      reactions: {},
      edited_at: null,
      pinned: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    setReplyingTo(null);
    inputRef.current?.focus();

    const { data, error } = await supabase.from("private_messages").insert({
      sender_id: user.id,
      receiver_id: recipientId,
      content,
      reply_to: replyId,
    } as any).select().single();
    
    if (error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast({ title: "Failed to send", variant: "destructive" });
    } else if (data) {
      // Replace optimistic message with real one
      setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? (data as unknown as Message) : m));
    }
    setSending(false);
  };

  // Send file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !recipientId) return;
    e.target.value = "";
    setUploading(true);
    const isImage = file.type.startsWith("image/");
    const path = `${user.id}/${recipientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("group-files").upload(path, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("group-files").getPublicUrl(path);
    await supabase.from("private_messages").insert({
      sender_id: user.id,
      receiver_id: recipientId,
      content: file.name,
      message_type: isImage ? "image" : "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
    } as any);
    setUploading(false);
  };

  // Delete message
  const handleDelete = async (msgId: string) => {
    await supabase.from("private_messages").delete().eq("id", msgId);
    setContextMenu(null);
  };

  // Pin/unpin message
  const handleTogglePin = async (msg: Message) => {
    await supabase.from("private_messages").update({ pinned: !msg.pinned } as any).eq("id", msg.id);
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned: !msg.pinned } : m));
    toast({ title: msg.pinned ? "Message unpinned" : "Message pinned" });
    setContextMenu(null);
  };

  // Copy message
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
    setContextMenu(null);
  };

  // Toggle reaction
  const toggleReaction = async (msg: Message, emoji: string) => {
    if (!user) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(user.id)) {
      reactions[emoji] = users.filter((id) => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.id];
    }
    await supabase.from("private_messages").update({ reactions } as any).eq("id", msg.id);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Date separators
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  // Search filtered messages
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  // Detect links in text
  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all">
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // Find reply message
  const findReplyMsg = (id: string | null) => id ? messages.find((m) => m.id === id) : null;

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/friends")} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
            {recipient?.avatar_url ? (
              <img src={recipient.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary">
                {(recipient?.display_name || recipient?.username || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          {/* Online indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${recipientOnline ? "bg-success" : "bg-muted-foreground/30"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm truncate">
            {recipient?.display_name || recipient?.username || "Loading..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {recipientTyping ? (
              <span className="text-primary animate-pulse">typing...</span>
            ) : recipientOnline ? (
              <span className="text-success">Online</span>
            ) : (
              `@${recipient?.username || ""}`
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
          className={searchOpen ? "text-primary" : ""}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-secondary/30">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="h-8 text-sm"
            autoFocus
          />
          <span className="text-xs text-muted-foreground shrink-0">
            {searchQuery ? `${searchResults.length} found` : ""}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 space-y-1 relative">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === user?.id;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDate = !prevMsg || getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);
            const replyMsg = findReplyMsg(msg.reply_to);
            const isHighlighted = searchQuery && msg.content.toLowerCase().includes(searchQuery.toLowerCase());
            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2">
                      {getDateLabel(msg.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className={`flex ${isMine ? "justify-end" : "justify-start"} group px-1`}>
                  <div className="max-w-[75%] relative">
                    {/* Reply preview */}
                    {replyMsg && (
                      <div className={`text-[10px] px-3 py-1 mb-0.5 rounded-t-lg border-l-2 ${
                        isMine ? "border-primary-foreground/30 bg-primary/20 text-primary-foreground/70 ml-auto" 
                               : "border-primary/30 bg-secondary/80 text-muted-foreground"
                      } max-w-full truncate`}>
                        <Reply className="w-2.5 h-2.5 inline mr-1" />
                        {replyMsg.content.slice(0, 60)}{replyMsg.content.length > 60 ? "…" : ""}
                      </div>
                    )}

                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm transition-all ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      } ${isHighlighted ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : ""}`}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msg, x: e.clientX, y: e.clientY }); }}
                    >
                      {/* Image message */}
                      {msg.message_type === "image" && msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                          <img src={msg.file_url} alt={msg.file_name || "image"} className="rounded-lg max-w-full max-h-60 object-cover" />
                        </a>
                      )}

                      {/* File message */}
                      {msg.message_type === "file" && msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-lg mb-1.5 ${isMine ? "bg-primary-foreground/10" : "bg-background/50"}`}>
                          <File className="w-4 h-4 shrink-0" />
                          <span className="text-xs truncate">{msg.file_name || "Download file"}</span>
                        </a>
                      )}

                      {/* Text content with link detection */}
                      {msg.content && msg.message_type === "text" && (
                        <p className="whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>
                      )}
                      {msg.content && msg.message_type !== "text" && !msg.file_url && (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}

                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                          {msg.edited_at && " · edited"}
                        </p>
                        {/* Read receipts */}
                        {isMine && (
                          <span className={`text-[10px] ${msg.read ? "text-primary-foreground/70" : "text-primary-foreground/40"}`}>
                            {msg.read ? <CheckCheck className="w-3 h-3 inline" /> : <Check className="w-3 h-3 inline" />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reactions display */}
                    {hasReactions && (
                      <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg, emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${
                              users.includes(user?.id || "")
                                ? "border-primary/50 bg-primary/10"
                                : "border-border bg-card hover:bg-secondary"
                            }`}
                          >
                            {emoji} {users.length > 1 ? users.length : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className={`absolute top-0 ${isMine ? "-left-20" : "-right-20"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-1 rounded hover:bg-secondary"><Smile className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="top">
                          <div className="flex gap-1">
                            {EMOJI_LIST.map((e) => (
                              <button key={e} onClick={() => toggleReaction(msg, e)} className="text-base hover:scale-125 transition-transform">
                                {e}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <button onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                        className="p-1 rounded hover:bg-secondary"><Reply className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {recipientTyping && (
          <div className="flex justify-start px-1">
            <div className="bg-secondary text-foreground rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollDown && (
        <div className="absolute bottom-24 right-6">
          <Button size="icon" variant="secondary" className="rounded-full shadow-lg w-9 h-9" onClick={() => scrollToBottom()}>
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); inputRef.current?.focus(); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary">
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          <button onClick={() => handleCopy(contextMenu.msg.content)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary">
            <Copy className="w-3.5 h-3.5" /> Copy Text
          </button>
          {contextMenu.msg.sender_id === user?.id && (
            <button onClick={() => handleDelete(contextMenu.msg.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}

      {/* Reply bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-t border-border text-xs">
          <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="flex-1 truncate text-muted-foreground">
            Replying to: {replyingTo.content.slice(0, 80)}{replyingTo.content.length > 80 ? "…" : ""}
          </p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 pt-3 border-t border-border shrink-0">
        {/* File attachment */}
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.md,.doc,.docx"
          onChange={handleFileUpload} />
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}
          disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>

        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" side="top" align="start">
            <div className="grid grid-cols-6 gap-1.5">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewMessage((prev) => prev + e)}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-secondary">
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1"
          autoFocus
        />
        <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending} className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
