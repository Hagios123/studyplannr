import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Plus, Trash2, Check, Target, UserPlus, FileText, Upload, Download,
  Loader2, ChevronLeft, X, Search, Globe, MessageCircle, Shield, ShieldCheck,
  ShieldOff, Lock, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const GROUP_COLORS = [
  "hsl(187, 80%, 42%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 38%)",
  "hsl(0, 72%, 50%)", "hsl(270, 60%, 55%)", "hsl(340, 65%, 50%)",
];

interface GroupRow {
  id: string; name: string; description: string; color: string; created_by: string; created_at: string;
}
interface MemberRow {
  id: string; group_id: string; user_id: string; role: string; joined_at: string;
  permissions: { can_send_messages: boolean; can_edit_group: boolean; is_admin: boolean };
}
interface GoalRow {
  id: string; group_id: string; title: string; completed: boolean; assignee_id: string | null; due_date: string | null;
}
interface NoteRow {
  id: string; group_id: string; author_id: string; title: string; content: string;
  file_url: string | null; file_name: string | null; tags: string[]; created_at: string; updated_at: string;
}
interface FriendProfile {
  id: string; username: string; display_name: string | null;
}

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [goals, setGoals] = useState<Record<string, GoalRow[]>>({});
  const [notes, setNotes] = useState<Record<string, NoteRow[]>>({});
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>({});
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"goals" | "notes" | "members" | "permissions">("notes");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [newGoal, setNewGoal] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data: grps } = await supabase.from("study_groups").select("*");
    const groupList = (grps || []) as GroupRow[];
    setGroups(groupList);

    const groupIds = groupList.map((g) => g.id);
    if (groupIds.length > 0) {
      const [{ data: mems }, { data: gls }, { data: nts }] = await Promise.all([
        supabase.from("group_members").select("*").in("group_id", groupIds),
        supabase.from("group_goals").select("*").in("group_id", groupIds),
        supabase.from("group_notes").select("*").in("group_id", groupIds).order("created_at", { ascending: false }),
      ]);

      const memMap: Record<string, MemberRow[]> = {};
      const goalMap: Record<string, GoalRow[]> = {};
      const noteMap: Record<string, NoteRow[]> = {};
      groupIds.forEach((id) => { memMap[id] = []; goalMap[id] = []; noteMap[id] = []; });
      (mems || []).forEach((m: any) => {
        const perms = m.permissions || { can_send_messages: true, can_edit_group: false, is_admin: false };
        memMap[m.group_id]?.push({ ...m, permissions: perms });
      });
      (gls || []).forEach((g: any) => goalMap[g.group_id]?.push(g));
      (nts || []).forEach((n: any) => noteMap[n.group_id]?.push(n));
      setMembers(memMap);
      setGoals(goalMap);
      setNotes(noteMap);

      const allIds = new Set<string>();
      (mems || []).forEach((m: any) => allIds.add(m.user_id));
      (nts || []).forEach((n: any) => allIds.add(n.author_id));
      if (allIds.size > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", Array.from(allIds));
        const map: Record<string, FriendProfile> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
    }

    const { data: friendships } = await supabase.from("friendships").select("*").eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id);
      const { data: friendProfs } = await supabase.from("profiles").select("id, username, display_name").in("id", friendIds);
      setFriends((friendProfs || []) as FriendProfile[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    const { data, error } = await supabase.from("study_groups").insert({
      name: name.trim(), description: description.trim(), color, created_by: user.id,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("group_members").insert({
      group_id: data.id, user_id: user.id, role: "owner",
      permissions: { can_send_messages: true, can_edit_group: true, is_admin: true },
    } as any);
    setName(""); setDescription(""); setCreateOpen(false); setActiveGroup(data.id);
    toast({ title: "Study group created!" }); fetchAll();
  };

  const handleDelete = async (groupId: string) => {
    await supabase.from("study_groups").delete().eq("id", groupId);
    setActiveGroup(null); toast({ title: "Group deleted" }); fetchAll();
  };

  const handleAddMember = async (groupId: string) => {
    if (!addMemberId) return;
    const existing = members[groupId]?.find((m) => m.user_id === addMemberId);
    if (existing) { toast({ title: "Already a member", variant: "destructive" }); return; }
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId, user_id: addMemberId, role: "member",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Member added!" }); setAddMemberId(""); fetchAll(); }
  };

  const handleAddGoal = async (groupId: string) => {
    if (!newGoal.trim()) return;
    await supabase.from("group_goals").insert({ group_id: groupId, title: newGoal.trim(), assignee_id: user?.id });
    setNewGoal(""); fetchAll();
  };

  const toggleGoal = async (goalId: string, completed: boolean) => {
    await supabase.from("group_goals").update({ completed: !completed }).eq("id", goalId);
    fetchAll();
  };

  const handleAddNote = async (groupId: string) => {
    if (!noteTitle.trim() || !user) return;
    await supabase.from("group_notes").insert({ group_id: groupId, author_id: user.id, title: noteTitle.trim(), content: noteContent });
    setNoteTitle(""); setNoteContent(""); toast({ title: "Note added!" }); fetchAll();
  };

  const handleFileUpload = async (groupId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${groupId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("group-files").upload(path, file);
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("group-files").getPublicUrl(path);
    await supabase.from("group_notes").insert({ group_id: groupId, author_id: user.id, title: file.name, content: "", file_url: urlData.publicUrl, file_name: file.name });
    toast({ title: "File uploaded!" }); setUploading(false); fetchAll();
  };

  const updateMemberPermission = async (memberId: string, member: MemberRow, key: string, value: boolean) => {
    const newPerms = { ...member.permissions, [key]: value };
    if (key === "is_admin" && value) {
      newPerms.can_send_messages = true;
      newPerms.can_edit_group = true;
    }
    await supabase.from("group_members").update({ permissions: newPerms } as any).eq("id", memberId);
    toast({ title: "Permissions updated" });
    fetchAll();
  };

  const promoteToAdmin = async (memberId: string, member: MemberRow) => {
    await supabase.from("group_members").update({
      role: "admin",
      permissions: { can_send_messages: true, can_edit_group: true, is_admin: true },
    } as any).eq("id", memberId);
    toast({ title: "Promoted to admin!" }); fetchAll();
  };

  const selectedGroup = groups.find((g) => g.id === activeGroup);
  const groupMembers = activeGroup ? (members[activeGroup] || []) : [];
  const groupGoals = activeGroup ? (goals[activeGroup] || []) : [];
  const groupNotes = activeGroup ? (notes[activeGroup] || []) : [];
  const isOwner = selectedGroup?.created_by === user?.id;
  const myMember = groupMembers.find((m) => m.user_id === user?.id);
  const isAdmin = isOwner || myMember?.permissions?.is_admin;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Study Groups
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">{groups.length} groups · Collaborate with friends</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Group</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Create Study Group</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  {GROUP_COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create Group</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search groups..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} className="pl-9" />
          </div>
          {(() => {
            const filtered = groups.filter((g) =>
              g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
              g.description.toLowerCase().includes(groupSearch.toLowerCase())
            );
            return filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-display font-semibold">{groups.length === 0 ? "No groups yet" : "No matching groups"}</p>
              </div>
            ) : (
              filtered.map((group) => {
                const gMembers = members[group.id] || [];
                const gGoals = goals[group.id] || [];
                const completedGoals = gGoals.filter((g) => g.completed).length;
                return (
                  <button key={group.id} onClick={() => setActiveGroup(group.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cyber-border ${
                      activeGroup === group.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ backgroundColor: `${group.color}20`, color: group.color }}>
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-sm truncate">{group.name}</h3>
                        <p className="text-xs text-muted-foreground">{gMembers.length} members · {completedGoals}/{gGoals.length} goals</p>
                      </div>
                    </div>
                  </button>
                );
              })
            );
          })()}
        </div>

        {/* Group detail */}
        {selectedGroup ? (
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold">{selectedGroup.name}</h2>
                {selectedGroup.description && <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>}
                {isOwner && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium mt-1 inline-block">Owner</span>}
                {!isOwner && isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium mt-1 inline-block">Admin</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/group-chat/${selectedGroup.id}`)}>
                  <MessageCircle className="w-3.5 h-3.5" /> Chat
                </Button>
                {isOwner && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(selectedGroup.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary rounded-lg p-1">
              {(["notes", "goals", "members", ...(isAdmin ? ["permissions"] as const : [])] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all capitalize ${
                    activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "permissions" ? "⚙ Perms" : tab}
                </button>
              ))}
            </div>

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Note title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="flex-1" />
                  <Button onClick={() => handleAddNote(selectedGroup.id)} disabled={!noteTitle.trim()} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(selectedGroup.id, file); e.target.value = ""; }} />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                    </Button>
                  </label>
                </div>
                {noteTitle && <Textarea placeholder="Note content (optional)..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={3} />}
                <div className="space-y-2">
                  {groupNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Add one above!</p>
                  ) : (
                    groupNotes.map((note) => {
                      const author = profiles[note.author_id];
                      return (
                        <div key={note.id} className="p-4 rounded-xl border border-border bg-card/50 space-y-2 cyber-border">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className={`w-4 h-4 ${note.file_url ? "text-accent" : "text-primary"} shrink-0`} />
                              <h4 className="font-medium text-sm">{note.title}</h4>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {author?.display_name || author?.username || "Unknown"} · {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {note.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>}
                          {note.file_url && (
                            <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Download className="w-3.5 h-3.5" /> {note.file_name || "Download file"}
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Goals Tab */}
            {activeTab === "goals" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Add a goal..." value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddGoal(selectedGroup.id)} className="flex-1" />
                  <Button variant="outline" onClick={() => handleAddGoal(selectedGroup.id)} disabled={!newGoal.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {groupGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No goals yet</p>
                  ) : (
                    groupGoals.map((goal) => (
                      <div key={goal.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        goal.completed ? "bg-success/5 border-success/20 opacity-70" : "border-border bg-secondary/30"
                      }`}>
                        <button onClick={() => toggleGoal(goal.id, goal.completed)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                            goal.completed ? "border-success bg-success" : "border-muted-foreground/30 hover:border-primary"
                          }`}>
                          {goal.completed && <Check className="w-3 h-3 text-success-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${goal.completed ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
                          {goal.assignee_id && profiles[goal.assignee_id] && (
                            <p className="text-xs text-muted-foreground">{profiles[goal.assignee_id].display_name || profiles[goal.assignee_id].username}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === "members" && (
              <div className="space-y-4">
                {(isOwner || isAdmin) && friends.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={addMemberId} onValueChange={setAddMemberId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Add a friend to this group..." /></SelectTrigger>
                      <SelectContent>
                        {friends.filter((f) => !groupMembers.some((m) => m.user_id === f.id)).map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.display_name || f.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => handleAddMember(selectedGroup.id)} disabled={!addMemberId}>
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  {groupMembers.map((m) => {
                    const profile = profiles[m.user_id];
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: selectedGroup.color, color: "white" }}>
                            {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{profile?.display_name || profile?.username || "User"}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                              {m.permissions?.is_admin && m.role !== "owner" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">Admin</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.user_id === user?.id && <span className="text-xs text-primary font-medium">You</span>}
                          {!m.permissions?.can_send_messages && <Lock className="w-3 h-3 text-muted-foreground" title="Muted" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === "permissions" && isAdmin && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Manage member permissions. Only admins and the group owner can modify these.</p>
                {groupMembers.filter((m) => m.user_id !== user?.id).map((m) => {
                  const profile = profiles[m.user_id];
                  return (
                    <div key={m.id} className="p-4 rounded-xl border border-border bg-card space-y-3 cyber-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: selectedGroup.color, color: "white" }}>
                            {(profile?.display_name || profile?.username || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{profile?.display_name || profile?.username || "User"}</p>
                            <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                          </div>
                        </div>
                        {isOwner && m.role !== "owner" && !m.permissions?.is_admin && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => promoteToAdmin(m.id, m)}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Make Admin
                          </Button>
                        )}
                      </div>
                      {m.role !== "owner" && (
                        <div className="space-y-2 pl-11">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">Can send messages</span>
                            </div>
                            <Switch checked={m.permissions?.can_send_messages ?? true}
                              onCheckedChange={(v) => updateMemberPermission(m.id, m, "can_send_messages", v)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">Can edit group info</span>
                            </div>
                            <Switch checked={m.permissions?.can_edit_group ?? false}
                              onCheckedChange={(v) => updateMemberPermission(m.id, m, "can_edit_group", v)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs">Admin privileges</span>
                            </div>
                            <Switch checked={m.permissions?.is_admin ?? false}
                              onCheckedChange={(v) => updateMemberPermission(m.id, m, "is_admin", v)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {groupMembers.filter((m) => m.user_id !== user?.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No other members to manage</p>
                )}
              </div>
            )}
          </div>
        ) : groups.length > 0 ? (
          <div className="lg:col-span-2 flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">Select a group to view details</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
