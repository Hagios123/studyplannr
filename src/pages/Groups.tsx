import { useState } from "react";
import { useExtrasStore, StudyGroup, GroupGoal } from "@/stores/useExtrasStore";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Plus, Trash2, Check, Target, UserPlus, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const GROUP_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(270, 60%, 60%)",
  "hsl(340, 65%, 55%)",
];

export default function Groups() {
  const { groups, addGroup, deleteGroup, addGroupGoal, toggleGroupGoal, updateGroup } = useExtrasStore();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [newGoal, setNewGoal] = useState("");
  const [newMember, setNewMember] = useState("");

  const displayName = profile?.display_name || profile?.username || "You";

  const handleCreate = () => {
    if (!name.trim()) return;
    const group: StudyGroup = {
      id: `grp-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      members: [displayName],
      goals: [],
      createdAt: new Date().toISOString(),
      color,
    };
    addGroup(group);
    setName("");
    setDescription("");
    setCreateOpen(false);
    setActiveGroup(group.id);
    toast({ title: "Study group created!" });
  };

  const handleAddGoal = (groupId: string) => {
    if (!newGoal.trim()) return;
    addGroupGoal(groupId, {
      id: `goal-${Date.now()}`,
      title: newGoal.trim(),
      completed: false,
      assignee: displayName,
    });
    setNewGoal("");
  };

  const handleAddMember = (groupId: string) => {
    if (!newMember.trim()) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.members.includes(newMember.trim())) {
      toast({ title: "Already a member", variant: "destructive" });
      return;
    }
    updateGroup(groupId, { members: [...group.members, newMember.trim()] });
    setNewMember("");
    toast({ title: "Member added" });
  };

  const selectedGroup = groups.find((g) => g.id === activeGroup);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Study Groups
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {groups.length} groups · Collaborate and stay accountable
          </p>
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
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
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
          {groups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-display font-semibold">No groups yet</p>
              <p className="text-sm mt-1">Create a study group to get started.</p>
            </div>
          ) : (
            groups.map((group) => {
              const completedGoals = group.goals.filter((g) => g.completed).length;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    activeGroup === group.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ backgroundColor: `${group.color}20`, color: group.color }}
                    >
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-sm truncate">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.members.length} members · {completedGoals}/{group.goals.length} goals
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Group detail */}
        {selectedGroup ? (
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold">{selectedGroup.name}</h2>
                {selectedGroup.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteGroup(selectedGroup.id); setActiveGroup(null); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Members */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Members ({selectedGroup.members.length})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {selectedGroup.members.map((m) => (
                  <div key={m} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: selectedGroup.color, color: "white" }}
                    >
                      {m[0].toUpperCase()}
                    </div>
                    {m}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add member name..."
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember(selectedGroup.id)}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={() => handleAddMember(selectedGroup.id)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Goals */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" /> Group Goals
              </h3>
              <div className="space-y-2">
                {selectedGroup.goals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      goal.completed ? "bg-success/5 border-success/20 opacity-70" : "border-border bg-secondary/30"
                    }`}
                  >
                    <button
                      onClick={() => toggleGroupGoal(selectedGroup.id, goal.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        goal.completed ? "border-success bg-success" : "border-muted-foreground/30 hover:border-primary"
                      }`}
                    >
                      {goal.completed && <Check className="w-3 h-3 text-success-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${goal.completed ? "line-through text-muted-foreground" : ""}`}>
                        {goal.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{goal.assignee}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a goal..."
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddGoal(selectedGroup.id)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => handleAddGoal(selectedGroup.id)} disabled={!newGoal.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
