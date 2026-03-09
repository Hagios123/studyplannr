import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Plus, Loader2, Clock, Wifi, Search, Globe, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface RoomMember {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  timer_minutes?: number;
  joined_at: string;
}

interface StudyRoom {
  id: string;
  name: string;
  host_id: string;
  is_public: boolean;
  created_at: string;
  host_name?: string;
}

export default function StudyRooms() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [myStatus, setMyStatus] = useState<"studying" | "break" | "idle">("idle");
  const [loading, setLoading] = useState(true);
  const [presenceMembers, setPresenceMembers] = useState<RoomMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hostProfiles, setHostProfiles] = useState<Record<string, { username: string; display_name: string | null }>>({});

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_rooms")
      .select("*")
      .order("created_at", { ascending: false });
    const roomList = (data || []) as StudyRoom[];
    setRooms(roomList);

    // Fetch host profiles
    const hostIds = [...new Set(roomList.map((r) => r.host_id))];
    if (hostIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", hostIds);
      const map: Record<string, { username: string; display_name: string | null }> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = p; });
      setHostProfiles(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const createRoom = async () => {
    if (!roomName.trim() || !user) return;
    const { data, error } = await supabase
      .from("study_rooms")
      .insert({ name: roomName.trim(), host_id: user.id, is_public: isPublic })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRoomName("");
    setIsPublic(true);
    setCreateOpen(false);
    toast({ title: "Room created!" });
    fetchRooms();
    joinRoom(data as StudyRoom);
  };

  const joinRoom = (room: StudyRoom) => {
    if (!user) return;
    setActiveRoom(room);
    setMyStatus("idle");

    const channel = supabase.channel(`study-room-${room.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const members: RoomMember[] = Object.values(state)
          .flat()
          .map((p: any) => ({
            id: p.user_id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            status: p.status || "idle",
            timer_minutes: p.timer_minutes,
            joined_at: p.joined_at || new Date().toISOString(),
          }));
        setPresenceMembers(members);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            username: profile?.username || "user",
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url,
            status: "idle",
            joined_at: new Date().toISOString(),
          });
        }
      });
  };

  const updateStatus = async (status: "studying" | "break" | "idle") => {
    if (!activeRoom || !user) return;
    setMyStatus(status);
    const channel = supabase.channel(`study-room-${activeRoom.id}`);
    await channel.track({
      user_id: user.id,
      username: profile?.username || "user",
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      status,
      joined_at: new Date().toISOString(),
    });
  };

  const leaveRoom = () => {
    if (!activeRoom) return;
    const channel = supabase.channel(`study-room-${activeRoom.id}`);
    channel.unsubscribe();
    setActiveRoom(null);
    setPresenceMembers([]);
    setMyStatus("idle");
  };

  const deleteRoom = async (roomId: string) => {
    await supabase.from("study_rooms").delete().eq("id", roomId);
    toast({ title: "Room deleted" });
    if (activeRoom?.id === roomId) leaveRoom();
    fetchRooms();
  };

  const statusColors: Record<string, string> = {
    studying: "bg-success text-success-foreground",
    break: "bg-accent text-accent-foreground",
    idle: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    studying: "📖 Studying",
    break: "☕ On Break",
    idle: "💤 Idle",
  };

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeRoom) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
              <Wifi className="w-5 h-5 md:w-6 md:h-6 text-success" />
              {activeRoom.name}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              {presenceMembers.length} {presenceMembers.length === 1 ? "person" : "people"} studying
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={leaveRoom}>
            Leave Room
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["studying", "break", "idle"] as const).map((s) => (
            <Button
              key={s}
              variant={myStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => updateStatus(s)}
              className="gap-1.5"
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {presenceMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-border bg-card flex flex-col items-center gap-3 transition-all hover:border-primary/20"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-border flex items-center justify-center">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-display font-bold text-muted-foreground">
                      {(member.display_name || member.username || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                    member.status === "studying"
                      ? "bg-success"
                      : member.status === "break"
                      ? "bg-accent"
                      : "bg-muted-foreground/30"
                  }`}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {member.display_name || member.username}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[member.status]}`}>
                  {statusLabels[member.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {presenceMembers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Waiting for others to join...</p>
            <p className="text-xs mt-1">Share the room name with your friends</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Study Rooms
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Join a virtual study room and study with friends in real-time
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Create Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Study Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Room name (e.g. 'Finals Grind 📚')"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                autoFocus
              />
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Public Room</p>
                    <p className="text-xs text-muted-foreground">Anyone can find and join</p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <Button onClick={createRoom} disabled={!roomName.trim()} className="w-full">
                Create & Join
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search rooms by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold text-lg">
            {rooms.length === 0 ? "No study rooms yet" : "No matching rooms"}
          </p>
          <p className="text-sm mt-1">
            {rooms.length === 0 ? "Create a room to start studying with friends." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRooms.map((room) => {
            const host = hostProfiles[room.host_id];
            const isHost = room.host_id === user?.id;
            return (
              <div
                key={room.id}
                className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm truncate">{room.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      by {isHost ? "You" : host?.display_name || host?.username || "Unknown"}
                    </p>
                  </div>
                  {room.is_public ? (
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" title="Public" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" title="Private" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => joinRoom(room)}>
                      <LogIn className="w-3 h-3" /> Join
                    </Button>
                    {isHost && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteRoom(room.id)}>
                        Delete
                      </Button>
                    )}
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
