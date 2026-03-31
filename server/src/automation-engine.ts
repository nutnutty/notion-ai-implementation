import type { IncomingMessage } from "node:http";

import {
  type AutomationRecord,
  type AutomationStore,
  type CaptureConversationInput,
  type ClassificationResult,
  type FollowUpRunInput,
  type ListRecordsInput,
  type UpdateRecordStatusInput,
  captureConversationInputSchema,
  classificationResultSchema,
  followUpRunInputSchema,
  listRecordsInputSchema,
  updateRecordStatusInputSchema
} from "./automation-types.js";
import { AutomationStoreManager } from "./automation-store.js";

type CaptureResult = {
  mode: "created" | "updated" | "inbox";
  providerUsed: string;
  record: AutomationRecord;
  classification: ClassificationResult;
  duplicateOfRecordId?: string;
};

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_AUTOMATION_MODEL?.trim() || "gpt-5.4";
const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_AUTOMATION_MODEL?.trim() || "claude-sonnet-4-5";
const OPENAI_RESPONSES_URL = process.env.OPENAI_RESPONSES_URL?.trim() || "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL =
  process.env.ANTHROPIC_MESSAGES_URL?.trim() || "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION?.trim() || "2023-06-01";
const DEFAULT_ASSIGNEE = process.env.AUTOMATION_DEFAULT_ASSIGNEE?.trim() || "";
const DEFAULT_FOLLOW_UP_DAYS = Number(process.env.AUTOMATION_DEFAULT_FOLLOW_UP_DAYS ?? "2");

const taskKeywords = [
  "task",
  "todo",
  "follow up",
  "prepare",
  "write",
  "create",
  "build",
  "implement",
  "fix",
  "review",
  "schedule",
  "draft",
  "ส่ง",
  "ทำ",
  "เตรียม",
  "เขียน",
  "สร้าง",
  "แก้",
  "ติดตาม",
  "อัปเดต",
  "จัด",
  "สรุปให้"
];
const researchKeywords = [
  "research",
  "investigate",
  "analyze",
  "analyse",
  "compare",
  "study",
  "explore",
  "หา",
  "ค้น",
  "วิเคราะห์",
  "เปรียบเทียบ",
  "รีเสิร์ช",
  "ศึกษาข้อมูล",
  "หาข้อมูล"
];
const knowledgeKeywords = [
  "document",
  "knowledge",
  "note",
  "runbook",
  "decision",
  "lesson",
  "playbook",
  "workflow",
  "บันทึก",
  "เก็บความรู้",
  "คู่มือ",
  "บทเรียน",
  "สรุปบทเรียน",
  "กระบวนการ"
];
const incidentKeywords = [
  "incident",
  "bug",
  "error",
  "failed",
  "failure",
  "outage",
  "problem",
  "issue",
  "ปัญหา",
  "ข้อผิดพลาด",
  "ล้มเหลว",
  "ไม่ทำงาน",
  "เสีย",
  "บั๊ก"
];
const completionKeywords = ["done", "completed", "finished", "เสร็จแล้ว", "เรียบร้อยแล้ว", "ปิดงาน"];
const blockedKeywords = ["blocked", "stuck", "ติด blocker", "ติดปัญหา", "blocked by"];

const normalize = (value: string): string => value.trim().toLowerCase();

const countMatches = (text: string, keywords: string[]): number =>
  keywords.reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);

const firstSentence = (value: string): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Untitled";
  }

  const [sentence] = compact.split(/[\n.!?]/, 1);
  const cleaned = sentence
    .replace(/^(please|ช่วย|กรุณา|ต้อง|need to|todo:|task:)\s+/i, "")
    .trim();
  return (cleaned || compact).slice(0, 80);
};

const excerpt = (value: string, maxLength = 220): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
};

const todayIsoDate = (now = new Date()): string => now.toISOString().slice(0, 10);

