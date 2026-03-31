import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type ActivityLog,
  type AutomationStore,
  type FollowUpJob,
  automationStoreSchema,
  emptyAutomationStore
} from "./automation-types.js";

const createId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export class AutomationStoreManager {
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly storePath: string) {}

  async read(): Promise<AutomationStore> {
    return this.load();
  }

  async mutate<T>(updater: (store: AutomationStore) => Promise<T> | T): Promise<T> {
    const operation = this.chain.then(async () => {
      const store = await this.load();
      const result = await updater(store);
      await this.save(store);
      return result;
    });

    this.chain = operation.then(
      () => undefined,
      () => undefined
    );

    return operation;
  }

  buildActivity(kind: string, message: string, recordId?: string): ActivityLog {
    return {
      id: createId("activity"),
      kind,
      createdAt: new Date().toISOString(),
      recordId,
      message
    };
  }

  buildFollowUp(recordId: string, scheduledFor: string, reason: string): FollowUpJob {
    return {
      id: createId("followup"),
      recordId,
      scheduledFor,
      reason,
      status: "pending",
      createdAt: new Date().toISOString()
    };
  }

  createId(prefix: string): string {
    return createId(prefix);
  }

  private async ensureParentDir(): Promise<void> {
    await mkdir(path.dirname(this.storePath), { recursive: true });
  }

  private async load(): Promise<AutomationStore> {
    await this.ensureParentDir();

    try {
      const raw = await readFile(this.storePath, "utf8");
      return automationStoreSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const empty = emptyAutomationStore();
        await this.save(empty);
        return empty;
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Automation store at ${this.storePath} contains invalid JSON.`);
      }

      throw error;
    }
  }

  private async save(store: AutomationStore): Promise<void> {
    await this.ensureParentDir();
    const serialized = JSON.stringify(store, null, 2);
    await writeFile(this.storePath, `${serialized}\n`, "utf8");
  }
}
