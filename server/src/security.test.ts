import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAllowedDocHosts,
  buildAllowedMcpOrigins,
  getAllowedCorsOrigin,
  getSafeDocumentUrl
} from "./security.js";

test("getSafeDocumentUrl allows http and https by default", () => {
  const allowedHosts = buildAllowedDocHosts(undefined);

  assert.equal(getSafeDocumentUrl("https://example.com/docs", allowedHosts), "https://example.com/docs");
  assert.equal(getSafeDocumentUrl("http://example.com/docs", allowedHosts), "http://example.com/docs");
});

test("getSafeDocumentUrl rejects unsupported schemes and malformed URLs", () => {
  const allowedHosts = buildAllowedDocHosts(undefined);

  assert.equal(getSafeDocumentUrl("javascript:alert(1)", allowedHosts), null);
  assert.equal(getSafeDocumentUrl("data:text/html,hello", allowedHosts), null);
  assert.equal(getSafeDocumentUrl("not a url", allowedHosts), null);
});

test("getSafeDocumentUrl applies host allowlist when configured", () => {
  const allowedHosts = buildAllowedDocHosts("example.com,docs.example.com");

  assert.equal(getSafeDocumentUrl("https://example.com/page", allowedHosts), "https://example.com/page");
  assert.equal(getSafeDocumentUrl("https://docs.example.com/page", allowedHosts), "https://docs.example.com/page");
  assert.equal(getSafeDocumentUrl("https://attacker.example/page", allowedHosts), null);
});

test("buildAllowedMcpOrigins uses localhost defaults in development when unset", () => {
  const allowedOrigins = buildAllowedMcpOrigins(undefined, false);

  assert.equal(allowedOrigins.has("http://localhost:5173"), true);
  assert.equal(allowedOrigins.has("http://127.0.0.1:5173"), true);
  assert.equal(allowedOrigins.has("https://chatgpt.com"), true);
});

test("buildAllowedMcpOrigins requires explicit values in production", () => {
  const allowedOrigins = buildAllowedMcpOrigins(undefined, true);

  assert.equal(allowedOrigins.has("https://chatgpt.com"), true);
  assert.equal(allowedOrigins.has("https://chat.openai.com"), true);
});

test("getAllowedCorsOrigin returns only allowlisted origins", () => {
  const allowedOrigins = buildAllowedMcpOrigins("https://chatgpt.com,http://localhost:5173", true);

  assert.equal(getAllowedCorsOrigin("https://chatgpt.com", allowedOrigins), "https://chatgpt.com");
  assert.equal(getAllowedCorsOrigin("http://localhost:5173", allowedOrigins), "http://localhost:5173");
  assert.equal(getAllowedCorsOrigin("https://evil.example", allowedOrigins), null);
  assert.equal(getAllowedCorsOrigin("this-is-not-an-origin", allowedOrigins), null);
});
