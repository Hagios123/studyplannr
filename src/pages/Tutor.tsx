import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "👋 Hello! I'm your AI study tutor. I can help you understand complex topics, summarize chapters, and explain concepts step-by-step. What would you like to learn about today?",
  },
];

export default function Tutor() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulated AI response (replace with real AI later)
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me break it down step by step.\n\nThe key concept here involves understanding the underlying principles first. Think of it like building blocks — each concept supports the next.\n\n**Key takeaway:** Focus on understanding *why* something works, not just *how*. Would you like me to go deeper into any specific part?",
        "Let me help you understand this better.\n\n1. **First**, identify the core components\n2. **Then**, understand how they interact\n3. **Finally**, apply the concept to practice problems\n\nWould you like me to generate some practice questions on this topic?",
        "Great topic! Here's a concise summary:\n\n> The fundamental idea is that complex systems can be broken down into simpler, interacting parts.\n\nI'd recommend starting with the basics and building up. Shall I create some flashcards for this topic?",
      ];
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> AI Tutor
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your Socratic study companion</p>
      </div>

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
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
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
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about your studies..."
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={!input.trim() || isTyping} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
