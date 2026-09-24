import type { APIRoute } from "astro";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  allAssistantProjects,
  assistantKnowledge,
} from "../../data/assistantKnowledge";
import { assistantInstructions } from "../../data/assistantInstructions";

export const prerender = false;

type ChatCategory =
  | "skills"
  | "projects"
  | "experience"
  | "contact"
  | "resume"
  | "about"
  | "out_of_scope";

type ChatLink = {
  label: string;
  href: string;
};

type ChatResponse = {
  answer: string;
  links: ChatLink[];
  confidence: "high" | "medium" | "low";
  category: ChatCategory;
  source?: "openai" | "fallback";
};

type ResponseLanguage = "en" | "pt";

const ChatResponseSchema = z.object({
  answer: z.string(),
  links: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    })
  ),
  confidence: z.enum(["high", "medium", "low"]),
  category: z.enum([
    "skills",
    "projects",
    "experience",
    "contact",
    "resume",
    "about",
    "out_of_scope",
  ]),
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const openaiApiKey = import.meta.env.OPENAI_API_KEY;
const openaiModel = import.meta.env.OPENAI_MODEL || "gpt-5.4-mini";
const hasOpenAIKey =
  Boolean(openaiApiKey) &&
  openaiApiKey !== "replace_with_your_openai_api_key" &&
  openaiApiKey !== "your_openai_api_key_here";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const REPEATED_MESSAGE_WINDOW_MS = 60 * 1000;
const OPENAI_TIMEOUT_MS = 12 * 1000;

type VisitorUsage = {
  requestTimestamps: number[];
  recentMessages: Map<string, number>;
};

