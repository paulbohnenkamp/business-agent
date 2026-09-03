import { resolve } from "node:path";
import type { RuntimeConfig } from "./types";

export class ConfigurationError extends Error {}

export function loadConfig(environment: Readonly<Record<string, string | undefined>> = process.env): RuntimeConfig {
  const workspacePath = environment.BUSINESS_AGENT_WORKSPACE?.trim();
  if (!workspacePath) {
    throw new ConfigurationError("BUSINESS_AGENT_WORKSPACE is required");
  }

  return { workspacePath: resolve(workspacePath) };
}
