import { z } from "zod";

export const recordTypeSchema = z.enum([
  "task",
  "todo",
  "research",
  "knowledge",
  "incident",
  "inbox"
]);

export const recordStatusSchema = z.enum(["draft", "active", "done", "blocked", "archived"]);
export const recordPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const providerSchema = z.enum(["auto", "heuristic", "openai", "anthropic"]);
export const policyModeSchema = z.enum(["auto", "ask-first", "hybrid"]);

export const automationRecordSchema = z.object({
  id: z.string().min(1),
  type: recordTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  status: recordStatusSchema,
  priority: recordPrioritySchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  dueDate: z.string().min(1).optional(),
  reviewDate: z.string().min(1).optional(),
  assignee: z.string().min(1).optional(),
  sourceConversationId: z.string().min(1).optional(),
  sourceMessageId: z.string().min(1).optional(),
  sourceExcerpt: z.string().min(1).optional(),
  relatedRecordIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  metadata: z.record(z.string()).default({})
});

export const conversationCaptureSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  messageId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).optional(),
  channel: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  message: z.string().min(1),
  createdAt: z.string().min(1),
  processedAt: z.string().min(1),
  recordId: z.string().min(1).optional(),
  classification: recordTypeSchema.optional(),
  provider: providerSchema,
  policyMode: policyModeSchema
});

export const activityLogSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  createdAt: z.string().min(1),
  recordId: z.string().min(1).optional(),
  message: z.string().min(1)
});

export const followUpJobStatusSchema = z.enum(["pending", "processed", "cancelled"]);

export const followUpJobSchema = z.object({
  id: z.string().min(1),
  recordId: z.string().min(1),
  scheduledFor: z.string().min(1),
  reason: z.string().min(1),
  status: followUpJobStatusSchema,
  createdAt: z.string().min(1),
  processedAt: z.string().min(1).optional(),
  reminderRecordId: z.string().min(1).optional()
});

export const automationStoreSchema = z.object({
  version: z.literal(1),
  records: z.array(automationRecordSchema),
  conversations: z.array(conversationCaptureSchema),
  activities: z.array(activityLogSchema),
  followUpJobs: z.array(followUpJobSchema)
});

export const captureConversationInputSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().min(1).default("default"),
  messageId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).optional(),
  channel: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  assignee: z.string().min(1).optional(),
  provider: providerSchema.default("auto"),
  policyMode: policyModeSchema.default("hybrid"),
  metadata: z.record(z.string()).default({})
});

export const updateRecordStatusInputSchema = z.object({
  recordId: z.string().min(1),
  status: recordStatusSchema,
  note: z.string().min(1).optional()
});

export const listRecordsInputSchema = z.object({
  type: recordTypeSchema.optional(),
  status: recordStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  query: z.string().min(1).optional()
});

export const followUpRunInputSchema = z.object({
  nowIso: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).default(20)
});

export const classificationResultSchema = z.object({
  recordType: recordTypeSchema,
  confidence: z.number().min(0).max(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  priority: recordPrioritySchema,
  dueDate: z.string().min(1).optional(),
  reviewDate: z.string().min(1).optional(),
  assignee: z.string().min(1).optional(),
  sourceExcerpt: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  needsConfirmation: z.boolean(),
  reasoning: z.string().min(1),
  suggestedActions: z.array(z.string().min(1)).default([])
});

export type AutomationRecord = z.infer<typeof automationRecordSchema>;
export type ConversationCapture = z.infer<typeof conversationCaptureSchema>;
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type FollowUpJob = z.infer<typeof followUpJobSchema>;
export type AutomationStore = z.infer<typeof automationStoreSchema>;
export type CaptureConversationInput = z.infer<typeof captureConversationInputSchema>;
export type UpdateRecordStatusInput = z.infer<typeof updateRecordStatusInputSchema>;
export type ListRecordsInput = z.infer<typeof listRecordsInputSchema>;
export type FollowUpRunInput = z.infer<typeof followUpRunInputSchema>;
export type ClassificationResult = z.infer<typeof classificationResultSchema>;

export const emptyAutomationStore = (): AutomationStore => ({
  version: 1,
  records: [],
  conversations: [],
  activities: [],
  followUpJobs: []
});
