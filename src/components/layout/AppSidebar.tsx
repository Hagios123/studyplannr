import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Layers, HelpCircle, MessageSquare, BarChart3,
  ChevronLeft, ChevronRight, Sparkles, Settings, Sun, Moon, Monitor,
  BookOpen, Palette, Accessibility, Type, Eye, Zap, FileText, Heart,
  Library, Users, UserPlus, User, MessageCircle, MousePointer, Scan,
  AlignJustify, Focus, Glasses, Cpu, Paintbrush, Trophy, Radio,
  Music, Volume2, VolumeX, Upload, Trash2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ONBOARDING_KEY = "novastudy_onboarding_complete";

const studyItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/planner", icon: CalendarDays, label: "Planner" },
  { to: "/flashcards", icon: Layers, label: "Cards" },
  { to: "/quiz", icon: HelpCircle, label: "Quiz" },
  { to: "/tutor", icon: MessageSquare, label: "Tutor" },
];

const toolItems = [
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/habits", icon: Heart, label: "Habits" },
  { to: "/resources", icon: Library, label: "Library" },
  { to: "/groups", icon: Users, label: "Groups" },
  { to: "/friends", icon: UserPlus, label: "Friends" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/study-rooms", icon: Radio, label: "Rooms" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/analytics", icon: BarChart3, label: "Stats" },
];

const mobileItems = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/planner", icon: CalendarDays, label: "Plan" },
  { to: "/flashcards", icon: Layers, label: "Cards" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/groups", icon: Users, label: "Groups" },
];

const modeOptions = [
  { value: "system" as const, icon: Monitor, label: "System" },
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
];

const colorOptions = [
  { value: "blue" as const, label: "Neon Cyan", swatch: "bg-[hsl(187,100%,50%)]" },
  { value: "green" as const, label: "Matrix Green", swatch: "bg-[hsl(152,100%,45%)]" },
  { value: "red" as const, label: "Crimson Neon", swatch: "bg-[hsl(0,90%,55%)]" },
  { value: "grey" as const, label: "Steel Grey", swatch: "bg-[hsl(220,20%,58%)]" },
  { value: "purple" as const, label: "Neon Purple", swatch: "bg-[hsl(270,100%,60%)]" },
];

const uiStyleOptions = [
  { value: "normal" as const, icon: Paintbrush, label: "Normal" },
  { value: "cyberpunk" as const, icon: Cpu, label: "Cyberpunk" },
];

const fontSizeOptions = [
  { value: "normal" as const, label: "Normal", preview: "Aa" },
  { value: "large" as const, label: "Large", preview: "Aa" },
  { value: "xl" as const, label: "Extra Large", preview: "Aa" },
];

const lineSpacingOptions = [
  { value: "compact" as const, label: "Compact" },
  { value: "normal" as const, label: "Normal" },
  { value: "relaxed" as const, label: "Relaxed" },
];

