import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, MessageSquare,
  ChevronLeft, ChevronRight, Sparkles, Settings, Sun, Moon, Monitor,
  BookOpen, Palette, Accessibility, Type, Eye, Zap,
  Library, Users, UserPlus, User, MessageCircle, MousePointer,
  AlignJustify, Focus, Glasses, Cpu, Paintbrush, GraduationCap,
  Music, Volume2, VolumeX, Upload, Trash2, Loader2,
  Shield, ClipboardCheck, FileText, PanelLeft, PanelRight,
  Square, Circle, RectangleHorizontal, Minimize2, Layers,
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
import NotificationCenter from "@/components/NotificationCenter";

const AMBIENT_TRACKS = [
  { id: "lofi", label: "Lo-Fi Beats", emoji: "🎵", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "rain", label: "Rain Sounds", emoji: "🌧️", url: "https://cdn.pixabay.com/audio/2022/09/06/audio_80265eed33.mp3" },
  { id: "cafe", label: "Café Ambience", emoji: "☕", url: "https://cdn.pixabay.com/audio/2024/11/04/audio_af36e1f77b.mp3" },
  { id: "nature", label: "Forest & Birds", emoji: "🌲", url: "https://cdn.pixabay.com/audio/2022/03/09/audio_c8afbab4b2.mp3" },
  { id: "whitenoise", label: "White Noise", emoji: "📡", url: "https://cdn.pixabay.com/audio/2024/09/26/audio_7e0deb4a5e.mp3" },
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
  { value: "retro" as const, icon: Monitor, label: "Retro" },
  { value: "glass" as const, icon: Eye, label: "Glass" },
  { value: "minimal" as const, icon: Type, label: "Minimal" },
  { value: "steampunk" as const, icon: Settings, label: "Steampunk" },
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

const fontFamilyOptions = [
  { value: "default" as const, label: "Sans Serif" },
  { value: "mono" as const, label: "Monospace" },
  { value: "serif" as const, label: "Serif" },
  { value: "orbitron" as const, label: "Orbitron" },
  { value: "comic" as const, label: "Rounded" },
];

const cardStyleOptions = [
  { value: "solid" as const, label: "Solid", icon: Square },
  { value: "glass" as const, label: "Glass", icon: Layers },
  { value: "outline" as const, label: "Outline", icon: Square },
  { value: "neon" as const, label: "Neon", icon: Zap },
];

const borderRadiusOptions = [
  { value: "sharp" as const, label: "Sharp" },
  { value: "default" as const, label: "Default" },
  { value: "rounded" as const, label: "Rounded" },
  { value: "pill" as const, label: "Pill" },
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
    fontFamily, setFontFamily, sidebarPosition, setSidebarPosition,
    cardStyle, setCardStyle, borderRadius, setBorderRadius,
    compactMode, setCompactMode,
  } = useTheme();

  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customSounds, setCustomSounds] = useState<{ id: string; label: string; url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user, role } = useAuth();

  // Build navigation based on role
  const studyItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/planner", icon: CalendarDays, label: "Schedule" },
    { to: "/learn", icon: GraduationCap, label: "Learn" },
    { to: "/tutor", icon: MessageSquare, label: "AI Tutor" },
  ];

  const socialItems = [
    { to: "/groups", icon: Users, label: "Groups" },
    { to: "/friends", icon: UserPlus, label: "Friends" },
    { to: "/chat", icon: MessageCircle, label: "Chat" },
    { to: "/assignments", icon: FileText, label: "Assignments" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const adminItems: { to: string; icon: any; label: string }[] = [];
  if (role === "admin" || role === "teacher") {
    adminItems.push({ to: "/approvals", icon: ClipboardCheck, label: "Approvals" });
  }
  if (role === "admin") {
    adminItems.push({ to: "/admin", icon: Shield, label: "Admin Panel" });
  }

  const mobileItems = [
    { to: "/", icon: LayoutDashboard, label: "Home" },
    { to: "/planner", icon: CalendarDays, label: "Schedule" },
    { to: "/learn", icon: GraduationCap, label: "Learn" },
    { to: "/chat", icon: MessageCircle, label: "Chat" },
    { to: "/assignments", icon: FileText, label: "Tasks" },
  ];

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
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const playTrack = (trackId: string, url: string) => {
    if (playing === trackId) { audioRef.current?.pause(); audioRef.current = null; setPlaying(null); return; }
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
    if (!file.type.startsWith("audio/")) { toast.error("Please upload an audio file"); return; }
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

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  const renderNavItem = (item: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
          isActive ? "bg-primary/10 text-primary glow-neon" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
      <aside className={cn("hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0", collapsed ? "w-[68px]" : "w-[220px]")}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center glow-neon shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          {!collapsed && <span className="font-cyber font-bold text-sm text-gradient-primary whitespace-nowrap tracking-wider">STUDYCONNECT</span>}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
          <div className="space-y-0.5">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Study</p>}
            {studyItems.map(renderNavItem)}
          </div>
          <div className="space-y-0.5">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Social</p>}
            {socialItems.map(renderNavItem)}
          </div>
          {adminItems.length > 0 && (
            <div className="space-y-0.5">
              {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Manage</p>}
              {adminItems.map(renderNavItem)}
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "px-2")}><NotificationCenter /></div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <button className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center")}>
                <Settings className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Settings</DialogTitle></DialogHeader>
              <Tabs defaultValue="appearance" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="appearance" className="flex-1 gap-1.5"><Palette className="w-3.5 h-3.5" /> Theme</TabsTrigger>
                  <TabsTrigger value="sounds" className="flex-1 gap-1.5"><Music className="w-3.5 h-3.5" /> Sounds</TabsTrigger>
                  <TabsTrigger value="accessibility" className="flex-1 gap-1.5"><Accessibility className="w-3.5 h-3.5" /> Access</TabsTrigger>
                </TabsList>

                <TabsContent value="appearance" className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><Sun className="w-4 h-4 text-muted-foreground" /> Appearance</label>
                    <div className="grid grid-cols-3 gap-2">
                      {modeOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setMode(opt.value)} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all", mode === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30")}>
                          <opt.icon className="w-5 h-5" />{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-muted-foreground" /> Color Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {colorOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setColorTheme(opt.value)} className={cn("flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all", colorTheme === opt.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30")}>
                          <div className={cn("w-5 h-5 rounded-full shrink-0 ring-2 ring-border", opt.swatch)} />{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><Cpu className="w-4 h-4 text-muted-foreground" /> UI Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {uiStyleOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setUiStyle(opt.value)} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all", uiStyle === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30")}>
                          <opt.icon className="w-5 h-5" />{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sounds" className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><Music className="w-4 h-4 text-muted-foreground" /> Built-in Sounds</label>
                    <div className="space-y-1.5">
                      {AMBIENT_TRACKS.map((track) => (
                        <button key={track.id} onClick={() => playTrack(track.id, track.url)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all", playing === track.id ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent")}>
                          <span>{track.emoji}</span><span className="flex-1 text-left">{track.label}</span>
                          {playing === track.id && <Volume2 className="w-4 h-4 animate-pulse" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  {customSounds.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold">Custom Sounds</label>
                      <div className="space-y-1.5">
                        {customSounds.map((sound) => (
                          <div key={sound.id} className="flex items-center gap-2">
                            <button onClick={() => playTrack(sound.id, sound.url)} className={cn("flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left", playing === sound.id ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent")}>
                              <span>🎶</span><span className="flex-1 truncate">{sound.label}</span>
                              {playing === sound.id && <Volume2 className="w-4 h-4 animate-pulse" />}
                            </button>
                            <button onClick={() => deleteCustomSound(sound)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold">Upload Sound</label>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUploadSound} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading..." : "Upload audio file"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">Volume</label>
                      <span className="text-xs text-muted-foreground">{volume}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} className="flex-1" />
                      <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="accessibility" className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><Type className="w-4 h-4 text-muted-foreground" /> Text Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {fontSizeOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setFontSize(opt.value)} className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all", fontSize === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30")}>
                          <span className={cn(opt.value === "normal" ? "text-sm" : opt.value === "large" ? "text-base" : "text-lg")}>{opt.preview}</span>{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><AlignJustify className="w-4 h-4 text-muted-foreground" /> Line Spacing</label>
                    <div className="grid grid-cols-3 gap-2">
                      {lineSpacingOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setLineSpacing(opt.value)} className={cn("p-3 rounded-xl border text-xs font-medium transition-all", lineSpacing === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30")}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ToggleRow icon={Zap} label="Reduced Motion" description="Minimize animations" checked={reducedMotion} onChange={setReducedMotion} />
                    <ToggleRow icon={Eye} label="High Contrast" description="Increase contrast" checked={highContrast} onChange={setHighContrast} />
                    <ToggleRow icon={Glasses} label="Dyslexic Font" description="OpenDyslexic font" checked={dyslexicFont} onChange={setDyslexicFont} />
                    <ToggleRow icon={Focus} label="Focus Highlight" description="Highlight focused elements" checked={focusHighlight} onChange={setFocusHighlight} />
                    <ToggleRow icon={Palette} label="Colorblind Mode" description="Adjusted color palette" checked={colorBlindMode} onChange={setColorBlindMode} />
                    <ToggleRow icon={BookOpen} label="Screen Reader Hints" description="Extra ARIA labels" checked={screenReaderHints} onChange={setScreenReaderHints} />
                    <ToggleRow icon={MousePointer} label="Large Cursor" description="Bigger mouse pointer" checked={largeCursor} onChange={setLargeCursor} />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <button onClick={() => setCollapsed(!collapsed)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center")}>
            {collapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <><ChevronLeft className="w-4.5 h-4.5" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border px-2 py-1 flex justify-around">
        {mobileItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all", isActive ? "text-primary" : "text-muted-foreground")}>
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              {item.label}
            </NavLink>
          );
        })}
        <button onClick={() => setSettingsOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground">
          <Settings className="w-5 h-5" />More
        </button>
      </nav>
    </>
  );
}
