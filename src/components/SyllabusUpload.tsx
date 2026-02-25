import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Difficulty } from "@/stores/useStudyStore";

interface ExtractedSubject {
  name: string;
  difficulty?: Difficulty;
  topics: string[];
}

interface ExtractedDeadline {
  description: string;
  date?: string;
}

interface SyllabusUploadProps {
  onExtracted: (subjects: ExtractedSubject[], deadlines: ExtractedDeadline[]) => void;
}

export function SyllabusUpload({ onExtracted }: SyllabusUploadProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file) return;
    
    setFileName(file.name);
    setLoading(true);
    setExtracted(false);

    try {
      // Read file as text (works for txt, md, etc.)
      // For PDFs we extract text client-side
      let text = "";

      if (file.type === "application/pdf") {
        // For PDFs, read as array buffer and extract text
        // Simple approach: use FileReader and send raw text
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        // Extract visible text from PDF (basic extraction)
        text = extractTextFromPDF(uint8);
        if (!text.trim()) {
          // Fallback: just send filename info
          text = `PDF file: ${file.name}. Please generate topics for a typical syllabus with this name.`;
        }
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        toast({ title: "Empty file", description: "Could not read text from the file", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("parse-syllabus", {
        body: { text },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      const subjects = (data?.subjects || []) as ExtractedSubject[];
      const deadlines = (data?.deadlines || []) as ExtractedDeadline[];

      if (subjects.length === 0) {
        toast({ title: "No subjects found", description: "Try a different file", variant: "destructive" });
      } else {
        setExtracted(true);
        toast({
          title: "Syllabus parsed!",
          description: `Found ${subjects.length} subject(s) with ${subjects.reduce((a, s) => a + s.topics.length, 0)} topics`,
        });
        onExtracted(subjects, deadlines);
      }
    } catch (e: any) {
      console.error("Upload error:", e);
      toast({ title: "Error", description: e.message || "Failed to parse syllabus", variant: "destructive" });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors flex flex-col items-center gap-3 text-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div>
              <p className="font-medium text-sm">Parsing syllabus with AI...</p>
              <p className="text-xs text-muted-foreground">Extracting subjects and topics</p>
            </div>
          </>
        ) : extracted ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div>
              <p className="font-medium text-sm text-success">Syllabus extracted!</p>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Upload Syllabus PDF</p>
              <p className="text-xs text-muted-foreground">PDF, TXT, or MD — AI will extract topics automatically</p>
            </div>
          </>
        )}
      </button>

      {fileName && !loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>{fileName}</span>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-primary hover:underline ml-auto"
          >
            Upload different file
          </button>
        </div>
      )}
    </div>
  );
}

// Basic PDF text extraction (extracts visible strings from PDF binary)
function extractTextFromPDF(data: Uint8Array): string {
  const text: string[] = [];
  const str = new TextDecoder("latin1").decode(data);
  
  // Extract text between BT and ET markers (basic text objects)
  const btRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btRegex.exec(str)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      text.push(tjMatch[1]);
    }
    // TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const parts = arrMatch[1].match(/\(([^)]*)\)/g);
      if (parts) {
        text.push(parts.map((p) => p.slice(1, -1)).join(""));
      }
    }
  }

  return text.join(" ").replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
}
