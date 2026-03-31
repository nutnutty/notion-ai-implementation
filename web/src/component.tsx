import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";

type SearchResult = {
  id: string;
  title: string;
  url: string;
};

type KnowledgeDocument = {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, string>;
};

type ToolPayload = {
  structuredContent?: {
    query?: string;
    results?: SearchResult[];
  };
  _meta?: {
    selectedDocument?: KnowledgeDocument | null;
    allowedSourceHosts?: string[];
  };
};

const searchResultSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url()
});

const knowledgeDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url(),
  metadata: z.record(z.string()).optional()
});

const toolPayloadSchema = z.object({
  structuredContent: z
    .object({
      query: z.string().optional(),
      results: z.array(searchResultSchema).optional()
    })
    .optional(),
  _meta: z
    .object({
      selectedDocument: knowledgeDocumentSchema.nullable().optional(),
      allowedSourceHosts: z.array(z.string().min(1)).optional()
    })
    .optional()
});

const rpcMessageSchema = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: z.number().optional(),
    method: z.string().optional(),
    params: z.unknown().optional(),
    result: z.unknown().optional(),
    error: z.unknown().optional()
  })
  .passthrough();

const toolCallResponseSchema = z.object({
  content: z.array(z.object({ text: z.string() })).optional(),
  structuredContent: z.unknown().optional(),
  _meta: z.unknown().optional()
});

declare global {
  interface Window {
    openai?: {
      openExternal?: (args: { href: string; redirectUrl?: boolean }) => Promise<void>;
    };
  }
}

let rpcId = 0;
let trustedParentOrigin: string | null = null;
const pendingRequests = new Map<
  number,
  {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
  }
>();

const deriveTrustedParentOrigin = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const ancestorOrigin = (window.location as Location & { ancestorOrigins?: DOMStringList })
    .ancestorOrigins?.[0];
  if (ancestorOrigin) {
    return ancestorOrigin;
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      return null;
    }
  }

  return null;
};

const isSafeExternalUrl = (value: string, allowedHosts: Set<string>): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return false;
    }

    if (allowedHosts.size > 0 && !allowedHosts.has(parsed.hostname.toLowerCase())) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const rpcNotify = (method: string, params: unknown) => {
  if (!trustedParentOrigin) {
    return;
  }

  window.parent.postMessage({ jsonrpc: "2.0", method, params }, trustedParentOrigin);
};

const rpcRequest = (method: string, params: unknown) =>
  new Promise<any>((resolve, reject) => {
    if (!trustedParentOrigin) {
      reject(new Error("Trusted parent origin is not initialized."));
      return;
    }

    const id = ++rpcId;
    pendingRequests.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, trustedParentOrigin);
  });

const initializeBridge = async () => {
  trustedParentOrigin = deriveTrustedParentOrigin();
  if (!trustedParentOrigin) {
    throw new Error("Unable to determine trusted parent origin.");
  }

  await rpcRequest("ui/initialize", {
    appInfo: { name: "knowledge-react-widget", version: "0.2.0" },
    appCapabilities: {},
    protocolVersion: "2026-01-26"
  });
  rpcNotify("ui/notifications/initialized", {});
};

const safeParseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

