import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, X } from "lucide-react";

interface PendingUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role?: string;
}

export default function Approvals() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("approval_status", "pending");
    if (data) {
      const enriched: PendingUser[] = [];
      for (const p of data) {
        const { data: r } = await (supabase.rpc as any)("get_user_role", { _user_id: p.id });
        enriched.push({ ...p, role: r || "student" });
      }
      setPending(enriched);
    }
    setLoading(false);
  };

  const approve = async (userId: string) => {
    await supabase.from("profiles").update({ approval_status: "approved" } as any).eq("id", userId);
    toast({ title: "User approved!" });
    fetchPending();
  };

  const reject = async (userId: string) => {
    await supabase.from("profiles").update({ approval_status: "rejected" } as any).eq("id", userId);
    toast({ title: "User rejected" });
    fetchPending();
  };

  if (role !== "admin" && role !== "teacher") {
    return <div className="p-8 text-center text-muted-foreground">Access denied</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Approval Requests</h1>
        {pending.length > 0 && <Badge variant="destructive">{pending.length}</Badge>}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : pending.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No pending approval requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(u.display_name || u.username)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{u.display_name || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username} · {u.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(u.id)} className="gap-1"><Check className="w-3.5 h-3.5" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => reject(u.id)} className="gap-1"><X className="w-3.5 h-3.5" /> Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
