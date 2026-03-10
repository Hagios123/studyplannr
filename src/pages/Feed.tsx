import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Rss, Heart, MessageCircle, Send, Loader2, Trophy, Flame, BookOpen, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface FeedPost {
  id: string;
  user_id: string;
  type: string;
  content: string;
  metadata: any;
  likes: string[];
  created_at: string;
  profile?: { username: string; display_name: string | null; avatar_url: string | null };
}

const typeIcons: Record<string, any> = {
  achievement: Trophy,
  study_update: BookOpen,
  milestone: Flame,
  tip: Zap,
  general: MessageCircle,
};

const typeColors: Record<string, string> = {
  achievement: "text-accent",
  study_update: "text-primary",
  milestone: "text-chart-5",
  tip: "text-chart-4",
  general: "text-muted-foreground",
};

const POST_TYPES = [
  { value: "study_update", label: "📚 Study Update", description: "Share what you're studying" },
  { value: "tip", label: "💡 Study Tip", description: "Share a useful tip" },
  { value: "milestone", label: "🔥 Milestone", description: "Celebrate an achievement" },
  { value: "general", label: "💬 General", description: "Share anything" },
];

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("study_update");
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const { data: feedData } = await supabase
      .from("study_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (feedData) {
      const userIds = [...new Set((feedData as any[]).map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched = (feedData as any[]).map((post) => ({
        ...post,
        likes: Array.isArray(post.likes) ? post.likes : [],
        profile: profileMap.get(post.user_id),
      }));
      setPosts(enriched);
    }
    setLoading(false);
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user || posting) return;
    setPosting(true);
    const { error } = await supabase.from("study_feed").insert({
      user_id: user.id,
      type: postType,
      content: newPost.trim(),
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewPost("");
      setShowCompose(false);
      toast({ title: "Posted!" });
      loadPosts();
    }
    setPosting(false);
  };

  const toggleLike = async (post: FeedPost) => {
    if (!user) return;
    const likes = [...post.likes];
    const idx = likes.indexOf(user.id);
    if (idx > -1) likes.splice(idx, 1);
    else likes.push(user.id);
    await supabase.from("study_feed").update({ likes } as any).eq("id", post.id);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes } : p));
  };

  const deletePost = async (id: string) => {
    await supabase.from("study_feed").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Post deleted" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Rss className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Study Feed
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Share and discover study tips, milestones, and updates
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCompose(!showCompose)} className="gap-1.5">
          <Send className="w-3.5 h-3.5" /> Post
        </Button>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="p-4 rounded-xl border border-primary/20 bg-card space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setPostType(t.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  postType === t.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What are you studying? Share a tip or celebrate a milestone..."
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{newPost.length}/500</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button size="sm" onClick={handlePost} disabled={!newPost.trim() || posting} className="gap-1.5">
                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Rss className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold">No posts yet</p>
          <p className="text-sm mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const Icon = typeIcons[post.type] || MessageCircle;
            const color = typeColors[post.type] || "text-muted-foreground";
            const isLiked = user ? post.likes.includes(user.id) : false;
            const isMine = post.user_id === user?.id;

            return (
              <div key={post.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                    {post.profile?.avatar_url ? (
                      <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {(post.profile?.display_name || post.profile?.username || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">
                        {post.profile?.display_name || post.profile?.username || "User"}
                      </p>
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${color}`}>
                        <Icon className="w-3 h-3" />
                        {POST_TYPES.find((t) => t.value === post.type)?.label.split(" ").slice(1).join(" ") || post.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{post.content}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => toggleLike(post)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          isLiked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-destructive" : ""}`} />
                        {post.likes.length > 0 && post.likes.length}
                      </button>
                      {isMine && (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