function App() {
  const [payload, setPayload] = useState<ToolPayload | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      if (!trustedParentOrigin || event.origin !== trustedParentOrigin) {
        return;
      }

      const parsedMessage = rpcMessageSchema.safeParse(event.data);
      if (!parsedMessage.success) {
        return;
      }

      const message = parsedMessage.data;

      if (typeof message.id === "number") {
        const pending = pendingRequests.get(message.id);
        if (!pending) return;
        pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(message.error);
          return;
        }

        pending.resolve(message.result);
        return;
      }

      if (message.method === "ui/notifications/tool-result") {
        const parsedPayload = toolPayloadSchema.safeParse(message.params);
        if (!parsedPayload.success) {
          setErrorMessage("Ignored malformed tool result payload.");
          return;
        }

        setErrorMessage("");
        setPayload(parsedPayload.data);
      }
    };

    window.addEventListener("message", onMessage, { passive: true });
    void initializeBridge().catch((error) => {
      const details = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Bridge initialization failed: ${details}`);
    });

    return () => window.removeEventListener("message", onMessage);
  }, []);

  const query = payload?.structuredContent?.query ?? "";
  const results = payload?.structuredContent?.results ?? [];
  const selectedDocument = payload?._meta?.selectedDocument ?? null;
  const allowedSourceHosts = new Set(
    (payload?._meta?.allowedSourceHosts ?? []).map((host) => host.toLowerCase())
  );

  const reloadWidget = async () => {
    if (!query) return;
    setErrorMessage("");
    try {
      const response = await rpcRequest("tools/call", {
        name: "render_search_widget",
        arguments: { query }
      });
      const parsedPayload = toolPayloadSchema.safeParse(response);
      if (!parsedPayload.success) {
        setErrorMessage("Search rerender returned malformed payload.");
        return;
      }

      setPayload(parsedPayload.data);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Search rerender failed: ${details}`);
    }
  };

  const loadDocument = async (id: string) => {
    setLoadingId(id);
    setErrorMessage("");

    try {
      const rpcResponse = await rpcRequest("tools/call", {
        name: "fetch",
        arguments: { id }
      });
      const response = toolCallResponseSchema.safeParse(rpcResponse);
      if (!response.success) {
        setErrorMessage("Fetch returned malformed RPC payload.");
        return;
      }

      const document = safeParseJson(response.data.content?.[0]?.text ?? "");
      if (!document) {
        setErrorMessage("Fetch returned invalid JSON payload.");
        return;
      }

      const parsedDocument = knowledgeDocumentSchema.safeParse(document);
      if (!parsedDocument.success) {
        setErrorMessage("Fetch returned invalid document payload.");
        return;
      }

      setPayload((current) => ({
        ...(current ?? {}),
        _meta: {
          ...(current?._meta ?? {}),
          selectedDocument: parsedDocument.data
        }
      }));
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Document fetch failed: ${details}`);
    } finally {
      setLoadingId(null);
    }
  };

  const askForSummary = () => {
    rpcNotify("ui/message", {
      role: "user",
      content: [
        {
          type: "text",
          text: `Summarize the most relevant findings for ${query || "the visible knowledge results"}.`
        }
      ]
    });
  };

  const openSource = async () => {
    const href = selectedDocument?.url ?? results[0]?.url;
    if (!href || !window.openai?.openExternal || !isSafeExternalUrl(href, allowedSourceHosts)) return;
    await window.openai.openExternal({ href });
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div style={styles.eyebrow}>React Widget</div>
          <h1 style={styles.title}>{query ? `Results for "${query}"` : "Knowledge search"}</h1>
          <p style={styles.subtitle}>
            {results.length} result{results.length === 1 ? "" : "s"} available
          </p>
        </div>

        <div style={styles.toolbar}>
          <button style={{ ...styles.button, ...styles.primary }} onClick={reloadWidget} disabled={!query}>
            Re-run search
          </button>
          <button style={{ ...styles.button, ...styles.secondary }} onClick={askForSummary}>
            Ask ChatGPT for summary
          </button>
          <button
            style={{ ...styles.button, ...styles.accent }}
            onClick={() => void openSource()}
            disabled={!selectedDocument?.url && results.length === 0}
          >
            Open source
          </button>
        </div>

        {errorMessage ? <div style={styles.errorBanner}>{errorMessage}</div> : null}

        {selectedDocument ? (
          <section style={{ ...styles.card, ...styles.selectedCard }}>
            <div style={styles.meta}>
              {(selectedDocument.metadata?.category ?? "document") +
                " · " +
                (selectedDocument.metadata?.updatedAt ?? "unknown date")}
            </div>
            <h2 style={styles.cardTitle}>{selectedDocument.title}</h2>
            <p style={styles.body}>{selectedDocument.text}</p>
          </section>
        ) : null}

        <div style={styles.grid}>
          {results.map((result) => (
            <section
              key={result.id}
              style={{
                ...styles.card,
                ...(selectedDocument?.id === result.id ? styles.selectedOutline : {})
              }}
            >
              <div style={styles.meta}>{result.id}</div>
              <h2 style={styles.cardTitle}>{result.title}</h2>
              <p style={styles.linkText}>{result.url}</p>
              <button
                style={{ ...styles.button, ...styles.secondary, width: "100%" }}
                onClick={() => void loadDocument(result.id)}
                disabled={loadingId === result.id}
              >
                {loadingId === result.id ? "Loading…" : "Load document"}
              </button>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100%",
    padding: 14,
    color: "#17202a",
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif'
  },
  shell: {
    borderRadius: 24,
    overflow: "hidden",
    background: "rgba(255, 252, 246, 0.96)",
    border: "1px solid rgba(36, 45, 58, 0.12)",
    boxShadow: "0 20px 44px rgba(41, 31, 12, 0.08)"
  },
  header: {
    padding: "20px 20px 16px",
    color: "#f8f6f0",
    background: "linear-gradient(135deg, #16344f 0%, #215561 60%, #d79a49 150%)"
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    opacity: 0.82
  },
  title: {
    margin: "8px 0 6px",
    fontSize: 24,
    lineHeight: 1.1
  },
  subtitle: {
    margin: 0,
    color: "rgba(248, 246, 240, 0.88)"
  },
  errorBanner: {
    margin: "0 16px 16px",
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(178, 39, 39, 0.08)",
    border: "1px solid rgba(178, 39, 39, 0.25)",
    color: "#6d1f1f",
    fontSize: 14
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
    padding: 16
  },
  button: {
    border: 0,
    borderRadius: 999,
    padding: "11px 14px",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer"
  },
  primary: {
    background: "#173d56",
    color: "#f8f6f0"
  },
  secondary: {
    background: "rgba(23, 61, 86, 0.08)",
    color: "#173d56"
  },
  accent: {
    background: "#d79a49",
    color: "#23170a"
  },
  grid: {
    display: "grid",
    gap: 12,
    padding: "0 16px 16px"
  },
  card: {
    background: "#fffdf8",
    border: "1px solid rgba(36, 45, 58, 0.1)",
    borderRadius: 18,
    padding: 16
  },
  selectedCard: {
    margin: "0 16px 16px"
  },
  selectedOutline: {
    borderColor: "rgba(215, 154, 73, 0.72)",
    boxShadow: "0 8px 20px rgba(215, 154, 73, 0.12)"
  },
  meta: {
    fontSize: 12,
    color: "#665c4f"
  },
  cardTitle: {
    margin: "8px 0 8px",
    fontSize: 18
  },
  linkText: {
    margin: "0 0 12px",
    color: "#37576b",
    wordBreak: "break-word"
  },
  body: {
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
    color: "#2a3240"
  }
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

createRoot(rootElement).render(<App />);
