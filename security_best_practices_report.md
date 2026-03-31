# Security Best Practices Report

## Executive Summary

This repository is a small TypeScript ChatGPT Apps SDK starter with a Node HTTP MCP server and a React widget. The codebase avoids several common high-risk patterns such as `dangerouslySetInnerHTML`, `eval`, and client-side secret embedding. The main issues are around trust boundaries: unvalidated outbound URLs, permissive `postMessage` usage, and a fully wildcard CORS policy on the MCP endpoint.

The most important secure-by-default improvements are:

1. Restrict outbound document URLs to an explicit scheme and host allowlist before calling `openExternal`.
2. Replace wildcard `postMessage` usage with explicit parent-origin validation and message schema checks.
3. Tighten CORS on `/mcp` before the sample app is connected to any private knowledge source or session-based auth.

## Scope

- Server: `server/src/index.ts`
- Frontend widget: `web/src/component.tsx`
- Data fixture: `data/documents.json`
- Package/config: `package.json`, `tsconfig.json`, `README.md`

## Critical Findings

None identified in the current sample code.

## High Findings

### SBP-001: Unvalidated document URLs are passed directly to external navigation

- Severity: High
- Rule ID: REACT-XSS-002 / general safe-navigation hardening
- Location: `web/src/component.tsx:156-159`, `server/src/index.ts:35-40`, `server/src/index.ts:184-188`
- Evidence:

```ts
const openSource = async () => {
  const href = selectedDocument?.url ?? results[0]?.url;
  if (!href || !window.openai?.openExternal) return;
  await window.openai.openExternal({ href });
};
```

```ts
const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  text: z.string().min(1),
  metadata: z.record(z.string()).optional()
});
```

- Impact: If a future knowledge connector, CMS import, or compromised document feed injects a non-HTTP(S) URL or an attacker-controlled destination, the widget will forward users to that target. Depending on `openExternal` runtime behavior, this can become phishing, unsafe protocol handling, or script-scheme abuse.
- Fix: Validate `document.url` against an allowlist of protocols such as `https:` and `http:` and, ideally, allowed hostnames before it is exposed to the widget or passed to `openExternal`.
- Mitigation: Treat connector-fed URLs as untrusted data. Normalize with `new URL()`, reject unsupported schemes, and consider returning a safe canonical URL generated server-side instead of trusting source records.
- False positive notes: If the host runtime already blocks non-web schemes inside `openExternal`, the exploitability is reduced. The code still relies on an external guard that is not visible in this repo.

## Medium Findings

### SBP-002: Widget RPC bridge uses wildcard `postMessage` targets and does not verify parent origin

- Severity: Medium
- Rule ID: JS-XORIGIN-001 / cross-window messaging hardening
- Location: `web/src/component.tsx:45-54`, `web/src/component.tsx:77-99`
- Evidence:

```ts
const rpcNotify = (method: string, params: unknown) => {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
};

const rpcRequest = (method: string, params: unknown) =>
  new Promise<any>((resolve, reject) => {
    const id = ++rpcId;
    pendingRequests.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  });
```

```ts
const onMessage = (event: MessageEvent) => {
  if (event.source !== window.parent) return;
  const message = event.data;
  if (!message || message.jsonrpc !== "2.0") return;
```

- Impact: The widget accepts messages solely based on `event.source` and sends requests with `targetOrigin="*"`. That is a weak trust model for a bridge that can update UI state and trigger tool calls. If the embedding parent origin is unexpected or changes, spoofed results or confused-deputy behavior become possible.
- Fix: Capture the expected parent origin during initialization, send messages only to that origin, and reject inbound messages whose `event.origin` does not exactly match it. Validate the inbound payload shape before using it.
- Mitigation: Define narrow schemas for `tool-result` and RPC responses with `zod` and ignore malformed or oversized payloads.
- False positive notes: If the widget is only ever embedded by a single trusted ChatGPT origin and the platform guarantees origin isolation, the practical exposure is lower. Those guarantees are not enforced in this code.

### SBP-003: MCP endpoint is fully cross-origin accessible

- Severity: Medium
- Rule ID: server CORS hardening
- Location: `server/src/index.ts:257-263`, `server/src/index.ts:281-285`
- Evidence:

```ts
if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, mcp-session-id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id"
  });
}
```

```ts
if (url.pathname === MCP_PATH && req.method && supportedMethods.has(req.method)) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
```

- Impact: Any website can script requests to this MCP endpoint. That is acceptable for a public demo corpus, but it becomes a data-exposure and policy problem once the app is connected to private content, API-backed connectors, or any credentialed/session-bound behavior.
- Fix: Replace `*` with an explicit allowlist of trusted origins, ideally configured via environment variable. Keep the default locked down for production.
- Mitigation: If public access is intentional, document that the endpoint is unauthenticated and public-read by design. Add rate limiting and origin restrictions before attaching non-public data.
- False positive notes: This endpoint currently serves read-only demo data and does not appear to use cookies or bearer auth. Severity increases materially if that changes.

## Low Findings

None that warranted inclusion as standalone issues.

## Positive Observations

- No use of `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or string-based timers was found.
- The fixture data is schema-validated with `zod` before use.
- The tools are declared read-only, which reduces accidental mutation risk in the sample app.

## Secure-by-Default Improvement Checklist

1. Add a shared URL validator on the server that only permits approved schemes and hosts for `KnowledgeDocument.url`.
2. Centralize widget bridge message validation with `zod`, and bind the bridge to a specific parent origin instead of `*`.
3. Make CORS origin restrictions configurable and default-deny in production.
4. Add basic request throttling or reverse-proxy rate limiting for `/mcp` before internet exposure.
5. Verify runtime-delivered security headers for the deployed surface, especially CSP, `X-Content-Type-Options`, and clickjacking protections. Those controls are not visible in this repo and should be checked at the hosting layer.

## Suggested Fix Order

1. SBP-001: URL allowlisting before external navigation.
2. SBP-002: explicit `postMessage` origin binding and payload validation.
3. SBP-003: CORS origin allowlist and production default-deny behavior.