const addDays = (isoDate: string, count: number): string => {
  const next = new Date(`${isoDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
};

const parseDueDate = (message: string, now = new Date()): string | undefined => {
  const text = normalize(message);
  const explicit = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (explicit) {
    return explicit[1];
  }

  const today = todayIsoDate(now);
  if (/(today|ภายในวันนี้|วันนี้)/.test(text)) {
    return today;
  }
  if (/(tomorrow|พรุ่งนี้)/.test(text)) {
    return addDays(today, 1);
  }
  if (/(this week|สัปดาห์นี้|อาทิตย์นี้)/.test(text)) {
    return addDays(today, 5);
  }
  if (/(next week|สัปดาห์หน้า|อาทิตย์หน้า)/.test(text)) {
    return addDays(today, 7);
  }

  return undefined;
};

const parseReviewDate = (recordType: ClassificationResult["recordType"], dueDate: string | undefined, now = new Date()): string | undefined => {
  const today = todayIsoDate(now);
  if (recordType === "research") {
    return dueDate ?? addDays(today, 7);
  }
  if (recordType === "incident") {
    return dueDate ?? addDays(today, 2);
  }
  if (recordType === "task" || recordType === "todo") {
    return dueDate ?? addDays(today, DEFAULT_FOLLOW_UP_DAYS);
  }
  return undefined;
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const buildTags = (recordType: ClassificationResult["recordType"], message: string): string[] => {
  const tags = [recordType, "automation"];
  if (/[?？]/.test(message) || /(how|what|why|อะไร|อย่างไร)/i.test(message)) {
    tags.push("question");
  }
  if (/(urgent|ด่วน|asap)/i.test(message)) {
    tags.push("urgent");
  }
  return uniqueStrings(tags);
};

const statusFromMessage = (message: string): AutomationRecord["status"] => {
  const text = normalize(message);
  if (countMatches(text, completionKeywords) > 0) {
    return "done";
  }
  if (countMatches(text, blockedKeywords) > 0) {
    return "blocked";
  }
  return "active";
};

const priorityFromMessage = (message: string): AutomationRecord["priority"] => {
  const text = normalize(message);
  if (/(urgent|asap|ด่วนมาก|ทันที)/.test(text)) {
    return "urgent";
  }
  if (/(high priority|important|สำคัญ|ด่วน)/.test(text)) {
    return "high";
  }
  if (/(low priority|ไม่รีบ|ไว้ก่อน)/.test(text)) {
    return "low";
  }
  return "medium";
};

const similarity = (left: string, right: string): number => {
  const leftTerms = new Set(normalize(left).split(/\s+/).filter(Boolean));
  const rightTerms = new Set(normalize(right).split(/\s+/).filter(Boolean));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const term of leftTerms) {
    if (rightTerms.has(term)) {
      overlap += 1;
    }
  }

  return overlap / new Set([...leftTerms, ...rightTerms]).size;
};

const rankExistingRecords = (records: AutomationStore["records"], query: string): AutomationRecord[] =>
  [...records]
    .map((record) => ({
      record,
      score: Math.max(similarity(query, record.title), similarity(query, record.summary))
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry) => entry.record);

const heuristicClassification = (
  input: CaptureConversationInput,
  existingRecords: AutomationRecord[],
  now = new Date()
): ClassificationResult => {
  const text = normalize(input.message);
  const taskScore = countMatches(text, taskKeywords) + (parseDueDate(text, now) ? 2 : 0);
  const researchScore = countMatches(text, researchKeywords) + (/[?？]/.test(text) ? 1 : 0);
  const knowledgeScore = countMatches(text, knowledgeKeywords);
  const incidentScore = countMatches(text, incidentKeywords) * 2;

  let recordType: ClassificationResult["recordType"] = "inbox";
  let bestScore = 0;

  const candidates: Array<[ClassificationResult["recordType"], number]> = [
    ["incident", incidentScore],
    ["research", researchScore],
    ["knowledge", knowledgeScore],
    ["task", taskScore]
  ];

  for (const [candidate, score] of candidates) {
    if (score > bestScore) {
      bestScore = score;
      recordType = candidate;
    }
  }

  if (recordType === "task" && taskScore <= 1 && input.message.length < 90) {
    recordType = "todo";
  }

  const title = firstSentence(input.message);
  const dueDate = parseDueDate(input.message, now);
  const reviewDate = parseReviewDate(recordType, dueDate, now);
  const status = statusFromMessage(input.message);
  const priority = priorityFromMessage(input.message);
  const existingMatch = existingRecords.find(
    (record) =>
      record.type === recordType &&
      (normalize(record.title) === normalize(title) || similarity(record.title, title) >= 0.82)
  );

  const confidenceBase = recordType === "inbox" ? 0.45 : 0.62;
  const confidenceBoost = Math.min(bestScore * 0.11, 0.33);
  const confidencePenalty = existingMatch ? 0.02 : 0;
  const confidence = Number(Math.max(0.4, Math.min(0.98, confidenceBase + confidenceBoost - confidencePenalty)).toFixed(2));
  const needsConfirmation =
    input.policyMode === "ask-first" ||
    (input.policyMode === "hybrid" && !["task", "todo"].includes(recordType)) ||
    confidence < 0.75;

  const summary =
    recordType === "research"
      ? `Research requested: ${excerpt(input.message, 160)}`
      : recordType === "knowledge"
        ? `Knowledge capture candidate: ${excerpt(input.message, 160)}`
        : recordType === "incident"
          ? `Incident report candidate: ${excerpt(input.message, 160)}`
          : recordType === "inbox"
            ? `Ambiguous input routed to inbox: ${excerpt(input.message, 160)}`
            : `Actionable work item captured from conversation: ${excerpt(input.message, 160)}`;

  const reasoning =
    existingMatch !== undefined
      ? `Matched the message to an existing ${recordType} candidate with similar title and content.`
      : `Detected ${recordType} intent from keywords, message structure, and date/urgency cues.`;

  return classificationResultSchema.parse({
    recordType: recordType === "inbox" ? "inbox" : recordType,
    confidence,
    title,
    summary,
    priority,
    dueDate,
    reviewDate,
    assignee: input.assignee || DEFAULT_ASSIGNEE || undefined,
    sourceExcerpt: excerpt(input.message),
    tags: buildTags(recordType, input.message),
    needsConfirmation,
    reasoning,
    suggestedActions: existingMatch
      ? ["append_conversation_excerpt", "link_related_records"]
      : ["create_record", "append_conversation_excerpt", "schedule_follow_up"]
  });
};

const extractOutputText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const output = (payload as { output?: Array<{ content?: Array<{ text?: string }> }> }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  const chunks: string[] = [];
  for (const item of output) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join("\n").trim() : null;
};

const classifyWithOpenAI = async (
  input: CaptureConversationInput,
  existingRecords: AutomationRecord[]
): Promise<ClassificationResult> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const prompt = [
    "Return only JSON.",
    "Classify the message into one of: task, todo, research, knowledge, incident, inbox.",
    "Use concise titles and summaries.",
    "Prefer inbox if ambiguous.",
    "Set needsConfirmation true when confidence is below 0.75 or intent is ambiguous.",
    "",
    `Existing records: ${JSON.stringify(existingRecords.map((record) => ({
      id: record.id,
      type: record.type,
      title: record.title,
      status: record.status
    })))}.`,
    "",
    `Input message: ${input.message}`
  ].join("\n");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI classification failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI classification returned no text output.");
  }

  return classificationResultSchema.parse(JSON.parse(text));
};

const classifyWithAnthropic = async (
  input: CaptureConversationInput,
  existingRecords: AutomationRecord[]
): Promise<ClassificationResult> => {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const prompt = [
    "Return only JSON.",
    "Classify the message into one of: task, todo, research, knowledge, incident, inbox.",
    "Use concise titles and summaries.",
    "Prefer inbox if ambiguous.",
    "Set needsConfirmation true when confidence is below 0.75 or intent is ambiguous.",
    "",
    `Existing records: ${JSON.stringify(existingRecords.map((record) => ({
      id: record.id,
      type: record.type,
      title: record.title,
      status: record.status
    })))}.`,
    "",
    `Input message: ${input.message}`
  ].join("\n");

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic classification failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((part) => part.type === "text" && typeof part.text === "string")?.text;
  if (!text) {
    throw new Error("Anthropic classification returned no text output.");
  }

  return classificationResultSchema.parse(JSON.parse(text));
};

const chooseProvider = async (
  input: CaptureConversationInput,
  existingRecords: AutomationRecord[]
): Promise<{ providerUsed: string; classification: ClassificationResult }> => {
  const heuristic = () => ({
    providerUsed: "heuristic",
    classification: heuristicClassification(input, existingRecords)
  });

  if (input.provider === "heuristic") {
    return heuristic();
  }

  if (input.provider === "openai") {
    return {
      providerUsed: "openai",
      classification: await classifyWithOpenAI(input, existingRecords)
    };
  }

  if (input.provider === "anthropic") {
    return {
      providerUsed: "anthropic",
      classification: await classifyWithAnthropic(input, existingRecords)
    };
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      return {
        providerUsed: "openai",
        classification: await classifyWithOpenAI(input, existingRecords)
      };
    } catch {
      return heuristic();
    }
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    try {
      return {
        providerUsed: "anthropic",
        classification: await classifyWithAnthropic(input, existingRecords)
      };
    } catch {
      return heuristic();
    }
  }

  return heuristic();
};

const applyClassificationToRecord = (
  store: AutomationStore,
  storeManager: AutomationStoreManager,
  input: CaptureConversationInput,
  classification: ClassificationResult,
  nowIso: string,
  existingMatch?: AutomationRecord
): AutomationRecord => {
  if (existingMatch) {
    existingMatch.summary = classification.summary;
    existingMatch.updatedAt = nowIso;
    existingMatch.priority = classification.priority;
    existingMatch.status = existingMatch.status === "done" ? "done" : statusFromMessage(input.message);
    existingMatch.dueDate = classification.dueDate ?? existingMatch.dueDate;
    existingMatch.reviewDate = classification.reviewDate ?? existingMatch.reviewDate;
    existingMatch.assignee = classification.assignee ?? existingMatch.assignee;
    existingMatch.sourceConversationId = input.conversationId;
    existingMatch.sourceMessageId = input.messageId ?? existingMatch.sourceMessageId;
    existingMatch.sourceExcerpt = classification.sourceExcerpt;
    existingMatch.tags = uniqueStrings([...existingMatch.tags, ...classification.tags]);
    existingMatch.metadata = {
      ...existingMatch.metadata,
      sourceChannel: input.channel ?? existingMatch.metadata.sourceChannel ?? "",
      sourceUrl: input.metadata.sourceUrl ?? existingMatch.metadata.sourceUrl ?? "",
      classificationConfidence: String(classification.confidence),
      lastProviderUsed: input.provider,
      lastPolicyMode: input.policyMode
    };
    return existingMatch;
  }

  const record: AutomationRecord = {
    id: storeManager.createId("record"),
    type: classification.needsConfirmation ? "inbox" : classification.recordType,
    title: classification.needsConfirmation ? `Review capture: ${classification.title}` : classification.title,
    summary:
      classification.needsConfirmation
        ? `Pending confirmation for ${classification.recordType}: ${classification.summary}`
        : classification.summary,
    status: classification.needsConfirmation ? "draft" : statusFromMessage(input.message),
    priority: classification.priority,
    createdAt: nowIso,
    updatedAt: nowIso,
    dueDate: classification.dueDate,
    reviewDate: classification.reviewDate,
    assignee: classification.assignee,
    sourceConversationId: input.conversationId,
    sourceMessageId: input.messageId,
    sourceExcerpt: classification.sourceExcerpt,
    relatedRecordIds: [],
    tags: classification.tags,
    metadata: {
      ...input.metadata,
      capturedAs: classification.recordType,
      classificationConfidence: String(classification.confidence),
      providerRequested: input.provider,
      policyMode: input.policyMode,
      sourceChannel: input.channel ?? ""
    }
  };
  store.records.unshift(record);
  return record;
};

const scheduleFollowUpIfNeeded = (
  store: AutomationStore,
  storeManager: AutomationStoreManager,
  record: AutomationRecord
): void => {
  if (record.status === "done" || record.status === "archived") {
    return;
  }

  const scheduledFor = record.dueDate ?? record.reviewDate;
  if (!scheduledFor) {
    return;
  }

  const existing = store.followUpJobs.find(
    (job) =>
      job.recordId === record.id &&
      job.scheduledFor === scheduledFor &&
      job.status === "pending"
  );
  if (existing) {
    return;
  }

  store.followUpJobs.unshift(
    storeManager.buildFollowUp(record.id, scheduledFor, record.type === "research" ? "review research" : "review work")
  );
};

export const createAutomationEngine = (storeManager: AutomationStoreManager) => {
  const captureConversation = async (rawInput: unknown): Promise<CaptureResult> => {
    const input = captureConversationInputSchema.parse(rawInput);
    const nowIso = new Date().toISOString();

    return storeManager.mutate(async (store) => {
      const duplicateCapture = store.conversations.find(
        (capture) =>
          (input.idempotencyKey && capture.idempotencyKey === input.idempotencyKey) ||
          (input.messageId && capture.messageId === input.messageId)
      );

      if (duplicateCapture?.recordId) {
        const duplicateRecord = store.records.find((record) => record.id === duplicateCapture.recordId);
        if (duplicateRecord) {
          const classification = heuristicClassification(input, rankExistingRecords(store.records, input.message));
          store.activities.unshift(
            storeManager.buildActivity(
              "capture_duplicate",
              `Skipped duplicate capture for conversation ${input.conversationId}.`,
              duplicateRecord.id
            )
          );
          return {
            mode: duplicateRecord.type === "inbox" ? "inbox" : "updated",
            providerUsed: "idempotent-replay",
            record: duplicateRecord,
            classification,
            duplicateOfRecordId: duplicateRecord.id
          };
        }
      }

      const existingRecords = rankExistingRecords(store.records, input.message);
      const { providerUsed, classification } = await chooseProvider(input, existingRecords);
      const exactExisting = existingRecords.find(
        (record) =>
          record.type === classification.recordType &&
          (normalize(record.title) === normalize(classification.title) ||
            similarity(record.title, classification.title) >= 0.82)
      );

      const record = applyClassificationToRecord(
        store,
        storeManager,
        input,
        classification,
        nowIso,
        exactExisting
      );

      scheduleFollowUpIfNeeded(store, storeManager, record);

      const capture = {
        id: storeManager.createId("capture"),
        conversationId: input.conversationId,
        messageId: input.messageId,
        idempotencyKey: input.idempotencyKey,
        channel: input.channel,
        userId: input.userId,
        message: input.message,
        createdAt: nowIso,
        processedAt: nowIso,
        recordId: record.id,
        classification: classification.recordType,
        provider: providerUsed === "idempotent-replay" ? "heuristic" : (providerUsed as CaptureConversationInput["provider"]),
        policyMode: input.policyMode
      };
      store.conversations.unshift(capture);

      store.activities.unshift(
        storeManager.buildActivity(
          exactExisting ? "capture_updated" : classification.needsConfirmation ? "capture_inbox" : "capture_created",
          exactExisting
            ? `Updated existing ${record.type} record from conversation capture.`
            : `Captured conversation as ${record.type}.`,
          record.id
        )
      );

      return {
        mode: exactExisting ? "updated" : classification.needsConfirmation ? "inbox" : "created",
        providerUsed,
        record,
        classification,
        duplicateOfRecordId: exactExisting?.id
      };
    });
  };

  const listRecords = async (rawInput: unknown) => {
    const input = listRecordsInputSchema.parse(rawInput);
    const store = await storeManager.read();
    let records = [...store.records];

    if (input.type) {
      records = records.filter((record) => record.type === input.type);
    }
    if (input.status) {
      records = records.filter((record) => record.status === input.status);
    }
    if (input.query) {
      const ranked = rankExistingRecords(records, input.query);
      const rankedIds = new Set(ranked.map((record) => record.id));
      records = records
        .filter((record) => rankedIds.has(record.id))
        .sort((left, right) => {
          const leftScore = similarity(input.query!, left.title);
          const rightScore = similarity(input.query!, right.title);
          return rightScore - leftScore;
        });
    }

    return records.slice(0, input.limit);
  };

  const updateRecordStatus = async (rawInput: unknown) => {
    const input = updateRecordStatusInputSchema.parse(rawInput);
    const nowIso = new Date().toISOString();

    return storeManager.mutate((store) => {
      const record = store.records.find((entry) => entry.id === input.recordId);
      if (!record) {
        throw new Error(`Record not found for id: ${input.recordId}`);
      }

      record.status = input.status;
      record.updatedAt = nowIso;
      if (input.status === "done") {
        record.reviewDate = undefined;
      }

      for (const job of store.followUpJobs) {
        if (job.recordId === record.id && job.status === "pending" && input.status === "done") {
          job.status = "cancelled";
          job.processedAt = nowIso;
        }
      }

      store.activities.unshift(
        storeManager.buildActivity(
          "status_updated",
          input.note
            ? `Updated ${record.type} to ${input.status}: ${input.note}`
            : `Updated ${record.type} to ${input.status}.`,
          record.id
        )
      );

      return record;
    });
  };

  const runFollowUpCycle = async (rawInput: unknown) => {
    const input = followUpRunInputSchema.parse(rawInput);
    const nowIso = input.nowIso ?? new Date().toISOString();

    return storeManager.mutate((store) => {
      const processed: AutomationRecord[] = [];
      const nowDate = new Date(nowIso);

      for (const job of store.followUpJobs) {
        if (processed.length >= input.limit) {
          break;
        }
        if (job.status !== "pending" || new Date(job.scheduledFor) > nowDate) {
          continue;
        }

        const sourceRecord = store.records.find((record) => record.id === job.recordId);
        if (!sourceRecord || ["done", "archived"].includes(sourceRecord.status)) {
          job.status = "cancelled";
          job.processedAt = nowIso;
          continue;
        }

        const reminderRecord: AutomationRecord = {
          id: storeManager.createId("record"),
          type: "inbox",
          title: `Follow up: ${sourceRecord.title}`,
          summary: `Automatic follow-up for ${sourceRecord.type} "${sourceRecord.title}" because ${job.reason}.`,
          status: "active",
          priority: sourceRecord.priority === "low" ? "medium" : sourceRecord.priority,
          createdAt: nowIso,
          updatedAt: nowIso,
          reviewDate: todayIsoDate(nowDate),
          assignee: sourceRecord.assignee,
          sourceConversationId: sourceRecord.sourceConversationId,
          sourceMessageId: sourceRecord.sourceMessageId,
          sourceExcerpt: sourceRecord.sourceExcerpt,
          relatedRecordIds: [sourceRecord.id],
          tags: uniqueStrings(["follow-up", "automation", sourceRecord.type]),
          metadata: {
            sourceRecordId: sourceRecord.id,
            followUpReason: job.reason
          }
        };

        store.records.unshift(reminderRecord);
        sourceRecord.relatedRecordIds = uniqueStrings([...sourceRecord.relatedRecordIds, reminderRecord.id]);
        sourceRecord.updatedAt = nowIso;
        job.status = "processed";
        job.processedAt = nowIso;
        job.reminderRecordId = reminderRecord.id;
        store.activities.unshift(
          storeManager.buildActivity(
            "followup_created",
            `Created automatic follow-up reminder for ${sourceRecord.title}.`,
            sourceRecord.id
          )
        );
        processed.push(reminderRecord);
      }

      return processed;
    });
  };

  const getStateSummary = async () => {
    const store = await storeManager.read();
    const counts = store.records.reduce<Record<string, number>>((acc, record) => {
      acc[record.type] = (acc[record.type] ?? 0) + 1;
      return acc;
    }, {});

    const pendingFollowUps = store.followUpJobs.filter((job) => job.status === "pending").length;
    const overdueRecords = store.records.filter(
      (record) =>
        record.status === "active" &&
        record.dueDate !== undefined &&
        new Date(record.dueDate) < new Date()
    );

    return {
      counts,
      pendingFollowUps,
      overdueCount: overdueRecords.length,
      recentRecords: store.records.slice(0, 10),
      recentActivities: store.activities.slice(0, 10)
    };
  };

  return {
    captureConversation,
    getStateSummary,
    listRecords,
    runFollowUpCycle,
    updateRecordStatus
  };
};

export const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
};
