import { useState, useEffect, useCallback, useRef } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { Bell, X, BookOpen, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface StudyNotification {
  id: string;
  taskId: string;
  subject: string;
  topic: string;
  type: "study-time" | "quiz-ready";
  dismissed: boolean;
}

export function StudyNotificationProvider({ children }: { children: React.ReactNode }) {
  const { tasks } = useStudyStore();
  const [notifications, setNotifications] = useState<StudyNotification[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const notifiedRef = useRef<Set<string>>(new Set());

  const checkSchedule = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const pendingTasks = tasks.filter(
      (t) => t.date === today && t.status === "pending" && t.timeSlot <= currentTime
    );

    pendingTasks.forEach((task) => {
      const key = `${task.id}-${today}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);

        const notification: StudyNotification = {
          id: `notif-${Date.now()}-${task.id}`,
          taskId: task.id,
          subject: task.subject,
          topic: task.topic,
          type: "study-time",
          dismissed: false,
        };

        setNotifications((prev) => [...prev, notification]);

        toast({
          title: `📚 Time to study: ${task.subject}`,
          description: `${task.topic} — ${task.duration} min session`,
          duration: 10000,
        });
      }
    });
  }, [tasks, toast]);

  useEffect(() => {
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000); // check every 30 sec
    return () => clearInterval(interval);
  }, [checkSchedule]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      {children}
      {/* Notification popup overlay */}
      {notifications.filter((n) => !n.dismissed).length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications
            .filter((n) => !n.dismissed)
            .slice(-3)
            .map((notif) => (
              <div
                key={notif.id}
                className="bg-card border border-primary/30 rounded-xl p-4 shadow-lg shadow-primary/10 animate-fade-in"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm">
                      Time to study: {notif.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.topic}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          navigate("/learn");
                          dismissNotification(notif.id);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" /> Take Quiz
                      </button>
                      <button
                        onClick={() => {
                          navigate("/tutor");
                          dismissNotification(notif.id);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> Study Notes
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
