import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, topic, count = 4, difficulty = "medium", type = "quiz" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const difficultyPrompt = {
      "very-easy": "very easy, basic recall and recognition level",
      "easy": "easy, simple understanding and comprehension",
      "medium": "medium difficulty, application and analysis level",
      "hard": "hard, requiring synthesis and deep analysis",
      "expert": "expert level, requiring critical thinking, edge cases, and nuanced understanding",
    }[difficulty] || "medium difficulty";

    const isFlashcards = type === "flashcards";

    const systemPrompt = isFlashcards
      ? `You are a flashcard generator for students. Generate study flashcards at ${difficultyPrompt}. Return valid JSON only.`
      : `You are a quiz generator for students. Generate multiple-choice questions with exactly 4 options each at ${difficultyPrompt}. Return valid JSON only.`;

    const userPrompt = isFlashcards
      ? `Generate ${count} study flashcards about "${topic}" in the subject "${subject}" at ${difficultyPrompt}. Return a JSON object with a "flashcards" array where each object has: "front" (question/prompt string), "back" (answer/explanation string). Return ONLY the JSON, no other text.`
      : `Generate ${count} multiple-choice quiz questions about "${topic}" in the subject "${subject}" at ${difficultyPrompt}. Return a JSON array where each object has: "question" (string), "options" (array of 4 strings), "correctIndex" (0-3 integer), "explanation" (brief string explaining the correct answer). Return ONLY the JSON array, no other text.`;

    const toolDef = isFlashcards
      ? {
          type: "function" as const,
          function: {
            name: "generate_flashcards",
            description: "Generate flashcards",
            parameters: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: { type: "string" },
                      back: { type: "string" },
                    },
                    required: ["front", "back"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["flashcards"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function" as const,
          function: {
            name: "generate_quiz",
            description: "Generate quiz questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctIndex: { type: "integer" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: isFlashcards ? "generate_flashcards" : "generate_quiz" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gen error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate content" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(isFlashcards ? { flashcards: args.flashcards } : { questions: args.questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: parse content directly
    const content = data.choices?.[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    
    return new Response(JSON.stringify(isFlashcards ? { flashcards: parsed.flashcards || parsed } : { questions: parsed.questions || parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gen error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
