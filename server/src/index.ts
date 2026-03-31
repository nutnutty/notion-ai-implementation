import { IncomingMessage, createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  buildAllowedDocHosts,
  buildAllowedMcpOrigins,
  getAllowedCorsOrigin,
  getSafeDocumentUrl
} from "./security.js";
import { createAutomationEngine, readJsonBody } from "./automation-engine.js";
import { AutomationStoreManager } from "./automation-store.js";
import { NotionSyncManager, type SyncResult } from "./notion-sync.js";

type KnowledgeDocument = {
  id: string;
  title: string;
  url: string;
  text: string;
  metadata?: Record<string, string>;
};

type SearchResult = Pick<KnowledgeDocument, "id" | "title" | "url">;
type RequestContext = { tenantId: string | null };
type RateLimitEntry = { windowStartedAt: number; count: number };

const PORT = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const APP_VERSION = "0.2.0";
const WIDGET_URI = "ui://widget/knowledge-search-v1.html";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const AUTH_BEARER_TOKEN = (process.env.AUTH_BEARER_TOKEN ?? "").trim();
const ENABLE_OAUTH_CHALLENGE =
  (process.env.ENABLE_OAUTH_CHALLENGE ?? "false").toLowerCase() === "true";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? "").trim();
const OAUTH_AUTHORIZATION_SERVERS = (process.env.OAUTH_AUTHORIZATION_SERVERS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const OAUTH_SCOPES = (process.env.OAUTH_SCOPES ?? "knowledge.read")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const TENANT_ID_HEADER = (process.env.TENANT_ID_HEADER ?? "x-tenant-id").toLowerCase();
const REQUIRE_TENANT_ID =
  (process.env.REQUIRE_TENANT_ID ?? (IS_PRODUCTION ? "true" : "false")).toLowerCase() === "true";
const ALLOW_REQUESTS_WITHOUT_ORIGIN =
  (process.env.ALLOW_REQUESTS_WITHOUT_ORIGIN ?? (!IS_PRODUCTION ? "true" : "false")).toLowerCase() ===
  "true";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);
const ALLOWED_DOC_HOSTS = buildAllowedDocHosts(process.env.ALLOWED_DOC_HOSTS);
const ALLOWED_MCP_ORIGINS = buildAllowedMcpOrigins(process.env.ALLOWED_MCP_ORIGINS, IS_PRODUCTION);
const rateLimitEntries = new Map<string, RateLimitEntry>();

const projectRoot = process.cwd();
const documentsPath = path.join(projectRoot, "data", "documents.json");
const widgetBundlePath = path.join(projectRoot, "web", "dist", "component.js");
const automationStorePath =
  process.env.AUTOMATION_STORE_PATH?.trim() || path.join(projectRoot, "data", "automation-store.json");
const automationStoreManager = new AutomationStoreManager(automationStorePath);
const automationEngine = createAutomationEngine(automationStoreManager);
const notionSyncManager = new NotionSyncManager(automationStoreManager);
const AUTOMATION_FOLLOW_UP_INTERVAL_MS = Number(process.env.AUTOMATION_FOLLOW_UP_INTERVAL_MS ?? "0");

const normalize = (value: string) => value.trim().toLowerCase();
const tenantIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/;
const defaultSecuritySchemes = ENABLE_OAUTH_CHALLENGE
  ? [{ type: "oauth2", scopes: OAUTH_SCOPES }]
  : [{ type: "noauth" }];

const getBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

const getClientKey = (req: IncomingMessage): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
};

const isRateLimited = (clientKey: string, now: number): boolean => {
  const existing = rateLimitEntries.get(clientKey);
  if (!existing || now - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitEntries.set(clientKey, { windowStartedAt: now, count: 1 });
    return false;
  }

  existing.count += 1;
  return existing.count > RATE_LIMIT_MAX_REQUESTS;
};

const pruneRateLimiter = (now: number): void => {
  for (const [key, entry] of rateLimitEntries) {
    if (now - entry.windowStartedAt >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitEntries.delete(key);
    }
  }
};

const parseTenantId = (raw: string | undefined): string | null => {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  if (!tenantIdPattern.test(normalized)) {
    return null;
  }

  return normalized;
};

