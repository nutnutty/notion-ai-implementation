import { AutomationStoreManager } from "./automation-store.js";
import type { AutomationRecord } from "./automation-types.js";

type RouteKey = "task" | "todo" | "research" | "knowledge" | "incident" | "inbox";

type SyncResult =
  | {
      enabled: false;
      synced: false;
      reason: string;
    }
  | {
      enabled: true;
      synced: boolean;
      recordId: string;
      notionPageId?: string;
      notionPageUrl?: string;
      target?: string;
      error?: string;
    };

type NotionRouteConfig = {
  key: RouteKey;
  databaseId?: string;
  dataSourceId?: string;
  titleProperty?: string;
  statusProperty?: string;
  priorityProperty?: string;
  dueDateProperty?: string;
  reviewDateProperty?: string;
  summaryProperty?: string;
  sourceExcerptProperty?: string;
  sourceConversationIdProperty?: string;
  sourceMessageIdProperty?: string;
  sourceUrlProperty?: string;
  confidenceProperty?: string;
  policyModeProperty?: string;
  sourceChannelProperty?: string;
  assigneeProperty?: string;
  tagsProperty?: string;
  activityTypeProperty?: string;
  activityTypeValue?: string;
  workflowProperty?: string;
  workflowValue?: string;
  scopeProperty?: string;
  scopeValue?: string;
  recordTypeProperty?: string;
  recordTypeValue?: string;
  knowledgeDomainProperty?: string;
  knowledgeDomainValue?: string;
};

type NotionDatabaseResponse = {
  data_sources?: Array<{
    id?: string;
    name?: string;
  }>;
};

type NotionDataSourceProperty = {
  id?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
};

type NotionDataSourceResponse = {
  id?: string;
  properties?: Record<string, NotionDataSourceProperty>;
};

type NotionPageResponse = {
  id?: string;
  url?: string;
};

const DEFAULT_NOTION_VERSION = process.env.NOTION_VERSION?.trim() || "2026-03-11";
const NOTION_API_BASE_URL = process.env.NOTION_API_BASE_URL?.trim() || "https://api.notion.com/v1";
const NOTION_SYNC_ENABLED = (process.env.NOTION_SYNC_ENABLED ?? "false").toLowerCase() === "true";
const NOTION_SYNC_PROFILE = process.env.NOTION_SYNC_PROFILE?.trim().toLowerCase() || "";
const NOTION_SYNC_APPEND_CONTENT =
  (process.env.NOTION_SYNC_APPEND_CONTENT ?? "true").toLowerCase() === "true";
const NOTION_SYNC_TIMEOUT_MS = Number(process.env.NOTION_SYNC_TIMEOUT_MS ?? "15000");
const NOTION_DEFAULT_ASSIGNEE_USER_ID = process.env.NOTION_DEFAULT_ASSIGNEE_USER_ID?.trim() || "";
const NOTION_DEFAULT_SCOPE = process.env.NOTION_DEFAULT_SCOPE?.trim() || "Knowledge Base Global";
const NOTION_DEFAULT_KNOWLEDGE_DOMAIN = process.env.NOTION_DEFAULT_KNOWLEDGE_DOMAIN?.trim() || "Operations";

const routeKeys: RouteKey[] = ["task", "todo", "research", "knowledge", "incident", "inbox"];

