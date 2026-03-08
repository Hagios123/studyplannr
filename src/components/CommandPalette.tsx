import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStudyStore } from "@/stores/useStudyStore";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  HelpCircle,
  MessageSquare,
  BarChart3,
  Search,
  BookOpen,
  FileText,
  Heart,
  Library,
  Users,
} from "lucide-react";

const pages = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Planner", to: "/planner", icon: CalendarDays },
  { name: "Flashcards", to: "/flashcards", icon: Layers },
  { name: "Quiz", to: "/quiz", icon: HelpCircle },
  { name: "AI Tutor", to: "/tutor", icon: MessageSquare },
  { name: "Analytics", to: "/analytics", icon: BarChart3 },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tasks, flashcards, subjectConfigs } = useStudyStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => t.date === today).slice(0, 5);
  }, [tasks]);

  const recentCards = useMemo(
    () => flashcards.filter((f) => f.id.startsWith("ai-") || f.id.startsWith("sched-")).slice(0, 5),
    [flashcards]
  );

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, tasks, flashcards..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.to} onSelect={() => go(p.to)}>
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.name}
            </CommandItem>
          ))}
        </CommandGroup>

        {todayTasks.length > 0 && (
          <CommandGroup heading="Today's Tasks">
            {todayTasks.map((t) => (
              <CommandItem key={t.id} onSelect={() => go("/planner")}>
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{t.topic}</span>
                <span className="text-xs text-muted-foreground">{t.subject}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {recentCards.length > 0 && (
          <CommandGroup heading="Flashcards">
            {recentCards.map((f) => (
              <CommandItem key={f.id} onSelect={() => go("/flashcards")}>
                <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{f.front}</span>
                <span className="text-xs text-muted-foreground">{f.subject}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {subjectConfigs.length > 0 && (
          <CommandGroup heading="Subjects">
            {subjectConfigs.map((s) => (
              <CommandItem key={s.name} onSelect={() => go("/planner")}>
                <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                {s.name}
                <span className="text-xs text-muted-foreground ml-2">{s.topics.length} topics</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
