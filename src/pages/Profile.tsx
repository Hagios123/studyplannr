import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationStore, ACHIEVEMENTS, getLevel } from "@/stores/useGamificationStore";
import { useStudyStore } from "@/stores/useStudyStore";
import { User, Camera, Save, Loader2, Trophy, Flame, BookOpen, CheckCircle2, Brain, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { totalXP, getStreak, getLevelProgress, getAchievements, tasksCompleted, flashcardsMastered, quizzesCompleted, sessionsCompleted } = useGamificationStore();
  const { tasks, sessions } = useStudyStore();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const level = getLevel();
  const levelProgress = getLevelProgress();
  const streak = getStreak();
  const achievements = getAchievements();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalStudyHours = (
    tasks.filter((t) => t.status === "completed").reduce((a, t) => a + t.duration, 0) +
    sessions.reduce((a, s) => a + s.duration, 0)
  ) / 60;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username);
          setDisplayName(data.display_name || "");
          setBio((data as any).bio || "");
          setAvatarUrl((data as any).avatar_url || null);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, username: username.trim(), bio, avatar_url: avatarUrl } as any)
      .eq("id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved!" });
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").remove([path]);
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(newUrl);
    await supabase.from("profiles").update({ avatar_url: newUrl } as any).eq("id", user.id);
    toast({ title: "Avatar updated!" });
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    { icon: Trophy, label: "Total XP", value: totalXP.toLocaleString(), color: "text-accent" },
    { icon: Flame, label: "Streak", value: `${streak} days`, color: "text-chart-5" },
    { icon: Clock, label: "Study Hours", value: `${totalStudyHours.toFixed(1)}h`, color: "text-primary" },
    { icon: CheckCircle2, label: "Tasks Done", value: tasksCompleted.toString(), color: "text-success" },
    { icon: Brain, label: "Cards Mastered", value: flashcardsMastered.toString(), color: "text-chart-4" },
    { icon: BookOpen, label: "Sessions", value: sessionsCompleted.toString(), color: "text-muted-foreground" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <User className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Your Profile
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">Customize how others see you</p>
      </div>

      {/* Avatar + Level */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-border flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display font-bold text-muted-foreground">
                {(displayName || username || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-foreground" /> : <Camera className="w-5 h-5 text-foreground" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file); e.target.value = ""; }} />
          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center border-2 border-background">
            <span className="text-[10px] font-bold text-accent-foreground">Lv{level}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-lg">{displayName || username}</p>
          <p className="text-xs text-muted-foreground">@{username}</p>
        </div>
        {/* XP bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Level {level}</span>
            <span>{levelProgress.current}/{levelProgress.needed} XP to Level {level + 1}</span>
          </div>
          <Progress value={levelProgress.percent} className="h-2" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-3 rounded-xl border border-border bg-card">
            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
            <p className="text-lg font-display font-bold">{stat.value}</p>
            <p className="text-[9px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div>
        <h2 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" /> Achievements ({unlockedCount}/{achievements.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`p-3 rounded-xl border text-center transition-all ${
                a.unlocked ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/30 opacity-50"
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="text-xs font-semibold mt-1">{a.title}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit fields */}
      <div className="space-y-4 border-t border-border pt-6">
        <h2 className="font-display font-semibold text-sm">Edit Profile</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How others see you" maxLength={50} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Unique username" maxLength={30} />
          <p className="text-xs text-muted-foreground">Others can find you by @{username}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Bio</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about yourself..." rows={3} maxLength={300} />
          <p className="text-xs text-muted-foreground">{bio.length}/300</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <Input value={user?.email || ""} disabled className="opacity-60" />
        </div>
        <Button onClick={handleSave} disabled={saving || !username.trim()} className="w-full gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