const parseEnvValue = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const workspaceProfileConfigs: Record<string, Partial<Record<RouteKey, Partial<NotionRouteConfig>>>> = {
  "knowledge-base-v1": {
    task: {
      titleProperty: "Task",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      assigneeProperty: "Assignee",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Implementation",
      workflowProperty: "Workflow",
      workflowValue: "notion-spec-to-implementation",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global"
    },
    todo: {
      titleProperty: "Task",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      assigneeProperty: "Assignee",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Implementation",
      workflowProperty: "Workflow",
      workflowValue: "notion-spec-to-implementation",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global"
    },
    research: {
      titleProperty: "Task",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      assigneeProperty: "Assignee",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Research",
      workflowProperty: "Workflow",
      workflowValue: "notion-research-documentation",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global"
    },
    incident: {
      titleProperty: "Task",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      assigneeProperty: "Assignee",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Incident",
      workflowProperty: "Workflow",
      workflowValue: "notion-spec-to-implementation",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global"
    },
    inbox: {
      titleProperty: "Task",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      assigneeProperty: "Assignee",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Capture",
      workflowProperty: "Workflow",
      workflowValue: "notion-knowledge-capture",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global"
    },
    knowledge: {
      titleProperty: "Title",
      statusProperty: "Status",
      priorityProperty: "Priority",
      reviewDateProperty: "Review Date",
      summaryProperty: "Outcome",
      assigneeProperty: "Owner",
      tagsProperty: "Tags",
      activityTypeProperty: "Activity Type",
      activityTypeValue: "Capture",
      workflowProperty: "Workflow",
      workflowValue: "notion-knowledge-capture",
      scopeProperty: "Scope",
      scopeValue: "Knowledge Base Global",
      recordTypeProperty: "Type",
      recordTypeValue: "Documentation",
      knowledgeDomainProperty: "Knowledge Domain",
      knowledgeDomainValue: "Operations"
    }
  },
  "personal-kb-v2": {
    task: {
      titleProperty: "Title",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      reviewDateProperty: "Review Date",
      sourceExcerptProperty: "Source Excerpt",
      sourceConversationIdProperty: "Source Conversation ID",
      sourceUrlProperty: "Source URL",
      assigneeProperty: "Assignee",
      tagsProperty: "Tags",
      workflowProperty: "Workflow",
      workflowValue: "execution",
      recordTypeProperty: "Work Type",
      recordTypeValue: "task"
    },
    todo: {
      titleProperty: "Title",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      reviewDateProperty: "Review Date",
      sourceExcerptProperty: "Source Excerpt",
      sourceConversationIdProperty: "Source Conversation ID",
      sourceUrlProperty: "Source URL",
      assigneeProperty: "Assignee",
      tagsProperty: "Tags",
      workflowProperty: "Workflow",
      workflowValue: "execution",
      recordTypeProperty: "Work Type",
      recordTypeValue: "todo"
    },
    research: {
      titleProperty: "Title",
      statusProperty: "Status",
      priorityProperty: "Priority",
      dueDateProperty: "Due Date",
      reviewDateProperty: "Review Date",
      summaryProperty: "Findings Summary",
      sourceExcerptProperty: "Source Excerpt",
      sourceUrlProperty: "Source URL",
      assigneeProperty: "Owner",
      tagsProperty: "Tags"
    },
    knowledge: {
      titleProperty: "Title",
      statusProperty: "Status",
      reviewDateProperty: "Review Date",
      summaryProperty: "Summary",
      sourceConversationIdProperty: "Source Conversation ID",
      sourceUrlProperty: "Source Record URL",
      assigneeProperty: "Owner",
      tagsProperty: "Tags",
      recordTypeProperty: "Record Type",
      recordTypeValue: "documentation",
      knowledgeDomainProperty: "Knowledge Domain"
    },
    incident: {
      titleProperty: "Title",
      statusProperty: "Status",
      priorityProperty: "Severity",
      dueDateProperty: "Follow-up Due",
      summaryProperty: "Impact Summary",
      sourceExcerptProperty: "Source Excerpt",
      assigneeProperty: "Owner"
    },
    inbox: {
      titleProperty: "Title",
      statusProperty: "Status",
      sourceExcerptProperty: "Original Message",
      sourceConversationIdProperty: "Conversation ID",
      sourceMessageIdProperty: "Message ID",
      confidenceProperty: "Confidence",
      policyModeProperty: "Policy Mode",
      sourceChannelProperty: "Source Channel",
      recordTypeProperty: "Suggested Type"
    }
  }
};

const getProfileDefaults = (key: RouteKey): Partial<NotionRouteConfig> | undefined =>
  workspaceProfileConfigs[NOTION_SYNC_PROFILE]?.[key];