const getPublicBaseUrl = (req: IncomingMessage): string => {
  if (PUBLIC_BASE_URL) {
    return PUBLIC_BASE_URL;
  }

  const host = typeof req.headers.host === "string" ? req.headers.host : `localhost:${PORT}`;
  const forwardedProto = typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"] : "";
  const protocol = forwardedProto || (IS_PRODUCTION ? "https" : "http");
  return `${protocol}://${host}`;
};

const buildWwwAuthenticateHeader = (req: IncomingMessage): string => {
  const resourceMetadataUrl = `${getPublicBaseUrl(req)}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${resourceMetadataUrl}", error="insufficient_scope", error_description="Authentication required"`;
};

const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  text: z.string().min(1),
  metadata: z.record(z.string()).optional()
});

const loadDocuments = async () => {
  const raw = await readFile(documentsPath, "utf8");
  return z.array(documentSchema).parse(JSON.parse(raw)) as KnowledgeDocument[];
};

const buildJsonResponse = (res: import("node:http").ServerResponse, statusCode: number, payload: unknown) => {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const syncAutomationRecord = async (recordId: string): Promise<SyncResult> => {
  try {
    return await notionSyncManager.syncRecordById(recordId);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (!notionSyncManager.isEnabled()) {
      return {
        enabled: false,
        synced: false,
        reason: details
      };
    }
    return {
      enabled: true,
      synced: false,
      recordId,
      error: details
    };
  }
};

const syncAutomationRecords = async (recordIds: string[]): Promise<SyncResult[]> => {
  const uniqueRecordIds = Array.from(new Set(recordIds.filter(Boolean)));
  const results: SyncResult[] = [];

  for (const recordId of uniqueRecordIds) {
    results.push(await syncAutomationRecord(recordId));
  }

  return results;
};

const describeSyncOutcome = (sync: SyncResult): string => {
  if (!sync.enabled) {
    return `Notion sync skipped: ${sync.reason}`;
  }
  if (sync.synced) {
    return `Notion sync completed${sync.target ? ` via "${sync.target}"` : ""}.`;
  }
  return `Notion sync failed${sync.error ? `: ${sync.error}` : "."}`;
};

const scoreDocument = (query: string, document: KnowledgeDocument) => {
  const haystack = normalize(
    `${document.title}\n${document.text}\n${JSON.stringify(document.metadata ?? {})}`
  );
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  return terms.reduce((score, term) => {
    if (!haystack.includes(term)) {
      return score;
    }

    return score + 1 + (normalize(document.title).includes(term) ? 3 : 0);
  }, 0);
};

const buildSearchResults = (documents: KnowledgeDocument[], query: string): SearchResult[] =>
  documents
    .map((document) => ({ document, score: scoreDocument(query, document) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ document }) => ({
      id: document.id,
      title: document.title,
      url: document.url
    }));

const buildWidgetHtml = (bundle: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Knowledge Search</title>
    <style>
      html, body, #root {
        margin: 0;
        min-height: 100%;
        width: 100%;
      }

      body {
        background:
          radial-gradient(circle at top, #f4efe2 0%, #fbf8f1 36%, #eef3f2 100%);
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${bundle}</script>
  </body>
</html>
`.trim();

const createAppServer = async (requestContext: RequestContext) => {
  let widgetBundle = "";
  try {
    widgetBundle = await readFile(widgetBundlePath, "utf8");
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Widget bundle not found at ${widgetBundlePath}. Run "npm run build:web" first. (${details})`
    );
  }

  const documents = await loadDocuments();
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const safeDocumentsById = new Map<string, KnowledgeDocument>();

  for (const document of documents) {
    const safeUrl = getSafeDocumentUrl(document.url, ALLOWED_DOC_HOSTS);
    if (!safeUrl) {
      continue;
    }

    safeDocumentsById.set(document.id, {
      ...document,
      url: safeUrl
    });
  }

  const safeDocuments = Array.from(safeDocumentsById.values());
  const tenantScopedDocuments =
    requestContext.tenantId === null
      ? safeDocuments
      : safeDocuments.filter((document) => document.metadata?.tenantId === requestContext.tenantId);
  const tenantScopedDocumentsById = new Map(tenantScopedDocuments.map((document) => [document.id, document]));
  const allowedSourceHostsForWidget = Array.from(
    new Set(tenantScopedDocuments.map((document) => new URL(document.url).hostname.toLowerCase()))
  );

  const server = new McpServer({
    name: "knowledge-react-widget-starter",
    version: APP_VERSION
  });

  registerAppResource(server, "knowledge-search-widget", WIDGET_URI, {}, async () => ({
    contents: [
      {
        uri: WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: buildWidgetHtml(widgetBundle),
        _meta: {
          ui: {
            prefersBorder: true,
            csp: {
              connectDomains: [],
              resourceDomains: []
            }
          },
          "openai/widgetDescription":
            "Shows search results from the sample knowledge base and lets the user inspect documents inline."
        }
      }
    ]
  }));

  server.registerTool(
    "search",
    {
      title: "Search knowledge",
      description:
        "Use this when you need to search the connected knowledge base for relevant documents.",
      inputSchema: { query: z.string().min(1) },
      _meta: {
        securitySchemes: defaultSecuritySchemes
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      }
    },
    async ({ query }) => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ results: buildSearchResults(tenantScopedDocuments, query) })
        }
      ]
    })
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch document",
      description:
        "Use this when you need the full text and metadata for a specific document id returned by search.",
      inputSchema: { id: z.string().min(1) },
      _meta: {
        securitySchemes: defaultSecuritySchemes
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      }
    },
    async ({ id }) => {
      const document = documentsById.get(id);

      if (!document) {
        throw new Error(`Document not found for id: ${id}`);
      }

      const safeDocument = tenantScopedDocumentsById.get(id);
      if (!safeDocument) {
        throw new Error(`Document not accessible for id: ${id}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: safeDocument.id,
              title: safeDocument.title,
              text: safeDocument.text,
              url: safeDocument.url,
              metadata: safeDocument.metadata
            })
          }
        ]
      };
    }
  );

  registerAppTool(
    server,
    "render_search_widget",
    {
      title: "Render search widget",
      description:
        "Use this when you want a React widget that presents knowledge search results and supports inline document inspection.",
      inputSchema: {
        query: z.string().min(1)
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      },
      _meta: {
        ui: {
          resourceUri: WIDGET_URI,
          visibility: ["model", "app"]
        },
        securitySchemes: defaultSecuritySchemes,
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Building search view…",
        "openai/toolInvocation/invoked": "Search view ready."
      }
    },
    async ({ query }) => {
      const results = buildSearchResults(tenantScopedDocuments, query);
      const selected =
        results.length > 0 ? tenantScopedDocumentsById.get(results[0].id) ?? null : null;

      return {
        structuredContent: {
          query,
          results
        },
        content: [
          {
            type: "text" as const,
            text: `Rendered ${results.length} result${results.length === 1 ? "" : "s"} for "${query}".`
          }
        ],
        _meta: {
          selectedDocument: selected,
          allowedSourceHosts: allowedSourceHostsForWidget
        }
      };
    }
  );

  server.registerTool(
    "capture_conversation",
    {
      title: "Capture conversation",
      description:
        "Use this when you want to convert a conversation into a task, todo, research note, knowledge record, incident, or inbox capture automatically.",
      inputSchema: {
        message: z.string().min(1),
        conversationId: z.string().min(1).default("default"),
        messageId: z.string().min(1).optional(),
        idempotencyKey: z.string().min(1).optional(),
        channel: z.string().min(1).optional(),
        userId: z.string().min(1).optional(),
        assignee: z.string().min(1).optional(),
        provider: z.enum(["auto", "heuristic", "openai", "anthropic"]).default("auto"),
        policyMode: z.enum(["auto", "ask-first", "hybrid"]).default("hybrid"),
        metadata: z.record(z.string()).optional()
      },
      _meta: {
        securitySchemes: defaultSecuritySchemes,
        "openai/toolInvocation/invoking": "Capturing conversation…",
        "openai/toolInvocation/invoked": "Conversation captured."
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false
      }
    },
    async (input) => {
      const result = await automationEngine.captureConversation(input);
      const sync = await syncAutomationRecord(result.record.id);
      return {
        structuredContent: {
          ...result,
          sync
        },
        content: [
          {
            type: "text" as const,
            text: `Stored conversation as ${result.record.type} (${result.mode}) with title "${result.record.title}". ${describeSyncOutcome(sync)}`
          }
        ]
      };
    }
  );

  server.registerTool(
    "list_automation_records",
    {
      title: "List automation records",
      description:
        "Use this when you need the latest automatically captured tasks, todo items, research notes, knowledge records, incidents, or inbox items.",
      inputSchema: {
        type: z.enum(["task", "todo", "research", "knowledge", "incident", "inbox"]).optional(),
        status: z.enum(["draft", "active", "done", "blocked", "archived"]).optional(),
        limit: z.number().int().positive().max(100).default(20),
        query: z.string().min(1).optional()
      },
      _meta: {
        securitySchemes: defaultSecuritySchemes
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true
      }
    },
    async (input) => {
      const records = await automationEngine.listRecords(input);
      return {
        structuredContent: { records },
        content: [
          {
            type: "text" as const,
            text: `Returned ${records.length} automation record${records.length === 1 ? "" : "s"}.`
          }
        ]
      };
    }
  );

  server.registerTool(
    "update_automation_record_status",
    {
      title: "Update automation record status",
      description:
        "Use this when a captured task, todo, research note, incident, or inbox item changes state and should be marked active, done, blocked, archived, or draft.",
      inputSchema: {
        recordId: z.string().min(1),
        status: z.enum(["draft", "active", "done", "blocked", "archived"]),
        note: z.string().min(1).optional()
      },
      _meta: {
        securitySchemes: defaultSecuritySchemes,
        "openai/toolInvocation/invoking": "Updating record…",
        "openai/toolInvocation/invoked": "Record updated."
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false
      }
    },
    async (input) => {
      const record = await automationEngine.updateRecordStatus(input);
      const sync = await syncAutomationRecord(record.id);
      return {
        structuredContent: { record, sync },
        content: [
          {
            type: "text" as const,
            text: `Updated "${record.title}" to status "${record.status}". ${describeSyncOutcome(sync)}`
          }
        ]
      };
    }
  );

  server.registerTool(
    "run_follow_up_cycle",
    {
      title: "Run follow-up cycle",
      description:
        "Use this when you want to process scheduled follow-up jobs and automatically create reminder records for overdue or review-ready work.",
      inputSchema: {
        nowIso: z.string().min(1).optional(),
        limit: z.number().int().positive().max(100).default(20)
      },
      _meta: {
        securitySchemes: defaultSecuritySchemes,
        "openai/toolInvocation/invoking": "Running follow-ups…",
        "openai/toolInvocation/invoked": "Follow-up cycle completed."
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false
      }
    },
    async (input) => {
      const records = await automationEngine.runFollowUpCycle(input);
      const sync = await syncAutomationRecords(records.map((record) => record.id));
      return {
        structuredContent: { records, sync },
        content: [
          {
            type: "text" as const,
            text:
              records.length === 0
                ? "No follow-up reminder records were created."
                : `Created ${records.length} follow-up reminder record${records.length === 1 ? "" : "s"}.`
          }
        ]
      };
    }
  );

  return server;
};

const httpServer = createServer(async (req, res) => {
  pruneRateLimiter(Date.now());

  if (!req.url) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("Missing URL");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowedCorsOrigin = getAllowedCorsOrigin(requestOrigin, ALLOWED_MCP_ORIGINS);
  const clientKey = getClientKey(req);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    if (!allowedCorsOrigin) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("CORS origin not allowed");
      return;
    }

    res.writeHead(204, {
      "Access-Control-Allow-Origin": allowedCorsOrigin,
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
      Vary: "Origin"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        name: "knowledge-react-widget-starter",
        status: "ok",
        mcpPath: MCP_PATH,
        version: APP_VERSION,
        automation: {
          endpoints: [
            "GET /automation/state",
            "GET /automation/records",
            "POST /automation/capture",
            "POST /automation/records/status",
            "POST /automation/followups/run"
          ],
          notionSync: notionSyncManager.getStatus()
        }
      })
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/automation/state") {
    const state = await automationEngine.getStateSummary();
    buildJsonResponse(res, 200, {
      ...state,
      notionSync: notionSyncManager.getStatus()
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/automation/records") {
    try {
      const limit = url.searchParams.get("limit");
      const records = await automationEngine.listRecords({
        type: url.searchParams.get("type") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        query: url.searchParams.get("query") ?? undefined,
        limit: limit ? Number(limit) : undefined
      });
      buildJsonResponse(res, 200, { records });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      buildJsonResponse(res, 400, { error: details });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/automation/capture") {
    try {
      const body = await readJsonBody(req);
      const result = await automationEngine.captureConversation(body);
      const sync = await syncAutomationRecord(result.record.id);
      buildJsonResponse(res, 200, {
        ...result,
        sync
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      buildJsonResponse(res, 400, { error: details });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/automation/records/status") {
    try {
      const body = await readJsonBody(req);
      const record = await automationEngine.updateRecordStatus(body);
      const sync = await syncAutomationRecord(record.id);
      buildJsonResponse(res, 200, { record, sync });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      buildJsonResponse(res, 400, { error: details });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/automation/followups/run") {
    try {
      const body = await readJsonBody(req);
      const records = await automationEngine.runFollowUpCycle(body);
      const sync = await syncAutomationRecords(records.map((record) => record.id));
      buildJsonResponse(res, 200, { records, sync });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      buildJsonResponse(res, 400, { error: details });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
    const metadata = {
      resource: getPublicBaseUrl(req),
      authorization_servers: OAUTH_AUTHORIZATION_SERVERS,
      scopes_supported: OAUTH_SCOPES
    };
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(metadata));
    return;
  }

  const supportedMethods = new Set(["GET", "POST", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && supportedMethods.has(req.method)) {
    if (isRateLimited(clientKey, Date.now())) {
      res.writeHead(429, {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
      });
      res.end("Too many requests");
      return;
    }

    if (requestOrigin && !allowedCorsOrigin) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("CORS origin not allowed");
      return;
    }

    if (!requestOrigin && !ALLOW_REQUESTS_WITHOUT_ORIGIN) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Origin header required");
      return;
    }

    const bearerToken = getBearerToken(
      typeof req.headers.authorization === "string" ? req.headers.authorization : undefined
    );
    if (AUTH_BEARER_TOKEN && bearerToken !== AUTH_BEARER_TOKEN) {
      const wwwAuthenticate = ENABLE_OAUTH_CHALLENGE
        ? buildWwwAuthenticateHeader(req)
        : 'Bearer realm="mcp", error="invalid_token"';
      res.writeHead(401, {
        "content-type": "text/plain; charset=utf-8",
        "www-authenticate": wwwAuthenticate
      });
      res.end("Unauthorized");
      return;
    }

    const rawTenantHeader = req.headers[TENANT_ID_HEADER];
    const tenantId = parseTenantId(typeof rawTenantHeader === "string" ? rawTenantHeader : undefined);
    if (REQUIRE_TENANT_ID && tenantId === null) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Missing or invalid ${TENANT_ID_HEADER} header`);
      return;
    }

    if (allowedCorsOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedCorsOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    }

    const server = await createAppServer({ tenantId });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request failed", error);

      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal server error");
      }
    }

    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(
    `knowledge-react-widget-starter listening on http://localhost:${PORT}${MCP_PATH}`
  );
});

if (AUTOMATION_FOLLOW_UP_INTERVAL_MS > 0) {
  const timer = setInterval(() => {
    void (async () => {
      try {
        const records = await automationEngine.runFollowUpCycle({ limit: 20 });
        if (records.length > 0) {
          await syncAutomationRecords(records.map((record) => record.id));
        }
      } catch (error) {
        console.error("Automation follow-up cycle failed", error);
      }
    })();
  }, AUTOMATION_FOLLOW_UP_INTERVAL_MS);
  timer.unref();
}
