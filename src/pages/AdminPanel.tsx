import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, BookOpen, Plus, Trash2, Check, X, Ban, UserCheck } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  approval_status: string;
  year_level: string | null;
  studying: string | null;
  avatar_url: string | null;
  role?: string;
}

export default function AdminPanel() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [studyOptions, setStudyOptions] = useState<{ id: string; name: string }[]>([]);
  const [teacherYears, setTeacherYears] = useState<{ id: string; teacher_id: string; year_level: string }[]>([]);
  const [newOption, setNewOption] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (role === "admin") loadData(); }, [role]);

  const loadData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, approval_status, year_level, studying, avatar_url");
    if (profiles) {
      const enriched: UserProfile[] = [];
      for (const p of profiles) {
        const { data: r } = await (supabase.rpc as any)("get_user_role", { _user_id: p.id });
        enriched.push({ ...p, role: r || "student" });
      }
      setUsers(enriched);
    }
    const { data: opts } = await (supabase.from as any)("study_options").select("id, name").order("name");
    if (opts) setStudyOptions(opts);
    const { data: ty } = await (supabase.from as any)("teacher_year_assignments").select("id, teacher_id, year_level");
    if (ty) setTeacherYears(ty);
    setLoading(false);
  };

  const approveUser = async (userId: string) => {
    await supabase.from("profiles").update({ approval_status: "approved" } as any).eq("id", userId);
    toast({ title: "User approved" });
    loadData();
  };

  const banUser = async (userId: string) => {
    await supabase.from("profiles").update({ approval_status: "banned" } as any).eq("id", userId);
    toast({ title: "User banned" });
    loadData();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ approval_status: "approved" } as any).eq("id", userId);
    toast({ title: "User unbanned" });
    loadData();
  };

  const changeRole = async (userId: string, newRole: string) => {
    await (supabase.from as any)("user_roles").delete().eq("user_id", userId);
    await (supabase.from as any)("user_roles").insert({ user_id: userId, role: newRole });
    toast({ title: `Role changed to ${newRole}` });
    loadData();
  };

  const addStudyOption = async () => {
    if (!newOption.trim()) return;
    const { error } = await (supabase.from as any)("study_options").insert({ name: newOption.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewOption("");
    toast({ title: "Study option added" });
    loadData();
  };

  const removeStudyOption = async (id: string) => {
    await (supabase.from as any)("study_options").delete().eq("id", id);
    toast({ title: "Option removed" });
    loadData();
  };

  const assignTeacherYear = async (teacherId: string, yearLevel: string) => {
    const { error } = await (supabase.from as any)("teacher_year_assignments").insert({ teacher_id: teacherId, year_level: yearLevel });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Teacher assigned to year" });
    loadData();
  };

  const removeTeacherYear = async (id: string) => {
    await (supabase.from as any)("teacher_year_assignments").delete().eq("id", id);
    toast({ title: "Assignment removed" });
    loadData();
  };

  if (role !== "admin") return <div className="p-8 text-center text-muted-foreground">Access denied</div>;
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const teachers = users.filter((u) => u.role === "teacher");
  const pendingCount = users.filter((u) => u.approval_status === "pending").length;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { approved: "bg-green-500/10 text-green-500", pending: "bg-yellow-500/10 text-yellow-500", banned: "bg-red-500/10 text-red-500" };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {pendingCount > 0 && <Badge variant="destructive">{pendingCount} pending</Badge>}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> Users</TabsTrigger>
          <TabsTrigger value="options" className="gap-1.5"><BookOpen className="w-4 h-4" /> Study Options</TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5"><UserCheck className="w-4 h-4" /> Teacher Years</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3 mt-4">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="font-medium">{u.display_name || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username} · {u.role} {u.year_level ? `· ${u.year_level} year` : ""} {u.studying ? `· ${u.studying}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(u.approval_status)}
                <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {u.approval_status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => approveUser(u.id)}><Check className="w-3 h-3" /></Button>
                )}
                {u.approval_status !== "banned" ? (
                  <Button size="sm" variant="destructive" onClick={() => banUser(u.id)}><Ban className="w-3 h-3" /></Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => unbanUser(u.id)}>Unban</Button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="options" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="New study option (e.g., Computer Science)" className="flex-1" />
            <Button onClick={addStudyOption} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
          </div>
          <div className="space-y-2">
            {studyOptions.map((opt) => (
              <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <span className="text-sm font-medium">{opt.name}</span>
                <Button size="sm" variant="ghost" onClick={() => removeStudyOption(opt.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            ))}
            {studyOptions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No study options yet. Add some above.</p>}
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4 mt-4">
          {teachers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No teachers registered yet.</p>}
          {teachers.map((t) => {
            const assigned = teacherYears.filter((ty) => ty.teacher_id === t.id);
            return (
              <div key={t.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <p className="font-medium">{t.display_name || t.username}</p>
                <div className="flex flex-wrap gap-2">
                  {assigned.map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-1">
                      {a.year_level} Year
                      <button onClick={() => removeTeacherYear(a.id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                  {["1st", "2nd", "3rd"].filter((y) => !assigned.find((a) => a.year_level === y)).map((y) => (
                    <Button key={y} size="sm" variant="outline" onClick={() => assignTeacherYear(t.id, y)} className="text-xs h-7">
                      + {y} Year
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