const getRouteConfig = (key: RouteKey): NotionRouteConfig => {
  const upper = key.toUpperCase();
  const profileDefaults = getProfileDefaults(key) ?? {};
  return {
    key,
    databaseId: parseEnvValue(`NOTION_${upper}_DATABASE_ID`) ?? profileDefaults.databaseId,
    dataSourceId: parseEnvValue(`NOTION_${upper}_DATA_SOURCE_ID`) ?? profileDefaults.dataSourceId,
    titleProperty: parseEnvValue(`NOTION_${upper}_TITLE_PROPERTY`) ?? profileDefaults.titleProperty,
    statusProperty: parseEnvValue(`NOTION_${upper}_STATUS_PROPERTY`) ?? profileDefaults.statusProperty,
    priorityProperty: parseEnvValue(`NOTION_${upper}_PRIORITY_PROPERTY`) ?? profileDefaults.priorityProperty,
    dueDateProperty: parseEnvValue(`NOTION_${upper}_DUE_DATE_PROPERTY`) ?? profileDefaults.dueDateProperty,
    reviewDateProperty: parseEnvValue(`NOTION_${upper}_REVIEW_DATE_PROPERTY`) ?? profileDefaults.reviewDateProperty,
    summaryProperty: parseEnvValue(`NOTION_${upper}_SUMMARY_PROPERTY`) ?? profileDefaults.summaryProperty,
    sourceExcerptProperty:
      parseEnvValue(`NOTION_${upper}_SOURCE_EXCERPT_PROPERTY`) ?? profileDefaults.sourceExcerptProperty,
    sourceConversationIdProperty:
      parseEnvValue(`NOTION_${upper}_SOURCE_CONVERSATION_ID_PROPERTY`) ??
      profileDefaults.sourceConversationIdProperty,
    sourceMessageIdProperty:
      parseEnvValue(`NOTION_${upper}_SOURCE_MESSAGE_ID_PROPERTY`) ?? profileDefaults.sourceMessageIdProperty,
    sourceUrlProperty: parseEnvValue(`NOTION_${upper}_SOURCE_URL_PROPERTY`) ?? profileDefaults.sourceUrlProperty,
    confidenceProperty:
      parseEnvValue(`NOTION_${upper}_CONFIDENCE_PROPERTY`) ?? profileDefaults.confidenceProperty,
    policyModeProperty:
      parseEnvValue(`NOTION_${upper}_POLICY_MODE_PROPERTY`) ?? profileDefaults.policyModeProperty,
    sourceChannelProperty:
      parseEnvValue(`NOTION_${upper}_SOURCE_CHANNEL_PROPERTY`) ?? profileDefaults.sourceChannelProperty,
    assigneeProperty: parseEnvValue(`NOTION_${upper}_ASSIGNEE_PROPERTY`) ?? profileDefaults.assigneeProperty,
    tagsProperty: parseEnvValue(`NOTION_${upper}_TAGS_PROPERTY`) ?? profileDefaults.tagsProperty,
    activityTypeProperty:
      parseEnvValue(`NOTION_${upper}_ACTIVITY_TYPE_PROPERTY`) ?? profileDefaults.activityTypeProperty,
    activityTypeValue:
      parseEnvValue(`NOTION_${upper}_ACTIVITY_TYPE_VALUE`) ?? profileDefaults.activityTypeValue,
    workflowProperty: parseEnvValue(`NOTION_${upper}_WORKFLOW_PROPERTY`) ?? profileDefaults.workflowProperty,
    workflowValue: parseEnvValue(`NOTION_${upper}_WORKFLOW_VALUE`) ?? profileDefaults.workflowValue,
    scopeProperty: parseEnvValue(`NOTION_${upper}_SCOPE_PROPERTY`) ?? profileDefaults.scopeProperty,
    scopeValue: parseEnvValue(`NOTION_${upper}_SCOPE_VALUE`) ?? profileDefaults.scopeValue,
    recordTypeProperty:
      parseEnvValue(`NOTION_${upper}_RECORD_TYPE_PROPERTY`) ?? profileDefaults.recordTypeProperty,
    recordTypeValue: parseEnvValue(`NOTION_${upper}_RECORD_TYPE_VALUE`) ?? profileDefaults.recordTypeValue,
    knowledgeDomainProperty:
      parseEnvValue(`NOTION_${upper}_KNOWLEDGE_DOMAIN_PROPERTY`) ?? profileDefaults.knowledgeDomainProperty,
    knowledgeDomainValue:
      parseEnvValue(`NOTION_${upper}_KNOWLEDGE_DOMAIN_VALUE`) ?? profileDefaults.knowledgeDomainValue
  };
};

