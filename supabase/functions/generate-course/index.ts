import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, depth = "comprehensive", includeQuiz = true, includeFlashcards = true, includeNotes = true } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "No topic provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const depthDesc = depth === "quick" ? "a brief overview with 3-5 key topics" :
                      depth === "comprehensive" ? "a thorough breakdown with 8-12 subtopics" :
                      "an in-depth deep dive with 15+ detailed subtopics and advanced concepts";

    const systemPrompt = `You are an expert course designer and educator. Create ${depthDesc} for the given topic. The output must be a complete, structured learning plan.`;

    const sections: string[] = ["study_plan"];
    if (includeNotes) sections.push("notes");
    if (includeFlashcards) sections.push("flashcards");
    if (includeQuiz) sections.push("quiz");

    const userPrompt = `Create a complete study course for: "${topic}"

Generate ALL of the following sections:
1. A structured study plan with topics ordered by learning progression
2. Comprehensive study notes in markdown for each topic
3. Flashcards (front/back) covering key concepts
4. Quiz questions with 4 options each

Make content educational, accurate, and progressively structured from fundamentals to advanced concepts.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_course",
            description: "Create a complete study course with plan, notes, flashcards and quiz",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Course title" },
                description: { type: "string", description: "Brief course description (1-2 sentences)" },
                estimatedHours: { type: "number", description: "Estimated total study hours" },
                difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      duration: { type: "number", description: "Minutes to study" },
                      order: { type: "integer" },
                    },
                    required: ["name", "duration", "order"],
                    additionalProperties: false
                  }
                },
                notes: { type: "string", description: "Full study notes in markdown format with headers for each topic" },
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: { type: "string" },
                      back: { type: "string" },
                      topic: { type: "string" },
                    },
                    required: ["front", "back", "topic"],
                    additionalProperties: false
                  }
                },
                quiz: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctIndex: { type: "integer" },
                      explanation: { type: "string" },
                      topic: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation", "topic"],
                    additionalProperties: false
                  }
                },
              },
              required: ["title", "description", "estimatedHours", "difficulty", "topics", "notes", "flashcards", "quiz"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_course" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Course gen error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate course" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const course = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ course }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to parse course data" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("course gen error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
