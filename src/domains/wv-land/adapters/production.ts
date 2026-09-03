import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import type { ProductionRecord, SourceSnapshot, WvProductionEvidence } from "../contracts";
import type { RetrievalSnapshot, SourceRetrievalProvider } from "../../../retrieval/source";
import { SourceAdapterError, type SourceAdapter, type SourceAdapterQuery } from "./source-adapter";

const execFileAsync = promisify(execFile);

export interface WorkbookRow {
  readonly [header: string]: string | number | undefined;
}

export interface WorkbookReader {
  read(bytes: Uint8Array): Promise<readonly WorkbookRow[]>;
}

/** Reads the fixed XML layout used by the captured WVDEP annual workbook. */
export class WvdepAnnualWorkbookReader implements WorkbookReader {
  async read(bytes: Uint8Array): Promise<readonly WorkbookRow[]> {
    const directory = await mkdtemp(`${tmpdir()}/business-agent-xlsx-`);
    const path = `${directory}/source.xlsx`;
    try {
      await writeFile(path, bytes);
      const [sharedStrings, worksheet] = await Promise.all([
        this.unzip(path, "xl/sharedStrings.xml"),
        this.unzip(path, "xl/worksheets/sheet1.xml"),
      ]);
      return parseWorksheet(worksheet, sharedStrings);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async unzip(path: string, entry: string): Promise<string> {
    try {
      const result = await execFileAsync("unzip", ["-p", path, entry], { maxBuffer: 200_000_000 });
      return result.stdout;
    } catch (error) {
      throw new Error(`Unable to read XLSX entry ${entry}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const WVDEP_ANNUAL_PRODUCTION_SOURCE = {
  id: "wvdep-annual-production",
  publisher: "WVDEP",
  dataset: "Annual oil and gas production workbook",
  mechanism: "xlsx-download",
  datasetVersion: "2025Production.xlsx",
  authorityScope: "operator-reported annual production",
} as const;

export class WvdepProductionSourceAdapter implements SourceAdapter<ProductionRecord> {
  constructor(
    private readonly retrieval: SourceRetrievalProvider,
    private readonly reader: WorkbookReader = new WvdepAnnualWorkbookReader(),
    private readonly workbookUrl = "https://apps.dep.wv.gov/Documents/OOG/ProductionReports/2020-2029/2025Production.xlsx",
  ) {}

  async query(query: SourceAdapterQuery): Promise<readonly WvProductionEvidence[]> {
    if (query.apiNumber === undefined) throw new SourceAdapterError("request", "An API number is required for production lookup", this.source.id);
    const requestUrl = this.requestUrl(query);
    const retrieved = await this.retrieval.retrieve(requestUrl, this.source);
    let rows: readonly WorkbookRow[];
    try { rows = await this.reader.read(retrieved.bytes); } catch (error) { throw new SourceAdapterError("parse", error instanceof Error ? error.message : String(error), this.source.id); }
    if (rows.length === 0) throw new SourceAdapterError("schema", "Workbook has no data rows", this.source.id);
    const apiNumber = canonicalApi(query.apiNumber);
    if (apiNumber === undefined) throw new SourceAdapterError("request", "API number must contain exactly 10 digits", this.source.id);
    const matches = rows.filter((row) => canonicalApi(row.API) === apiNumber);
    return matches.map((row, index) => this.normalize(row, this.toSnapshot(retrieved.snapshot), requestUrl, index));
  }

  private get source() { return WVDEP_ANNUAL_PRODUCTION_SOURCE; }

  private toSnapshot(snapshot: RetrievalSnapshot): SourceSnapshot { return { ...snapshot, source: this.source }; }

  private requestUrl(query: SourceAdapterQuery): string {
    if (query.apiNumber === undefined) throw new SourceAdapterError("request", "An API number is required", this.source.id);
    // The URL is supplied by the caller's static fixture or live source configuration.
    return this.workbookUrl;
  }

  private normalize(row: WorkbookRow, snapshot: SourceSnapshot, requestUrl: string, index: number): WvProductionEvidence {
    const apiNumber = canonicalApi(row.API ?? row.Api ?? row.api);
    if (apiNumber === undefined) throw new SourceAdapterError("schema", "Matching production row has no API", this.source.id);
    const year = integer(row.Year ?? row.year ?? row.Reporting_Year ?? row.reporting_year);
    if (year === undefined) throw new SourceAdapterError("schema", "Production row has no reporting year", this.source.id);
    const facts: ProductionRecord = {
      productionRecordId: `${year}:${apiNumber}:row-${index + 2}`,
      apiNumber,
      period: { year },
      ...optionalNumber("gasMcf", total(row, "Gas", "gas", "MCF")),
      ...optionalNumber("oilBarrels", total(row, "Oil", "oil", "Barrels")),
      ...optionalNumber("condensateBarrels", total(row, "Condensate", "condensate")),
      ...optionalNumber("waterBarrels", total(row, "Water", "water")),
      ...optionalString("operator", row.Operator ?? row.operator),
      evidenceId: `evidence-${this.source.id}-${year}-${apiNumber}-row-${index + 2}`,
    };
    return { evidenceId: facts.evidenceId, snapshotId: snapshot.snapshotId, source: snapshot.source, sourceRecordId: facts.productionRecordId, sourceUrl: requestUrl, retrievedAt: snapshot.retrievedAt, ...(snapshot.effectiveDate === undefined ? {} : { effectiveDate: snapshot.effectiveDate }), ...(snapshot.publicationDate === undefined ? {} : { publicationDate: snapshot.publicationDate }), contentHash: snapshot.contentHash, rawSnapshotRef: snapshot.rawSnapshotRef, normalizedFacts: facts, warnings: [] };
  }
}

function parseWorksheet(worksheet: string, sharedStrings: string): WorkbookRow[] {
  if (!worksheet.includes("<worksheet") || !worksheet.includes("</worksheet>")) throw new Error("Worksheet XML is malformed");
  if (!sharedStrings.includes("<sst") || !sharedStrings.includes("</sst>")) throw new Error("Shared strings XML is malformed");
  const strings = [...sharedStrings.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => decodeXml(match[1].replace(/<[^>]+>/g, "")));
  const rows = [...worksheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  if (rows.length < 1) throw new Error("Worksheet has no rows");
  const readRow = (xml: string): Map<string, string | number> => {
    const values = new Map<string, string | number>();
    for (const match of xml.matchAll(/<c\s+([^>]+)>([\s\S]*?)<\/c>/g)) {
      const reference = /\br="([A-Z]+)\d+"/.exec(match[1])?.[1];
      if (reference === undefined) continue;
      if (/\bt="inlineStr"/.test(match[1])) throw new Error("Inline string cells are not supported by the captured annual workbook parser");
      const raw = /<v>([\s\S]*?)<\/v>/.exec(match[2])?.[1];
      if (raw === undefined) continue;
      const value = /\bt="s"/.test(match[1]) ? strings[Number(raw)] : Number(raw);
      if (value === undefined) throw new Error("Worksheet references a missing shared string");
      if (value !== undefined && !(typeof value === "number" && Number.isNaN(value))) values.set(reference, value);
    }
    return values;
  };
  const headerCells = readRow(rows[0][1]);
  const headers = new Map<string, string>();
  for (const [column, value] of headerCells) headers.set(column, String(value).trim());
  for (const header of ["Year", "API", "Operator", "Total_Gas", "Total_Oil", "Total_Water"]) if (![...headers.values()].includes(header)) throw new Error(`Annual workbook is missing required header ${header}`);
  return rows.slice(1).map((row) => {
    const values = readRow(row[1]);
    const result: Record<string, string | number | undefined> = {};
    for (const [column, value] of values) { const header = headers.get(column); if (header !== undefined) result[header] = value; }
    return result;
  });
}

function canonicalApi(value: unknown): string | undefined { if (value === undefined || value === null || String(value).trim() === "") return undefined; const digits = String(value).replace(/\D/g, ""); return digits.length === 10 ? digits : undefined; }
function integer(value: unknown): number | undefined { const number = typeof value === "number" ? value : Number(value); return Number.isInteger(number) && number > 0 ? number : undefined; }
function total(row: WorkbookRow, ...terms: string[]): number | undefined { const key = Object.keys(row).find((candidate) => { const lower = candidate.toLowerCase(); return terms.some((term) => lower === `total_${term.toLowerCase()}` || lower === term.toLowerCase()) || (terms.includes("MCF") && lower === "total_gas"); }); return key === undefined ? undefined : numberValue(row[key]); }
function numberValue(value: unknown): number | undefined { if (value === undefined || value === null || value === "") return undefined; const number = typeof value === "number" ? value : Number(String(value).replaceAll(",", "")); return Number.isFinite(number) ? number : undefined; }
function optionalNumber<K extends keyof ProductionRecord>(key: K, value: number | undefined): Partial<Pick<ProductionRecord, K>> { return value === undefined ? {} : { [key]: value } as Pick<ProductionRecord, K>; }
function optionalString<K extends keyof ProductionRecord>(key: K, value: unknown): Partial<Pick<ProductionRecord, K>> { const text = value === undefined || value === null ? undefined : String(value).trim(); return text ? { [key]: text } as Pick<ProductionRecord, K> : {}; }
function decodeXml(value: string): string { return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&#39;", "'").trim(); }
