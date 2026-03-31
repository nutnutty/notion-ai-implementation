import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { AutomationStoreManager } from "./automation-store.js";
import { createAutomationEngine } from "./automation-engine.js";

const createEngineForTest = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "automation-engine-"));
  const storeManager = new AutomationStoreManager(path.join(dir, "automation-store.json"));
  return createAutomationEngine(storeManager);
};

test("captureConversation stores actionable work as a task", async () => {
  const engine = await createEngineForTest();

  const result = await engine.captureConversation({
    message: "ช่วยเตรียมสรุป competitor pricing ให้เสร็จพรุ่งนี้",
    conversationId: "conv-1",
    policyMode: "auto",
    provider: "heuristic"
  });

  assert.equal(result.mode, "created");
  assert.equal(result.record.type, "task");
  assert.equal(result.record.status, "active");
  assert.equal(result.classification.recordType, "task");
  assert.equal(Boolean(result.record.dueDate), true);
});

test("captureConversation routes ambiguous input to inbox in ask-first mode", async () => {
  const engine = await createEngineForTest();

  const result = await engine.captureConversation({
    message: "อันนี้น่าจะสำคัญไว้ค่อยดูอีกที",
    conversationId: "conv-2",
    policyMode: "ask-first",
    provider: "heuristic"
  });

  assert.equal(result.mode, "inbox");
  assert.equal(result.record.type, "inbox");
  assert.equal(result.record.status, "draft");
});

test("captureConversation deduplicates repeated idempotency keys", async () => {
  const engine = await createEngineForTest();

  const first = await engine.captureConversation({
    message: "Create research brief comparing three CRM vendors this week",
    conversationId: "conv-3",
    idempotencyKey: "message-123",
    policyMode: "auto",
    provider: "heuristic"
  });

  const second = await engine.captureConversation({
    message: "Create research brief comparing three CRM vendors this week",
    conversationId: "conv-3",
    idempotencyKey: "message-123",
    policyMode: "auto",
    provider: "heuristic"
  });

  assert.equal(first.record.id, second.record.id);
  assert.equal(second.providerUsed, "idempotent-replay");
});

test("runFollowUpCycle creates an inbox reminder for overdue active work", async () => {
  const engine = await createEngineForTest();

  const created = await engine.captureConversation({
    message: "Prepare launch checklist today",
    conversationId: "conv-4",
    policyMode: "auto",
    provider: "heuristic"
  });

  const reminders = await engine.runFollowUpCycle({
    nowIso: "2099-01-02T10:00:00.000Z",
    limit: 10
  });

  assert.equal(created.record.type, "task");
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0]?.type, "inbox");
  assert.equal(reminders[0]?.relatedRecordIds.includes(created.record.id), true);
});
