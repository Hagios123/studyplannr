import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft, MessageCircle, FileText, Link2, BookOpen, Hash, Plus, Trash2, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface ChannelItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isSubject?: boolean;
  id?: string;
}

export const DEFAULT_CHANNELS: ChannelItem[] = [
  { name: "general", icon: MessageCircle, label: "General" },
  { name: "notes", icon: FileText, label: "Notes" },
  { name: "links", icon: Link2, label: "Links & Resources" },
  { name: "study", icon: BookOpen, label: "Study Discussion" },
];

interface Props {
  groupId: string;
  groupName: string;
  channel: string;
  setChannel: (c: string) => void;
  subjectChannels: ChannelItem[];
  onChannelCreated: () => void;
  onQuizOpen: () => void;
}

export default function ChannelSidebar({ groupId, groupName, channel, setChannel, subjectChannels, onChannelCreated, onQuizOpen }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newChannelName, setNewChannelName] = useState("");
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const allChannels = [...DEFAULT_CHANNELS, ...subjectChannels];

  const handleAddChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name || !user || allChannels.some((c) => c.name === name)) return;
    await supabase.from("group_channels" as any).insert({
      group_id: groupId,
      name,
      label: newChannelName.trim(),
      created_by: user.id,
    });
    setNewChannelName("");
    setChannelDialogOpen(false);
    onChannelCreated();
  };

  const handleDeleteChannel = async (chId: string, chName: string) => {
    setDeleting(chId);
    await supabase.from("group_channels" as any).delete().eq("id", chId);
    if (channel === chName) setChannel("general");
    onChannelCreated();
    setDeleting(null);
  };

  return (
    <div className="w-[200px] border-r border-border shrink-0 flex flex-col overflow-hidden hidden md:flex">
      <div className="p-3 border-b border-border">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => navigate("/groups")}>
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Groups
        </Button>
      </div>
      <div className="p-2 border-b border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">{groupName}</p>
      </div>

      {/* Default channels */}
      <div className="px-2 pt-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Channels</p>
        {DEFAULT_CHANNELS.map((ch) => (
          <button key={ch.name} onClick={() => setChannel(ch.name)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              channel === ch.name ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            <ch.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{ch.label}</span>
          </button>
        ))}
      </div>

      {/* Subject channels */}
      <div className="px-2 pt-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Subjects</p>
        {subjectChannels.length === 0 && (
          <p className="text-[10px] text-muted-foreground px-2 py-1 italic">No subjects yet</p>
        )}
        {subjectChannels.map((ch) => (
          <div key={ch.name} className="group flex items-center">
            <button onClick={() => setChannel(ch.name)}
              className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channel === ch.name ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ch.label}</span>
            </button>
            {ch.id && (
              <button onClick={() => handleDeleteChannel(ch.id!, ch.name)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                disabled={deleting === ch.id}>
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quiz button */}
      <div className="px-2 py-1 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground" onClick={onQuizOpen}>
          <Brain className="w-3.5 h-3.5" /> Group Quiz
        </Button>
      </div>

      {/* Add subject */}
      <div className="p-2 border-t border-border">
        <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground">
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle className="text-sm">New Subject Channel</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="e.g. Operating Systems, Java, HTML" value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChannel()} autoFocus />
              <p className="text-xs text-muted-foreground">Create a subject-specific channel with its own notes, links, and discussion.</p>
              <Button onClick={handleAddChannel} disabled={!newChannelName.trim()} className="w-full" size="sm">Create Subject</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
