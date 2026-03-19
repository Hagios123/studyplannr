import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Send, Clock, CheckCircle } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  year_level: string | null;
  created_at: string;
  created_by: string;
}

interface Recipient {
  id: string;
  assignment_id: string;
  user_id: string;
  submitted: boolean;
  submission_text: string | null;
  grade: string | null;
}

export default function Assignments() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  const isTeacherOrAdmin = role === "teacher" || role === "admin";

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: a } = await (supabase.from as any)("assignments").select("*").order("created_at", { ascending: false });
    if (a) setAssignments(a);
    const { data: r } = await (supabase.from as any)("assignment_recipients").select("*");
    if (r) setRecipients(r);
    setLoading(false);
  };

  const createAssignment = async () => {
    if (!title.trim()) return;
    const { data: a, error } = await (supabase.from as any)("assignments").insert({
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate || null,
      year_level: yearLevel || null,
      created_by: user!.id,
    }).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // If year_level selected, assign to all students in that year
    if (yearLevel && a) {
      const { data: students } = await supabase.from("profiles").select("id").eq("year_level", yearLevel).eq("approval_status", "approved");
      if (students && students.length > 0) {
        await (supabase.from as any)("assignment_recipients").insert(
          students.map((s: any) => ({ assignment_id: a.id, user_id: s.id }))
        );
      }
    }

    toast({ title: "Assignment created!" });
    setTitle(""); setDescription(""); setDueDate(""); setYearLevel("");
    setCreateOpen(false);
    fetchData();
  };

  const submitWork = async (assignmentId: string) => {
    const rec = recipients.find((r) => r.assignment_id === assignmentId && r.user_id === user!.id);
    if (!rec) return;
    await (supabase.from as any)("assignment_recipients").update({
      submitted: true,
      submission_text: submissionText,
      submitted_at: new Date().toISOString(),
    }).eq("id", rec.id);
    toast({ title: "Assignment submitted!" });
    setSubmissionText("");
    setSelectedAssignment(null);
    fetchData();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const myAssignments = isTeacherOrAdmin
    ? assignments
    : assignments.filter((a) => recipients.some((r) => r.assignment_id === a.id && r.user_id === user!.id));

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Assignments</h1>
        </div>
        {isTeacherOrAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="w-4 h-4" /> Create</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description / instructions" rows={4} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Due Date</label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Assign to Year</label>
                    <Select value={yearLevel} onValueChange={setYearLevel}>
                      <SelectTrigger><SelectValue placeholder="All / Select year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st">1st Year</SelectItem>
                        <SelectItem value="2nd">2nd Year</SelectItem>
                        <SelectItem value="3rd">3rd Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={createAssignment} className="w-full">Create Assignment</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {myAssignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{isTeacherOrAdmin ? "No assignments created yet" : "No assignments assigned to you"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myAssignments.map((a) => {
            const myRec = recipients.find((r) => r.assignment_id === a.id && r.user_id === user!.id);
            const totalRecs = recipients.filter((r) => r.assignment_id === a.id);
            const submittedCount = totalRecs.filter((r) => r.submitted).length;

            return (
              <div key={a.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    {a.year_level && <Badge variant="secondary">{a.year_level} Year</Badge>}
                    {myRec?.submitted && <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Submitted</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {a.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                  {isTeacherOrAdmin && <span>{submittedCount}/{totalRecs.length} submitted</span>}
                </div>

                {!isTeacherOrAdmin && myRec && !myRec.submitted && (
                  selectedAssignment === a.id ? (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} placeholder="Your submission..." rows={3} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitWork(a.id)} className="gap-1"><Send className="w-3.5 h-3.5" /> Submit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedAssignment(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setSelectedAssignment(a.id)}>Submit Work</Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
