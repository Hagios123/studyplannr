import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyStore } from "@/stores/useStudyStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Tutor() {
  const { tasks, subjectConfigs } = useStudyStore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hello! I'm **Nova**, your AI study tutor. I can help you understand complex topics, summarize chapters, and explain concepts step-by-step.\n\nSelect a subject above or just ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if there's a current study task to suggest context
  const today = new Date().toISOString().split("T")[0];
  const currentTasks = tasks.filter((t) => t.date === today && t.status === "pending");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    let assistantSoFar = "";
    const allMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add subject context if selected
    if (selectedSubject !== "all") {
      const sc = subjectConfigs.find((s) => s.name === selectedSubject);
      if (sc) {
        allMessages.unshift({
          role: "user",
          content: `[Context: The student is currently studying ${sc.name}. Topics include: ${sc.topics.join(", ")}. Please focus your answers on this subject.]`,
        });
      }
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: "AI Error", description: errData.error || `Error ${resp.status}`, variant: "destructive" });
        setIsTyping(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id.startsWith("stream-")) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { id: `stream-${Date.now()}`, role: "assistant" as const, content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Connection error", description: "Could not reach AI service", variant: "destructive" });
    }

    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> AI Tutor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your Socratic study companion — powered by AI</p>
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectConfigs.map((sc) => (
              <SelectItem key={sc.name} value={sc.name}>{sc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current task context */}
      {currentTasks.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-accent font-medium">Current study:</span>{" "}
            {currentTasks[0].topic} ({currentTasks[0].subject})
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-accent font-medium">Nova</span>
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-accent font-medium">Nova</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={selectedSubject !== "all" ? `Ask about ${selectedSubject}...` : "Ask anything about your studies..."}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={!input.trim() || isTyping} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