const usageByVisitor = new Map<string, VisitorUsage>();

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getVisitorId(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function pruneUsage(usage: VisitorUsage, now: number) {
  usage.requestTimestamps = usage.requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  for (const [message, timestamp] of usage.recentMessages) {
    if (now - timestamp >= REPEATED_MESSAGE_WINDOW_MS) {
      usage.recentMessages.delete(message);
    }
  }
}

function checkUsage(visitorId: string, message: string) {
  const now = Date.now();
  const usage =
    usageByVisitor.get(visitorId) ??
    {
      requestTimestamps: [],
      recentMessages: new Map<string, number>(),
    };

  pruneUsage(usage, now);

  if (usage.requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    usageByVisitor.set(visitorId, usage);
    return {
      allowed: false,
      status: 429,
      error:
        "Too many questions in a short period. Please wait a few minutes and try again.",
    };
  }

  if (usage.recentMessages.has(message)) {
    usageByVisitor.set(visitorId, usage);
    return {
      allowed: false,
      status: 429,
      error:
        "This question was just submitted. Please wait a moment or ask something different.",
    };
  }

  usage.requestTimestamps.push(now);
  usage.recentMessages.set(message, now);
  usageByVisitor.set(visitorId, usage);

  return { allowed: true };
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectQuestionLanguage(question: string): ResponseLanguage {
  const portugueseSignals = [
    " a ",
    " as ",
    " com ",
    " da ",
    " das ",
    " de ",
    " do ",
    " dos ",
    " e ",
    " em ",
    " isso",
    " nao",
    " não",
    " o ",
    " os ",
    " para ",
    " por ",
    " que ",
    " sobre ",
    " um ",
    " uma ",
    " voce",
    " você",
    "bruno tem",
    "como",
    "contato",
    "curriculo",
    "currículo",
    "experiencia",
    "experiência",
    "falar",
    "habilidade",
    "onde",
    "pergunta",
    "pode",
    "posso",
    "projeto",
    "qual",
    "quais",
    "quem",
    "salario",
    "salário",
    "trabalho",
  ];

  const paddedQuestion = ` ${question} `;
  return includesAny(paddedQuestion, portugueseSignals) ? "pt" : "en";
}

function pickCategory(question: string): ChatCategory {
  if (
    includesAny(question, [
      "salary",
      "salario",
      "salário",
      "private",
      "privado",
      "personal document",
      "documento pessoal",
    ])
  ) {
    return "out_of_scope";
  }

  if (
    includesAny(question, [
      "contact",
      "email",
      "hire",
      "hiring",
      "work together",
      "contratar",
      "contato",
      "falar",
    ])
  ) {
    return "contact";
  }

  if (
    includesAny(question, [
      "resume",
      "cv",
      "curriculo",
      "currículo",
      "curriculum",
      "download",
    ])
  ) {
    return "resume";
  }

  if (
    includesAny(question, [
      "experience",
      "experiences",
      "career",
      "background",
      "worked",
      "trabalhou",
      "experiencia",
      "experiência",
      "trajetoria",
      "trajetória",
    ])
  ) {
    return "experience";
  }

  if (
    includesAny(question, [
      "project",
      "projects",
      "case",
      "work",
      "world bank",
      "comgas",
      "canguru",
      "projeto",
      "portfolio",
    ])
  ) {
    return "projects";
  }

  if (
    includesAny(question, [
      "skill",
      "skills",
      "ux",
      "product design",
      "research",
      "design system",
      "habilidade",
      "habilidades",
    ])
  ) {
    return "skills";
  }

  if (includesAny(question, ["about", "bio", "who", "quem", "sobre"])) {
    return "about";
  }

  return "out_of_scope";
}

function findProject(question: string) {
  return allAssistantProjects.find((project) => {
    const searchable = [
      project.slug,
      project.title,
      project.client,
      project.category,
      ...project.skills,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable
      .split(/\s+/)
      .some((word) => word.length > 3 && question.includes(word));
  });
}

function preferredLinks(category: ChatCategory): ChatLink[] {
  return assistantInstructions.preferredLinksByCategory[category] ?? [];
}

function localizedOutOfScopeResponse(
  question: string,
  source: ChatResponse["source"] = "fallback"
): ChatResponse {
  if (detectQuestionLanguage(question) === "pt") {
    return {
      answer:
        "Não tenho informação confiável suficiente sobre isso ainda. Você pode ver os projetos selecionados do Bruno ou entrar em contato para mais contexto.",
      links: [
        { label: "Ver projetos selecionados", href: "/#projects" },
        { label: "Entrar em contato", href: "mailto:contact@brunoux.com" },
      ],
      confidence: "low",
      category: "out_of_scope",
      source,
    };
  }

  return {
    answer:
      "I do not have enough reliable information about that yet. You can explore Bruno's selected work or contact him directly for more context.",
    links: preferredLinks("out_of_scope"),
    confidence: "low",
    category: "out_of_scope",
    source,
  };
}

function removeRawDestinations(answer: string) {
  return answer
    .replace(/\bhttps?:\/\/[^\s)]+/gi, "")
    .replace(/\bmailto:[^\s)]+/gi, "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/(?:^|\s)\/[^\s.,;:!?)]*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function cleanResponseText(response: ChatResponse): ChatResponse {
  return {
    ...response,
    answer: removeRawDestinations(response.answer),
  };
}

function sanitizeResponse(question: string, response: ChatResponse): ChatResponse {
  const category = pickCategory(question);
  const project = findProject(question);

  if (category === "out_of_scope") {
    return cleanResponseText(localizedOutOfScopeResponse(question, response.source));
  }

  if (category === "projects" && project?.url) {
    const hasProjectLink = response.links.some((link) => link.href === project.url);

    return cleanResponseText({
      ...response,
      category: "projects",
      links: hasProjectLink
        ? response.links
        : [
            { label: `View ${project.title}`, href: project.url },
            ...response.links,
          ],
    });
  }

  return cleanResponseText(response);
}

function buildMockResponse(question: string): ChatResponse {
  const category = pickCategory(question);
  const project = findProject(question);

  if (category === "contact") {
    return {
      answer:
        "You can contact Bruno by email or LinkedIn to discuss product design, UX strategy, interface systems, freelance work, remote opportunities, or collaborations.",
      links: preferredLinks("contact"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  if (category === "resume") {
    return {
      answer:
        "Bruno's resume is available as a PDF download. It is the best place to review his professional timeline in a compact format.",
      links: preferredLinks("resume"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  if (category === "experience") {
    const recentExperience = assistantKnowledge.experience
      .slice(0, 3)
      .map((item) => `${item.company} (${item.role})`)
      .join(", ");

    return {
      answer: `Bruno has 10+ years of experience across product design, UX strategy, research, and interface systems. Recent contexts include ${recentExperience}.`,
      links: preferredLinks("experience"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  if (category === "projects") {
    const selectedProject = project ?? assistantKnowledge.featuredProjects[0];

    return {
      answer: `${selectedProject.title} is a strong example of Bruno's work. ${selectedProject.summary} It demonstrates ${selectedProject.skills.slice(0, 3).join(", ")}.`,
      links: selectedProject.url
        ? [
            { label: `View ${selectedProject.title}`, href: selectedProject.url },
            { label: "View selected work", href: "/#projects" },
          ]
        : preferredLinks("projects"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  if (category === "skills") {
    return {
      answer:
        "Bruno works across UX strategy, product design, user research, information architecture, interface systems, prototyping, and usability testing. These skills are visible in projects like World Bank / Ministry of Labor, Comgas, and Canguru.",
      links: preferredLinks("skills"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  if (category === "about") {
    return {
      answer: assistantKnowledge.profile.positioning,
      links: preferredLinks("about"),
      confidence: "high",
      category,
      source: "fallback",
    };
  }

  return localizedOutOfScopeResponse(question);
}

function buildAssistantPrompt() {
  return [
    `You are ${assistantInstructions.identity.name}.`,
    assistantInstructions.identity.role,
    "",
    "Tone:",
    assistantInstructions.tone.map((item) => `- ${item}`).join("\n"),
    "",
    "Language rules:",
    assistantInstructions.language.map((item) => `- ${item}`).join("\n"),
    "",
    "Source of truth:",
    assistantInstructions.sourceOfTruth.map((item) => `- ${item}`).join("\n"),
    "",
    "Safety rules:",
    assistantInstructions.safety.map((item) => `- ${item}`).join("\n"),
    "",
    "Response rules:",
    assistantInstructions.responseRules.map((item) => `- ${item}`).join("\n"),
    "",
    "Return only data that matches the requested JSON schema.",
    "",
    "Knowledge base:",
    JSON.stringify(assistantKnowledge),
  ].join("\n");
}

async function buildOpenAIResponse(question: string): Promise<ChatResponse> {
  if (!hasOpenAIKey) {
    return buildMockResponse(question);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  try {
    const response = await openai.responses.create(
      {
        model: openaiModel,
        instructions: buildAssistantPrompt(),
        input: `Visitor question: ${question}`,
        max_output_tokens: 450,
        store: false,
        text: {
          format: zodTextFormat(
            ChatResponseSchema,
            "portfolio_assistant_response"
          ),
        },
      },
      {
        signal: controller.signal,
      }
    );

    const outputText = response.output_text;

    if (!outputText) {
      return buildMockResponse(question);
    }

    return {
      ...ChatResponseSchema.parse(JSON.parse(outputText)),
      source: "openai",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Bruno's Portfolio Assistant API is ready.",
    }),
    { headers: jsonHeaders }
  );
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const question =
    typeof body === "object" && body !== null && "message" in body
      ? String((body as { message?: unknown }).message ?? "")
      : "";
  const normalizedQuestion = normalizeText(question);

  if (!normalizedQuestion) {
    return new Response(
      JSON.stringify({ error: "Message is required." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  if (question.length > 1000) {
    return new Response(
      JSON.stringify({ error: "Message is too long." }),
      { status: 413, headers: jsonHeaders }
    );
  }

  const usageCheck = checkUsage(getVisitorId(request), normalizedQuestion);

  if (!usageCheck.allowed) {
    return new Response(
      JSON.stringify({ error: usageCheck.error }),
      { status: usageCheck.status, headers: jsonHeaders }
    );
  }

  try {
    const response = sanitizeResponse(
      normalizedQuestion,
      await buildOpenAIResponse(normalizedQuestion)
    );

    return new Response(JSON.stringify(response), {
      headers: jsonHeaders,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: unknown }).status
        : "unknown";

    console.error("Portfolio assistant API error", { status });

    return new Response(JSON.stringify(buildMockResponse(normalizedQuestion)), {
      headers: {
        ...jsonHeaders,
        "x-assistant-fallback": "true",
      },
    });
  }
};
