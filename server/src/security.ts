const DEFAULT_DEV_MCP_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
]);

const DEFAULT_CHATGPT_MCP_ORIGINS = new Set(["https://chatgpt.com", "https://chat.openai.com"]);

const ALLOWED_DOCUMENT_PROTOCOLS = new Set(["http:", "https:"]);

const parseCommaSeparatedList = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const buildAllowedDocHosts = (raw: string | undefined): Set<string> =>
  new Set(parseCommaSeparatedList(raw).map((entry) => entry.toLowerCase()));

export const getSafeDocumentUrl = (rawUrl: string, allowedHosts: Set<string>): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!ALLOWED_DOCUMENT_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  const normalizedHost = parsed.hostname.toLowerCase();
  if (allowedHosts.size > 0 && !allowedHosts.has(normalizedHost)) {
    return null;
  }

  return parsed.toString();
};

export const buildAllowedMcpOrigins = (
  rawOrigins: string | undefined,
  isProduction: boolean
): Set<string> => {
  const configuredOrigins = new Set(
    parseCommaSeparatedList(rawOrigins)
      .map(normalizeOrigin)
      .filter((origin): origin is string => origin !== null)
  );

  if (configuredOrigins.size > 0) {
    return configuredOrigins;
  }

  if (isProduction) {
    return new Set(DEFAULT_CHATGPT_MCP_ORIGINS);
  }

  return new Set([...DEFAULT_DEV_MCP_ORIGINS, ...DEFAULT_CHATGPT_MCP_ORIGINS]);
};

export const getAllowedCorsOrigin = (
  requestOrigin: string | undefined,
  allowedOrigins: Set<string>
): string | null => {
  if (!requestOrigin) {
    return null;
  }

  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedOrigin) {
    return null;
  }

  return allowedOrigins.has(normalizedOrigin) ? normalizedOrigin : null;
};
