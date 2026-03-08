import { useState, useMemo } from "react";
import { useExtrasStore, Resource } from "@/stores/useExtrasStore";
import { useStudyStore } from "@/stores/useStudyStore";
import {
  Library, Plus, Trash2, ExternalLink, Search,
  Link2, Video, FileText, Globe, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICONS: Record<string, any> = {
  link: Link2,
  video: Video,
  pdf: FileText,
  article: Globe,
  other: Library,
};

const TYPE_COLORS: Record<string, string> = {
  link: "text-primary",
  video: "text-destructive",
  pdf: "text-accent",
  article: "text-success",
  other: "text-muted-foreground",
};

export default function Resources() {
  const { resources, addResource, deleteResource } = useExtrasStore();
  const { subjectConfigs, subjects } = useStudyStore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<Resource["type"]>("link");
  const [newSubject, setNewSubject] = useState("General");
  const [newNotes, setNewNotes] = useState("");
  const [newTags, setNewTags] = useState("");

  const allSubjects = [...new Set([...subjects, ...subjectConfigs.map((s) => s.name)])];

  const filtered = useMemo(() => {
    let result = [...resources];
    if (filterSubject !== "all") result = result.filter((r) => r.subject === filterSubject);
    if (filterType !== "all") result = result.filter((r) => r.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }, [resources, filterSubject, filterType, search]);

  const handleCreate = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    addResource({
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: newTitle.trim(),
      url: newUrl.trim(),
      type: newType,
      subject: newSubject,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      addedAt: new Date().toISOString(),
      notes: newNotes,
    });
    setNewTitle("");
    setNewUrl("");
    setNewNotes("");
    setNewTags("");
    setCreateOpen(false);
    toast({ title: "Resource saved!" });
  };

  const stats = useMemo(() => {
    const types: Record<string, number> = {};
    resources.forEach((r) => { types[r.type] = (types[r.type] || 0) + 1; });
    return types;
  }, [resources]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Library className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Resources
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {resources.length} saved resources
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Resource</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Save Resource</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
              <Input placeholder="URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} type="url" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newType} onValueChange={(v) => setNewType(v as Resource["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">🔗 Link</SelectItem>
                    <SelectItem value="video">🎥 Video</SelectItem>
                    <SelectItem value="pdf">📄 PDF</SelectItem>
                    <SelectItem value="article">📰 Article</SelectItem>
                    <SelectItem value="other">📦 Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newSubject} onValueChange={setNewSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    {allSubjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} />
              <Input placeholder="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
              <Button onClick={handleCreate} disabled={!newTitle.trim() || !newUrl.trim()} className="w-full">
                Save Resource
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      {resources.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(stats).map(([type, count]) => {
            const Icon = TYPE_ICONS[type] || Library;
            return (
              <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs">
                <Icon className={`w-3.5 h-3.5 ${TYPE_COLORS[type]}`} />
                <span className="capitalize">{type}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
            <SelectItem value="article">Articles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resource list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Library className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold text-lg">
            {resources.length === 0 ? "No resources yet" : "No matching resources"}
          </p>
          <p className="text-sm mt-1">Save links, videos, and PDFs for quick access.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((res) => {
            const Icon = TYPE_ICONS[res.type] || Library;
            return (
              <div key={res.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group">
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${TYPE_COLORS[res.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{res.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{res.url}</p>
                  {res.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{res.notes}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{res.subject}</span>
                    {res.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={res.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteResource(res.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