const AMBIENT_TRACKS = [
  { id: "lofi", label: "Lo-Fi Beats", emoji: "🎵", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "rain", label: "Rain Sounds", emoji: "🌧️", url: "https://cdn.pixabay.com/audio/2022/09/06/audio_80265eed33.mp3" },
  { id: "cafe", label: "Café Ambience", emoji: "☕", url: "https://cdn.pixabay.com/audio/2024/11/04/audio_af36e1f77b.mp3" },
  { id: "nature", label: "Forest & Birds", emoji: "🌲", url: "https://cdn.pixabay.com/audio/2022/03/09/audio_c8afbab4b2.mp3" },
  { id: "whitenoise", label: "White Noise", emoji: "📡", url: "https://cdn.pixabay.com/audio/2024/09/26/audio_7e0deb4a5e.mp3" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const {
    mode, setMode, colorTheme, setColorTheme,
    fontSize, setFontSize, reducedMotion, setReducedMotion,
    highContrast, setHighContrast, dyslexicFont, setDyslexicFont,
    lineSpacing, setLineSpacing, focusHighlight, setFocusHighlight,
    colorBlindMode, setColorBlindMode, screenReaderHints, setScreenReaderHints,
    largeCursor, setLargeCursor, uiStyle, setUiStyle,
  } = useTheme();

  // Ambient sound state
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customSounds, setCustomSounds] = useState<{ id: string; label: string; url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Load custom sounds from storage
  useEffect(() => {
    if (!user) return;
    const loadCustomSounds = async () => {
      const { data } = await supabase.storage.from("custom-sounds").list(user.id, { sortBy: { column: "created_at", order: "desc" } });
      if (data) {
        setCustomSounds(data.map((f) => {
          const { data: urlData } = supabase.storage.from("custom-sounds").getPublicUrl(`${user.id}/${f.name}`);
          return { id: `custom-${f.name}`, label: f.name.replace(/\.[^.]+$/, ""), url: urlData.publicUrl, path: `${user.id}/${f.name}` };
        }));
      }
    };
    loadCustomSounds();
  }, [user]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const playTrack = (trackId: string, url: string) => {
    if (playing === trackId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlaying(trackId);
  };

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("audio/")) { toast.error("Please upload an audio file (MP3, WAV, etc.)"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File must be under 20MB"); return; }
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("custom-sounds").upload(`${user.id}/${fileName}`, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("custom-sounds").getPublicUrl(`${user.id}/${fileName}`);
    setCustomSounds((prev) => [{ id: `custom-${fileName}`, label: file.name.replace(/\.[^.]+$/, ""), url: urlData.publicUrl, path: `${user.id}/${fileName}` }, ...prev]);
    toast.success("Sound uploaded!");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteCustomSound = async (sound: { id: string; path: string }) => {
    if (playing === sound.id) { audioRef.current?.pause(); audioRef.current = null; setPlaying(null); }
    await supabase.storage.from("custom-sounds").remove([sound.path]);
    setCustomSounds((prev) => prev.filter((s) => s.id !== sound.id));
    toast.success("Sound removed");
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const replayTutorial = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  };

  const renderNavItem = (item: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
          isActive
            ? "bg-primary/10 text-primary glow-neon"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn("w-4.5 h-4.5 shrink-0", isActive && "text-primary")} />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </NavLink>
    );
  };

  const ToggleRow = ({ icon: Icon, label, description, checked, onChange }: {
    icon: any; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/50">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center glow-neon shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-cyber font-bold text-sm text-gradient-primary whitespace-nowrap tracking-wider">
              STUDY AI
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
          <div className="space-y-0.5">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5 font-cyber">Study</p>}
            {studyItems.map(renderNavItem)}
          </div>

          <div className="space-y-0.5">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5 font-cyber">Tools</p>}
            {toolItems.map(renderNavItem)}
          </div>
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <button className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}>
                <Settings className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-cyber tracking-wide">
                  <Settings className="w-5 h-5 text-primary" /> SETTINGS
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="appearance" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="appearance" className="flex-1 gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Theme
                  </TabsTrigger>
                  <TabsTrigger value="sounds" className="flex-1 gap-1.5">
                    <Music className="w-3.5 h-3.5" /> Sounds
                  </TabsTrigger>
                  <TabsTrigger value="accessibility" className="flex-1 gap-1.5">
                    <Accessibility className="w-3.5 h-3.5" /> Access
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="appearance" className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Sun className="w-4 h-4 text-muted-foreground" /> Appearance
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {modeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setMode(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                            mode === opt.value
                              ? "border-primary bg-primary/10 text-primary glow-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <opt.icon className="w-5 h-5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Palette className="w-4 h-4 text-muted-foreground" /> Color Theme
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {colorOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setColorTheme(opt.value)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all duration-200",
                            colorTheme === opt.value
                              ? "border-primary bg-primary/10 text-foreground glow-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <div className={cn("w-5 h-5 rounded-full shrink-0 ring-2 ring-border", opt.swatch)} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UI Style */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-muted-foreground" /> UI Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {uiStyleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setUiStyle(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                            uiStyle === opt.value
                              ? "border-primary bg-primary/10 text-primary glow-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <opt.icon className="w-5 h-5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <button
                      onClick={replayTutorial}
                      className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
                    >
                      <BookOpen className="w-5 h-5 shrink-0" />
                      <div className="text-left">
                        <p>Replay Tutorial</p>
                        <p className="text-xs text-muted-foreground">Show the onboarding guide again</p>
                      </div>
                    </button>
                  </div>
                </TabsContent>

                <TabsContent value="sounds" className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Music className="w-4 h-4 text-muted-foreground" /> Built-in Sounds
                    </label>
                    <div className="space-y-1.5">
                      {AMBIENT_TRACKS.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => playTrack(track.id, track.url)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            playing === track.id
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                          )}
                        >
                          <span className="text-base">{track.emoji}</span>
                          <span className="flex-1 text-left">{track.label}</span>
                          {playing === track.id && (
                            <div className="flex gap-0.5 items-end">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="w-0.5 bg-primary rounded-full animate-pulse"
                                  style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Sounds */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" /> Custom Sounds
                    </label>
                    {user ? (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleUploadSound}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploading ? "Uploading..." : "Upload Sound (MP3, WAV)"}
                        </button>
                        {customSounds.length > 0 && (
                          <div className="space-y-1.5">
                            {customSounds.map((sound) => (
                              <div key={sound.id} className="flex items-center gap-1">
                                <button
                                  onClick={() => playTrack(sound.id, sound.url)}
                                  className={cn(
                                    "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    playing === sound.id
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                                  )}
                                >
                                  <span className="text-base">🎧</span>
                                  <span className="flex-1 text-left truncate">{sound.label}</span>
                                  {playing === sound.id && (
                                    <div className="flex gap-0.5 items-end">
                                      {[1, 2, 3].map((i) => (
                                        <div
                                          key={i}
                                          className="w-0.5 bg-primary rounded-full animate-pulse"
                                          style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.15}s` }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteCustomSound(sound)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                                  title="Remove sound"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {customSounds.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No custom sounds yet. Upload your own!</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">Sign in to upload custom sounds</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" /> Volume
                    </label>
                    <div className="flex items-center gap-3 px-1">
                      <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Slider value={[volume]} onValueChange={(v) => setVolume(v[0])} max={100} step={1} className="flex-1" />
                      <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{volume}%</p>
                  </div>

                  {playing && (
                    <button
                      onClick={() => { audioRef.current?.pause(); audioRef.current = null; setPlaying(null); }}
                      className="w-full p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all"
                    >
                      Stop Playing
                    </button>
                  )}
                </TabsContent>

                <TabsContent value="accessibility" className="space-y-4 pt-2">
                  {/* Text Size */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" /> Text Size
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {fontSizeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFontSize(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                            fontSize === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <span className={cn(
                            "font-display font-bold",
                            opt.value === "normal" && "text-base",
                            opt.value === "large" && "text-lg",
                            opt.value === "xl" && "text-xl",
                          )}>{opt.preview}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Spacing */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <AlignJustify className="w-4 h-4 text-muted-foreground" /> Line Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {lineSpacingOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setLineSpacing(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all duration-200",
                            lineSpacing === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle options */}
                  <div className="space-y-2">
                    <ToggleRow icon={Zap} label="Reduced Motion" description="Minimize animations" checked={reducedMotion} onChange={setReducedMotion} />
                    <ToggleRow icon={Eye} label="High Contrast" description="Increase text contrast" checked={highContrast} onChange={setHighContrast} />
                    <ToggleRow icon={Type} label="Dyslexia-Friendly Font" description="Use OpenDyslexic typeface" checked={dyslexicFont} onChange={setDyslexicFont} />
                    <ToggleRow icon={Focus} label="Focus Indicators" description="Enhanced keyboard focus outlines" checked={focusHighlight} onChange={setFocusHighlight} />
                    <ToggleRow icon={Glasses} label="Colorblind Mode" description="Deuteranopia-friendly palette" checked={colorBlindMode} onChange={setColorBlindMode} />
                    <ToggleRow icon={Scan} label="Screen Reader Hints" description="Show ARIA label indicators" checked={screenReaderHints} onChange={setScreenReaderHints} />
                    <ToggleRow icon={MousePointer} label="Large Cursor" description="Bigger pointer for visibility" checked={largeCursor} onChange={setLargeCursor} />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {[...mobileItems, { to: "#settings", icon: Settings, label: "More" }].map((item) => {
            if (item.to === "#settings") {
              return (
                <button
                  key="settings"
                  onClick={() => setSettingsOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-0 text-sidebar-foreground"
                >
                  <Settings className="w-5 h-5" />
                  <span className="truncate">More</span>
                </button>
              );
            }
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-0",
                  isActive ? "text-primary" : "text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
