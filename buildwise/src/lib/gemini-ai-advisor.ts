import type { AiAnalysisResult, Project } from "@workspace/api-client-react";
import firstRegistrarsProcessManual from "../../../Firstregistrarsprocess.md?raw";
import { getProjectDocumentation } from "@/lib/project-documentation";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type GeminiCandidate = {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

const analysisSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A concise executive summary of the project's current health, outlook, and next move.",
    },
    completionRateAnalysis: {
      type: ["string", "null"],
      description:
        "A brief interpretation of the project's completion rate and what it implies.",
    },
    profitabilityScore: {
      type: ["number", "null"],
      description:
        "A 0 to 100 predicted profitability score based only on the supplied project data.",
    },
    recommendation: {
      type: ["string", "null"],
      enum: ["continue", "pause", "stop", "expand", "review", null],
      description: "The clearest recommended decision for the project.",
    },
    insights: {
      type: "array",
      items: { type: "string" },
      description: "Three to five strategic insights.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Three to five concrete improvement suggestions.",
    },
    risks: {
      type: "array",
      items: { type: "string" },
      description: "Three to five project risks or watchouts.",
    },
    versionAdvice: {
      type: ["string", "null"],
      description:
        "One short recommendation about whether a V2 or expansion phase makes sense.",
    },
    countryAnalysis: {
      type: ["string", "null"],
      description:
        "A short note about market or execution implications for the project's country, if applicable.",
    },
  },
  required: ["summary", "insights", "suggestions", "risks"],
} as const;

function buildPrompt(project: Project): string {
  const projectDocumentation = getProjectDocumentation(project.id);

  return [
    "You are an AI business advisor for a construction and project management platform.",
    "Analyze the project using the structured project data and the First Registrars operations manual provided below.",
    "Judge how operationally vital or strategically relevant this project is to First Registrars.",
    "Consider whether the project supports critical registry workflows such as shareholder records, dividends, share transfers, probate, KYC/compliance, customer service, reporting, integrations, or core IT operations.",
    "Use the project documentation section when it is provided. Treat it as the most detailed business context for the project.",
    "If the project appears weakly connected to the manual, say so clearly and reflect that in the recommendation, insights, risks, and suggestions.",
    "If the data is sparse, make conservative assumptions and mention them briefly in the summary.",
    "Keep the tone executive, practical, and concise.",
    "Return JSON only and make each list item specific rather than generic.",
    "",
    "First Registrars operations manual:",
    firstRegistrarsProcessManual,
    "",
    "Project documentation:",
    projectDocumentation || "No project-specific documentation has been added yet.",
    "",
    "Project data:",
    JSON.stringify(
      {
        id: project.id,
        name: project.name,
        description: project.description ?? null,
        type: project.type,
        status: project.status,
        priority: project.priority,
        country: project.country ?? null,
        startDate: project.startDate ?? null,
        endDate: project.endDate ?? null,
        budget: project.budget ?? null,
        completionRate: project.completionRate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      null,
      2,
    ),
  ].join("\n");
}

function extractResponseText(payload: GeminiResponse): string {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (text) return text;

  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }

  if (payload.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request: ${payload.promptFeedback.blockReason}`);
  }

  throw new Error("Gemini returned an empty response.");
}

function normalizeAnalysis(result: Partial<AiAnalysisResult>): AiAnalysisResult {
  return {
    summary: result.summary?.trim() || "No summary was returned by Gemini.",
    completionRateAnalysis: result.completionRateAnalysis ?? null,
    profitabilityScore:
      typeof result.profitabilityScore === "number"
        ? Math.max(0, Math.min(100, Math.round(result.profitabilityScore)))
        : null,
    recommendation: result.recommendation ?? "review",
    insights: (result.insights ?? []).filter(Boolean),
    suggestions: (result.suggestions ?? []).filter(Boolean),
    risks: (result.risks ?? []).filter(Boolean),
    versionAdvice: result.versionAdvice ?? null,
    countryAnalysis: result.countryAnalysis ?? null,
  };
}

export async function analyzeProjectWithGemini(project: Project): Promise<AiAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Gemini is not configured yet. Add VITE_GEMINI_API_KEY to buildwise/.env and restart the app.",
    );
  }

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(project) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseJsonSchema: analysisSchema,
      },
    }),
  });

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini request failed.");
  }

  const text = extractResponseText(payload);
  const parsed = JSON.parse(text) as Partial<AiAnalysisResult>;

  return normalizeAnalysis(parsed);
}
