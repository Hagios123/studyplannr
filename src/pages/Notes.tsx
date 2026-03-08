import { useState, useMemo } from "react";
import { useExtrasStore, Note } from "@/stores/useExtrasStore";
import { useStudyStore } from "@/stores/useStudyStore";
import {
  FileText, Plus, Pin, PinOff, Trash2, Search, Sparkles, Loader2,
  ChevronLeft, Save, Tag, Download, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote, togglePinNote } = useExtrasStore();
  const { subjectConfigs, subjects } = useStudyStore();
  const { toast } = useToast();

  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "edit">("list");

  const allSubjects = [...new Set([...subjects, ...subjectConfigs.map((s) => s.name)])];

  const editingNote = notes.find((n) => n.id === editing);

  const filtered = useMemo(() => {
    let result = [...notes];
    if (filterSubject !== "all") result = result.filter((n) => n.subject === filterSubject);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, filterSubject, search]);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const note: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: newTitle.trim(),
      content: newContent,
      subject: newSubject || "General",
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    };
    addNote(note);
    setNewTitle("");
    setNewContent("");
    setNewTags("");
    setCreateOpen(false);
    setEditing(note.id);
    setViewMode("edit");
    toast({ title: "Note created" });
  };

  const handleSummarize = async () => {
    if (!editingNote || editingNote.content.length < 30) {
      toast({ title: "Need more content", description: "Write at least 30 characters to summarize.", variant: "destructive" });
      return;
    }
    setSummarizing(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("summarize", {
        body: { content: editingNote.content, type: "notes" },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
      } else {
        setSummary(data.summary);
        toast({ title: "Summary generated!" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to summarize", variant: "destructive" });
    }
    setSummarizing(false);
  };

  const handleExportPDF = () => {
    if (!editingNote) return;
    // Generate a printable HTML and trigger print dialog (acts as PDF export)
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Popup blocked", description: "Please allow popups to export PDF.", variant: "destructive" });
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${editingNote.title}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
          h1 { font-size: 24px; border-bottom: 2px solid #0891b2; padding-bottom: 8px; }
          h2 { font-size: 20px; color: #0891b2; margin-top: 24px; }
          h3 { font-size: 16px; color: #334155; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
          .tags { display: flex; gap: 6px; margin-top: 8px; }
          .tag { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          pre { background: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
          code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
          blockquote { border-left: 3px solid #0891b2; padding-left: 12px; color: #475569; }
          ul, ol { padding-left: 24px; }
          li { margin-bottom: 4px; }
          .summary { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin-top: 24px; }
          .summary h2 { color: #0d9488; margin-top: 0; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>${editingNote.title}</h1>
        <div class="meta">
          ${editingNote.subject} · Updated ${new Date(editingNote.updatedAt).toLocaleDateString()}
          ${editingNote.tags.length > 0 ? `<div class="tags">${editingNote.tags.map(t => `<span class="tag">#${t}</span>`).join("")}</div>` : ""}
        </div>
        <div>${editingNote.content.replace(/\n/g, "<br>")}</div>
        ${summary ? `<div class="summary"><h2>🤖 AI Summary</h2><div>${summary.replace(/\n/g, "<br>")}</div></div>` : ""}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
    toast({ title: "PDF export ready", description: "Use the print dialog to save as PDF." });
  };

  if (viewMode === "edit" && editingNote) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setViewMode("list"); setSummary(null); }}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <input
              value={editingNote.title}
              onChange={(e) => updateNote(editingNote.id, { title: e.target.value })}
              className="text-xl font-display font-bold bg-transparent border-none outline-none w-full"
              placeholder="Note title..."
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingNote.subject} · Updated {new Date(editingNote.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSummarize}
              disabled={summarizing}
            >
              {summarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Summarize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportPDF}
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => togglePinNote(editingNote.id)}
            >
              {editingNote.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {editingNote.pinned ? "Unpin" : "Pin"}
            </Button>
          </div>
        </div>

        <Textarea
          value={editingNote.content}
          onChange={(e) => updateNote(editingNote.id, { content: e.target.value })}
          className="min-h-[40vh] font-mono text-sm resize-none"
          placeholder="Write your notes here... (Markdown supported)"
        />

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Input
            value={editingNote.tags.join(", ")}
            onChange={(e) => updateNote(editingNote.id, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="Tags (comma separated)"
            className="flex-1"
          />
        </div>

        {/* AI Summary */}
        {summary && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-primary">AI Summary</p>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {editingNote.content.length > 50 && (
          <div className="p-4 rounded-xl border border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Preview</p>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{editingNote.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Notes
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {notes.length} notes · Markdown supported · AI summaries
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Note title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
              <Select value={newSubject} onValueChange={setNewSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {allSubjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
              <Button onClick={handleCreate} disabled={!newTitle.trim()} className="w-full">
                Create Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold text-lg">
            {notes.length === 0 ? "No notes yet" : "No matching notes"}
          </p>
          <p className="text-sm mt-1">Create your first note to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => { setEditing(note.id); setViewMode("edit"); setSummary(null); }}
              className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold text-sm line-clamp-1 flex-1">{note.title}</h3>
                {note.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                {note.content || "Empty note..."}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{note.subject}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {note.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {note.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">#{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
