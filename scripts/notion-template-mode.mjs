#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const templatesRoot = path.join(cwd, "docs", "notion-templates");
const manifestPath = path.join(templatesRoot, "manifest.json");

const args = parseArgs(process.argv.slice(2));
const command = args.positional[0] ?? "help";

const ensureMode = (manifest, mode) => {
  if (!mode) {
    throw new Error("Missing --mode. Example: --mode=th-en-split");
  }

  if (!manifest.modes[mode]) {
    throw new Error(
      `Unknown mode "${mode}". Use one of: ${Object.keys(manifest.modes)
        .map((value) => `"${value}"`)
        .join(", ")}`
    );
  }
};

function parseArgs(argv) {
  const out = { positional: [], values: {}, flags: new Set() };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      out.positional.push(token);
      continue;
    }

    const [, key, inlineValue] = token.match(/^--([^=]+)(?:=(.*))?$/) ?? [];
    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      out.values[key] = inlineValue;
      continue;
    }

    const maybeValue = argv[index + 1];
    if (maybeValue && !maybeValue.startsWith("--")) {
      out.values[key] = maybeValue;
      index += 1;
      continue;
    }

    out.flags.add(key);
  }

  return out;
}

async function loadManifest() {
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

function renderTemplate(rawTemplate, context) {
  return rawTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, token) => {
    const key = token.trim();
    return context[key] ?? "";
  });
}

async function readTemplate(templatePath) {
  const abs = path.join(templatesRoot, templatePath);
  return readFile(abs, "utf8");
}

function validateModeCoverage(manifest, modeName, modeConfig) {
  const errors = [];
  for (const logicalId of manifest.requiredLogicalIds) {
    const candidates = modeConfig.pages.filter((entry) => entry.logicalId === logicalId);
    const expectedCount = modeConfig.expectPerLogicalId ?? 1;
    if (candidates.length !== expectedCount) {
      errors.push(
        `[${modeName}] logicalId "${logicalId}" expected ${expectedCount} page(s) but found ${candidates.length}`
      );
      continue;
    }

    if (Array.isArray(modeConfig.requiredLanguages)) {
      for (const language of modeConfig.requiredLanguages) {
        if (!candidates.some((entry) => entry.language === language)) {
          errors.push(
            `[${modeName}] logicalId "${logicalId}" is missing required language "${language}"`
          );
        }
      }
    }
  }
  return errors;
}

async function validateMode(manifest, modeName) {
  const modeConfig = manifest.modes[modeName];
  const errors = [];
  errors.push(...validateModeCoverage(manifest, modeName, modeConfig));

  for (const page of modeConfig.pages) {
    const templateAbs = path.join(templatesRoot, page.templatePath);
    let rawTemplate = "";
    try {
      rawTemplate = await readTemplate(page.templatePath);
    } catch (error) {
      errors.push(`[${modeName}] page "${page.id}" missing template ${templateAbs}`);
      continue;
    }

    const rendered = renderTemplate(rawTemplate, {
      PAGE_ID: page.id,
      PAGE_TITLE: page.title,
      MODE: modeName,
      LANGUAGE: page.language
    });

    for (const section of manifest.requiredSections) {
      const marker = `<!-- REQUIRED:${section} -->`;
      if (!rendered.includes(marker)) {
        errors.push(
          `[${modeName}] page "${page.id}" is missing marker ${marker} in template ${page.templatePath}`
        );
      }
    }
  }

  return errors;
}

function toOutputHeader(modeName, page) {
  return [
    "---",
    `mode: ${modeName}`,
    `pageId: ${page.id}`,
    `logicalId: ${page.logicalId}`,
    `language: ${page.language}`,
    `title: ${page.title}`,
    `templatePath: ${page.templatePath}`,
    "---",
    ""
  ].join("\n");
}

async function handleList(manifest) {
  const modeEntries = Object.entries(manifest.modes);
  console.log(`Default mode: ${manifest.defaultMode}`);
  console.log("Available modes:");
  for (const [modeName, modeConfig] of modeEntries) {
    const marker = modeName === manifest.defaultMode ? " (default)" : "";
    console.log(
      `- ${modeName}${marker}: ${modeConfig.description} [${modeConfig.pages.length} pages]`
    );
  }
}

async function handleApply(manifest, modeName, writeEnabled, outputDir) {
  ensureMode(manifest, modeName);
  const modeConfig = manifest.modes[modeName];
  const modeOutputDir = outputDir ?? path.join(templatesRoot, "build", modeName);

  console.log(
    `${writeEnabled ? "APPLY" : "DRY-RUN"} mode "${modeName}" with ${modeConfig.pages.length} page template(s)`
  );

  for (const page of modeConfig.pages) {
    console.log(`- ${page.id}: "${page.title}" <- ${page.templatePath}`);
  }

  if (!writeEnabled) {
    console.log("No files written. Re-run with --write to render output files.");
    return;
  }

  await mkdir(modeOutputDir, { recursive: true });
  const renderedIndex = [];

  for (const page of modeConfig.pages) {
    const rawTemplate = await readTemplate(page.templatePath);
    const renderedBody = renderTemplate(rawTemplate, {
      PAGE_ID: page.id,
      PAGE_TITLE: page.title,
      MODE: modeName,
      LANGUAGE: page.language
    });
    const output = `${toOutputHeader(modeName, page)}${renderedBody}\n`;
    const targetPath = path.join(modeOutputDir, `${page.id}.md`);
    await writeFile(targetPath, output, "utf8");
    renderedIndex.push({
      id: page.id,
      logicalId: page.logicalId,
      title: page.title,
      language: page.language,
      outputPath: path.relative(cwd, targetPath)
    });
  }

  const indexPath = path.join(modeOutputDir, "index.json");
  await writeFile(
    indexPath,
    `${JSON.stringify(
      {
        mode: modeName,
        generatedAt: new Date().toISOString(),
        pages: renderedIndex
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Wrote ${modeConfig.pages.length} rendered template file(s) to ${modeOutputDir}`);
}

async function handleValidate(manifest, modeName) {
  const modesToValidate = modeName ? [modeName] : Object.keys(manifest.modes);
  if (modeName) {
    ensureMode(manifest, modeName);
  }

  const allErrors = [];
  for (const mode of modesToValidate) {
    const errors = await validateMode(manifest, mode);
    if (errors.length === 0) {
      console.log(`PASS ${mode}`);
      continue;
    }

    console.log(`FAIL ${mode} (${errors.length} issue(s))`);
    for (const message of errors) {
      console.log(`  - ${message}`);
    }
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const manifest = await loadManifest();
  const modeName = args.values.mode ?? manifest.defaultMode;
  const writeEnabled = args.flags.has("write");
  const outputDir = args.values.output
    ? path.resolve(cwd, args.values.output)
    : undefined;

  if (command === "list") {
    await handleList(manifest);
    return;
  }

  if (command === "apply") {
    await handleApply(manifest, modeName, writeEnabled, outputDir);
    return;
  }

  if (command === "validate") {
    const mode = args.flags.has("all") ? undefined : args.values.mode;
    await handleValidate(manifest, mode);
    return;
  }

  console.log("Usage:");
  console.log("  node scripts/notion-template-mode.mjs list");
  console.log("  node scripts/notion-template-mode.mjs apply --mode=en-only [--write] [--output=path]");
  console.log("  node scripts/notion-template-mode.mjs validate [--mode=th-en-split|en-only|bilingual|--all]");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