const routeConfigs = new Map<RouteKey, NotionRouteConfig>(routeKeys.map((key) => [key, getRouteConfig(key)]));

const normalize = (value: string): string => value.trim().toLowerCase();

const richText = (value: string) => ({
  rich_text: [
    {
      type: "text",
      text: {
        content: value.slice(0, 2000)
      }
    }
  ]
});

const titleValue = (value: string) => ({
  title: [
    {
      type: "text",
      text: {
        content: value.slice(0, 2000)
      }
    }
  ]
});

const urlValue = (value: string) => ({
  url: value.slice(0, 2000)
});

const paragraphBlock = (value: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: richText(value)
});

const headingBlock = (value: string) => ({
  object: "block",
  type: "heading_2",
  heading_2: richText(value)
});

const optionNames = (property: NotionDataSourceProperty): string[] => {
  const typedValue = property[property.type ?? ""] as { options?: Array<{ name?: string }> } | undefined;
  return (typedValue?.options ?? [])
    .map((option) => option.name?.trim())
    .filter((name): name is string => Boolean(name));
};

const findPropertyByType = (
  properties: Record<string, NotionDataSourceProperty>,
  type: string,
  preferredNames: string[]
): string | undefined => {
  const normalizedPreferred = preferredNames.map(normalize);
  const entries = Object.entries(properties).filter(([, property]) => property.type === type);
  const exact = entries.find(([name]) => normalizedPreferred.includes(normalize(name)));
  if (exact) {
    return exact[0];
  }
  return entries[0]?.[0];
};

const findProperty = (
  properties: Record<string, NotionDataSourceProperty>,
  explicitName: string | undefined,
  type: string,
  preferredNames: string[]
): string | undefined => {
  if (explicitName && properties[explicitName]) {
    return explicitName;
  }
  return findPropertyByType(properties, type, preferredNames);
};

const findPropertyAcrossTypes = (
  properties: Record<string, NotionDataSourceProperty>,
  explicitName: string | undefined,
  types: string[],
  preferredNames: string[]
): string | undefined => {
  if (explicitName && properties[explicitName]) {
    return explicitName;
  }

  for (const type of types) {
    const match = findPropertyByType(properties, type, preferredNames);
    if (match) {
      return match;
    }
  }

  return undefined;
};

const selectOptionByPreference = (
  property: NotionDataSourceProperty,
  candidates: string[]
): string | undefined => {
  const options = optionNames(property);
  if (options.length === 0) {
    return undefined;
  }

  const normalized = options.map((option) => normalize(option));
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalize(candidate));
    if (index >= 0) {
      return options[index];
    }
  }

  return undefined;
};

const routeForRecord = (record: AutomationRecord): NotionRouteConfig | undefined => {
  if (record.type === "todo" && !routeConfigs.get("todo")?.databaseId && !routeConfigs.get("todo")?.dataSourceId) {
    return routeConfigs.get("task");
  }
  return routeConfigs.get(record.type as RouteKey);
};

const notionHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  "notion-version": DEFAULT_NOTION_VERSION
});

const requestTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${NOTION_SYNC_TIMEOUT_MS}ms.`));
    }, NOTION_SYNC_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export class NotionSyncManager {
  private readonly token = process.env.NOTION_API_TOKEN?.trim() || "";
  private readonly dataSourceIdCache = new Map<string, string>();
  private readonly schemaCache = new Map<string, Record<string, NotionDataSourceProperty>>();

  constructor(private readonly storeManager: AutomationStoreManager) {}

  isEnabled(): boolean {
    if (!NOTION_SYNC_ENABLED || !this.token) {
      return false;
    }

    return Array.from(routeConfigs.values()).some((route) => route.databaseId || route.dataSourceId);
  }

  getStatus(): { enabled: boolean; appendContent: boolean } {
    return {
      enabled: this.isEnabled(),
      appendContent: NOTION_SYNC_APPEND_CONTENT
    };
  }

  async syncRecordById(recordId: string): Promise<SyncResult> {
    if (!NOTION_SYNC_ENABLED) {
      return { enabled: false, synced: false, reason: "Notion sync is disabled." };
    }
    if (!this.token) {
      return { enabled: false, synced: false, reason: "NOTION_API_TOKEN is not configured." };
    }

    const store = await this.storeManager.read();
    const record = store.records.find((entry) => entry.id === recordId);
    if (!record) {
      return { enabled: true, synced: false, recordId, error: `Record not found: ${recordId}` };
    }

    const route = routeForRecord(record);
    if (!route || (!route.databaseId && !route.dataSourceId)) {
      return {
        enabled: false,
        synced: false,
        reason: `No Notion route configured for record type "${record.type}".`
      };
    }

    try {
      const targetDataSourceId = await this.resolveDataSourceId(route);
      const schema = await this.getDataSourceSchema(targetDataSourceId);
      const pageId = record.metadata.notionPageId;
      const properties = this.buildProperties(route, schema, record);

      let page: NotionPageResponse;
      if (pageId) {
        page = await this.updatePage(pageId, properties);
      } else {
        page = await this.createPage(targetDataSourceId, properties);
        if (NOTION_SYNC_APPEND_CONTENT && page.id) {
          await this.appendContent(page.id, record);
        }
      }

      const nowIso = new Date().toISOString();
      await this.storeManager.mutate((mutableStore) => {
        const mutableRecord = mutableStore.records.find((entry) => entry.id === record.id);
        if (!mutableRecord) {
          return;
        }

        mutableRecord.metadata = {
          ...mutableRecord.metadata,
          notionPageId: page.id ?? mutableRecord.metadata.notionPageId ?? "",
          notionPageUrl: page.url ?? mutableRecord.metadata.notionPageUrl ?? "",
          notionDataSourceId: targetDataSourceId,
          notionLastSyncedAt: nowIso,
          notionRoute: route.key
        };

        mutableStore.activities.unshift(
          this.storeManager.buildActivity(
            "notion_synced",
            `Synced ${mutableRecord.type} record to Notion route "${route.key}".`,
            mutableRecord.id
          )
        );
      });

      return {
        enabled: true,
        synced: true,
        recordId: record.id,
        notionPageId: page.id,
        notionPageUrl: page.url,
        target: route.key
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.storeManager.mutate((mutableStore) => {
        const mutableRecord = mutableStore.records.find((entry) => entry.id === record.id);
        if (!mutableRecord) {
          return;
        }

        mutableStore.activities.unshift(
          this.storeManager.buildActivity(
            "notion_sync_failed",
            `Failed to sync ${mutableRecord.type} record to Notion: ${details}`,
            mutableRecord.id
          )
        );
      });

      return {
        enabled: true,
        synced: false,
        recordId: record.id,
        target: route.key,
        error: details
      };
    }
  }

  private async request<T>(pathname: string, init: RequestInit): Promise<T> {
    const response = await requestTimeout(
      fetch(`${NOTION_API_BASE_URL}${pathname}`, init),
      `Notion request ${init.method ?? "GET"} ${pathname}`
    );

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`Notion API ${pathname} failed with ${response.status}: ${raw}`);
    }

    return (await response.json()) as T;
  }

  private async resolveDataSourceId(route: NotionRouteConfig): Promise<string> {
    if (route.dataSourceId) {
      return route.dataSourceId;
    }

    if (!route.databaseId) {
      throw new Error(`Route "${route.key}" is missing both databaseId and dataSourceId.`);
    }

    const cached = this.dataSourceIdCache.get(route.databaseId);
    if (cached) {
      return cached;
    }

    const database = await this.request<NotionDatabaseResponse>(`/databases/${route.databaseId}`, {
      method: "GET",
      headers: notionHeaders(this.token)
    });

    const dataSourceId = database.data_sources?.[0]?.id;
    if (!dataSourceId) {
      throw new Error(`Database ${route.databaseId} does not expose a data source.`);
    }

    this.dataSourceIdCache.set(route.databaseId, dataSourceId);
    return dataSourceId;
  }

  private async getDataSourceSchema(dataSourceId: string): Promise<Record<string, NotionDataSourceProperty>> {
    const cached = this.schemaCache.get(dataSourceId);
    if (cached) {
      return cached;
    }

    const dataSource = await this.request<NotionDataSourceResponse>(`/data_sources/${dataSourceId}`, {
      method: "GET",
      headers: notionHeaders(this.token)
    });

    const properties = dataSource.properties ?? {};
    this.schemaCache.set(dataSourceId, properties);
    return properties;
  }

  private buildProperties(
    route: NotionRouteConfig,
    properties: Record<string, NotionDataSourceProperty>,
    record: AutomationRecord
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    const titleProperty =
      route.titleProperty ??
      Object.entries(properties).find(([, property]) => property.type === "title")?.[0];
    if (!titleProperty) {
      throw new Error(`No title property found for Notion route "${route.key}".`);
    }
    payload[titleProperty] = titleValue(record.title);

    const summaryProperty = findProperty(
      properties,
      route.summaryProperty,
      "rich_text",
      ["Summary", "Description", "Notes", `${titleCase(route.key)} Summary`]
    );
    if (summaryProperty) {
      payload[summaryProperty] = richText(record.summary);
    }

    const sourceExcerptProperty = findProperty(
      properties,
      route.sourceExcerptProperty,
      "rich_text",
      ["Source Excerpt", "Source", "Transcript", "Conversation Excerpt"]
    );
    if (sourceExcerptProperty && record.sourceExcerpt) {
      payload[sourceExcerptProperty] = richText(record.sourceExcerpt);
    }

    const sourceConversationIdProperty = findProperty(
      properties,
      route.sourceConversationIdProperty,
      "rich_text",
      ["Source Conversation ID", "Conversation ID"]
    );
    if (sourceConversationIdProperty && record.sourceConversationId) {
      payload[sourceConversationIdProperty] = richText(record.sourceConversationId);
    }

    const sourceMessageIdProperty = findProperty(
      properties,
      route.sourceMessageIdProperty,
      "rich_text",
      ["Source Message ID", "Message ID"]
    );
    if (sourceMessageIdProperty && record.sourceMessageId) {
      payload[sourceMessageIdProperty] = richText(record.sourceMessageId);
    }

    const sourceUrlProperty = findProperty(properties, route.sourceUrlProperty, "url", [
      "Source URL",
      "Source Record URL"
    ]);
    const sourceUrl = record.metadata.sourceUrl ?? record.metadata.sourceRecordUrl;
    if (sourceUrlProperty && sourceUrl) {
      payload[sourceUrlProperty] = urlValue(sourceUrl);
    }

    const confidenceProperty = findProperty(properties, route.confidenceProperty, "number", [
      "Confidence",
      "AI Confidence"
    ]);
    const confidenceRaw = record.metadata.classificationConfidence ?? record.metadata.confidence;
    const confidence = confidenceRaw ? Number(confidenceRaw) : Number.NaN;
    if (confidenceProperty && Number.isFinite(confidence)) {
      payload[confidenceProperty] = { number: confidence };
    }

    const dueDateProperty = findProperty(
      properties,
      route.dueDateProperty,
      "date",
      ["Due Date", "Due", "Deadline"]
    );
    if (dueDateProperty && record.dueDate) {
      payload[dueDateProperty] = { date: { start: record.dueDate } };
    }

    const reviewDateProperty = findProperty(
      properties,
      route.reviewDateProperty,
      "date",
      ["Review Date", "Review", "Next Review"]
    );
    if (reviewDateProperty && record.reviewDate) {
      payload[reviewDateProperty] = { date: { start: record.reviewDate } };
    }

    const statusProperty =
      route.statusProperty && properties[route.statusProperty]
        ? route.statusProperty
        : findProperty(properties, undefined, "status", ["Status", "State"]) ??
          findProperty(properties, undefined, "select", ["Status", "State"]);
    if (statusProperty) {
      const property = properties[statusProperty];
      const optionName = this.resolveStatusOption(property, record.status);
      if (optionName) {
        payload[statusProperty] =
          property.type === "status" ? { status: { name: optionName } } : { select: { name: optionName } };
      }
    }

    const priorityProperty =
      route.priorityProperty && properties[route.priorityProperty]
        ? route.priorityProperty
        : findProperty(properties, undefined, "select", ["Priority", "Severity"]) ??
          findProperty(properties, undefined, "status", ["Priority", "Severity"]);
    if (priorityProperty) {
      const property = properties[priorityProperty];
      const optionName = this.resolvePriorityOption(property, record.priority);
      if (optionName) {
        payload[priorityProperty] =
          property.type === "status" ? { status: { name: optionName } } : { select: { name: optionName } };
      }
    }

    const assigneeProperty =
      route.assigneeProperty && properties[route.assigneeProperty]
        ? route.assigneeProperty
        : findProperty(properties, undefined, "people", ["Assignee", "Owner", "People"]);
    if (assigneeProperty && NOTION_DEFAULT_ASSIGNEE_USER_ID) {
      payload[assigneeProperty] = { people: [{ id: NOTION_DEFAULT_ASSIGNEE_USER_ID }] };
    }

    const tagsProperty =
      route.tagsProperty && properties[route.tagsProperty]
        ? route.tagsProperty
        : findProperty(properties, undefined, "multi_select", ["Tags"]);
    if (tagsProperty && record.tags.length > 0) {
      const property = properties[tagsProperty];
      const allowedOptions = optionNames(property);
      const selectedTags = record.tags
        .map((tag) => selectOptionByPreference(property, [tag]))
        .filter((tag): tag is string => Boolean(tag));

      if (selectedTags.length > 0) {
        payload[tagsProperty] = {
          multi_select: uniqueTags(selectedTags)
            .slice(0, Math.max(1, allowedOptions.length))
            .map((tag) => ({ name: tag }))
        };
      }
    }

    this.assignOptionProperty(
      payload,
      properties,
      route.activityTypeProperty,
      ["Activity Type"],
      route.activityTypeValue ?? this.activityTypeForRecord(record)
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.workflowProperty,
      ["Workflow"],
      route.workflowValue ?? this.workflowForRecord(record)
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.scopeProperty,
      ["Scope"],
      route.scopeValue || NOTION_DEFAULT_SCOPE
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.recordTypeProperty,
      ["Type"],
      route.recordTypeValue ?? this.recordClassForRecord(record)
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.policyModeProperty,
      ["Policy Mode"],
      record.metadata.policyMode ?? record.metadata.lastPolicyMode
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.sourceChannelProperty,
      ["Source Channel"],
      record.metadata.sourceChannel
    );

    this.assignOptionProperty(
      payload,
      properties,
      route.knowledgeDomainProperty,
      ["Knowledge Domain"],
      route.knowledgeDomainValue || NOTION_DEFAULT_KNOWLEDGE_DOMAIN
    );

    return payload;
  }

  private assignOptionProperty(
    payload: Record<string, unknown>,
    properties: Record<string, NotionDataSourceProperty>,
    explicitName: string | undefined,
    preferredNames: string[],
    value: string | undefined
  ): void {
    if (!value) {
      return;
    }

    const propertyName = findPropertyAcrossTypes(properties, explicitName, ["select", "status"], preferredNames);
    if (!propertyName) {
      return;
    }

    const property = properties[propertyName];
    const optionName = selectOptionByPreference(property, [value]);
    if (!optionName) {
      return;
    }

    payload[propertyName] =
      property.type === "status" ? { status: { name: optionName } } : { select: { name: optionName } };
  }

  private activityTypeForRecord(record: AutomationRecord): string | undefined {
    const defaults: Record<RouteKey, string> = {
      task: "Implementation",
      todo: "Implementation",
      research: "Research",
      knowledge: "Capture",
      incident: "Incident",
      inbox: "Capture"
    };
    return defaults[record.type as RouteKey];
  }

  private workflowForRecord(record: AutomationRecord): string | undefined {
    const defaults: Record<RouteKey, string> = {
      task: "notion-spec-to-implementation",
      todo: "notion-spec-to-implementation",
      research: "notion-research-documentation",
      knowledge: "notion-knowledge-capture",
      incident: "notion-spec-to-implementation",
      inbox: "notion-knowledge-capture"
    };
    return defaults[record.type as RouteKey];
  }

  private recordClassForRecord(record: AutomationRecord): string | undefined {
    if (record.type === "knowledge") {
      return "documentation";
    }
    if (record.type === "inbox") {
      return record.metadata.capturedAs ?? "inbox";
    }
    if (record.type === "task" || record.type === "todo") {
      return record.type;
    }
    return undefined;
  }

  private resolveStatusOption(property: NotionDataSourceProperty, status: AutomationRecord["status"]): string | undefined {
    const candidatesByStatus: Record<AutomationRecord["status"], string[]> = {
      draft: ["Draft", "Planned", "Backlog", "New"],
      active: ["Active", "In Progress", "Open", "To Do", "Todo", "Reviewing"],
      done: ["Done", "Completed", "Resolved"],
      blocked: ["Blocked", "On Hold", "Stuck", "Reviewing"],
      archived: ["Archived", "Done", "Dismissed"]
    };

    return selectOptionByPreference(property, candidatesByStatus[status]);
  }

  private resolvePriorityOption(
    property: NotionDataSourceProperty,
    priority: AutomationRecord["priority"]
  ): string | undefined {
    const candidatesByPriority: Record<AutomationRecord["priority"], string[]> = {
      low: ["Low"],
      medium: ["Medium", "Normal"],
      high: ["High"],
      urgent: ["Urgent", "High", "Critical"]
    };

    return selectOptionByPreference(property, candidatesByPriority[priority]);
  }

  private async createPage(dataSourceId: string, properties: Record<string, unknown>): Promise<NotionPageResponse> {
    return this.request<NotionPageResponse>("/pages", {
      method: "POST",
      headers: notionHeaders(this.token),
      body: JSON.stringify({
        parent: {
          data_source_id: dataSourceId
        },
        properties
      })
    });
  }

  private async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPageResponse> {
    return this.request<NotionPageResponse>(`/pages/${pageId}`, {
      method: "PATCH",
      headers: notionHeaders(this.token),
      body: JSON.stringify({
        properties
      })
    });
  }

  private async appendContent(pageId: string, record: AutomationRecord): Promise<void> {
    const children = [
      headingBlock("Summary"),
      paragraphBlock(record.summary),
      headingBlock("Source Excerpt"),
      paragraphBlock(record.sourceExcerpt ?? "No source excerpt available."),
      headingBlock("Metadata"),
      paragraphBlock(`Record ID: ${record.id}`),
      paragraphBlock(`Type: ${record.type}`),
      paragraphBlock(`Status: ${record.status}`),
      paragraphBlock(`Priority: ${record.priority}`)
    ];

    await this.request(`/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: notionHeaders(this.token),
      body: JSON.stringify({ children })
    });
  }
}

const uniqueTags = (values: string[]): string[] => Array.from(new Set(values));

export type { SyncResult };
