import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export type RecordKind = "spec" | "result";

const SPEC_STATUSES = new Set(["proposed", "approved", "in-progress", "completed"]);
const REQUIRED_SPEC_FIELDS = ["id", "title", "status", "created", "updated", "result"];
const REQUIRED_RESULT_FIELDS = ["id", "title", "status", "spec", "completed"];
const REQUIRED_SPEC_SECTIONS = [
  "Goal",
  "Non-goals",
  "Current-state findings",
  "Chosen approach",
  "Alternatives considered",
  "Affected files or modules",
  "Milestones",
  "Acceptance criteria",
  "Verification commands",
  "Risks and open questions",
  "Progress log",
  "Decision log",
];
const REQUIRED_RESULT_SECTIONS = [
  "What changed",
  "Files changed",
  "Checks run and results",
  "Deviations from the spec",
  "Important decisions",
  "Remaining follow-ups",
];

export interface RecordValidationError {
  file: string;
  message: string;
}

function parseFrontMatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---\n")) return {};
  const end = markdown.indexOf("\n---", 4);
  if (end < 0) return {};
  return Object.fromEntries(
    markdown
      .slice(4, end)
      .split("\n")
      .filter((line) => line.includes(":"))
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim()];
      }),
  );
}

function missingFields(frontMatter: Record<string, string>, fields: string[]): string[] {
  return fields.filter((field) => !frontMatter[field]);
}

function missingSections(markdown: string, sections: string[]): string[] {
  return sections.filter((section) => !new RegExp(`^##\\s+${section}\\s*$`, "im").test(markdown));
}

export function validateRecordText(file: string, markdown: string, kind: RecordKind): RecordValidationError[] {
  const frontMatter = parseFrontMatter(markdown);
  const requiredFields = kind === "spec" ? REQUIRED_SPEC_FIELDS : REQUIRED_RESULT_FIELDS;
  const errors: RecordValidationError[] = missingFields(frontMatter, requiredFields).map((field) => ({ file, message: `missing front matter field: ${field}` }));

  if (kind === "spec" && frontMatter.status && !SPEC_STATUSES.has(frontMatter.status)) {
    errors.push({ file, message: `invalid spec status: ${frontMatter.status}` });
  }
  if (kind === "result" && frontMatter.status !== "completed") {
    errors.push({ file, message: "result status must be completed" });
  }

  const sections = kind === "spec" ? REQUIRED_SPEC_SECTIONS : REQUIRED_RESULT_SECTIONS;
  for (const section of missingSections(markdown, sections)) {
    errors.push({ file, message: `missing required section: ${section}` });
  }

  const expectedId = basename(file, ".md");
  if (frontMatter.id && frontMatter.id !== expectedId) {
    errors.push({ file, message: `id must match filename: ${expectedId}` });
  }
  return errors;
}

export async function validateRecords(root = process.cwd()): Promise<RecordValidationError[]> {
  const specsRoot = join(root, "specs");
  const resultsRoot = join(root, "results");
  const [specFiles, resultFiles] = await Promise.all([
    readdir(specsRoot).then((files) => files.filter((file) => file.endsWith(".md"))),
    readdir(resultsRoot).then((files) => files.filter((file) => file.endsWith(".md"))),
  ]);
  const errors: RecordValidationError[] = [];
  const specs = new Map<string, Record<string, string>>();
  const results = new Map<string, Record<string, string>>();

  for (const file of specFiles) {
    const path = join(specsRoot, file);
    const text = await readFile(path, "utf8");
    errors.push(...validateRecordText(path, text, "spec"));
    specs.set(basename(file, ".md"), parseFrontMatter(text));
  }
  for (const file of resultFiles) {
    const path = join(resultsRoot, file);
    const text = await readFile(path, "utf8");
    errors.push(...validateRecordText(path, text, "result"));
    results.set(basename(file, ".md"), parseFrontMatter(text));
  }

  for (const [id, spec] of specs) {
    if (spec.status === "completed" && spec.result !== `results/${id}.md`) {
      errors.push({ file: `specs/${id}.md`, message: `completed spec must reference results/${id}.md` });
    }
    if (spec.result && !results.has(id)) errors.push({ file: `specs/${id}.md`, message: `missing result for ${id}` });
  }
  for (const [id, result] of results) {
    if (result.spec !== `specs/${id}.md`) errors.push({ file: `results/${id}.md`, message: `result must reference specs/${id}.md` });
    if (!specs.has(id)) errors.push({ file: `results/${id}.md`, message: `missing spec for ${id}` });
  }
  return errors;
}

if (import.meta.main) {
  const errors = await validateRecords();
  if (errors.length) {
    for (const error of errors) console.error(`${error.file}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log("Execution records are valid.");
  }
}
