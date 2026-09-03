# Prompt: verify and prepare Business Agent for review

```text
Use /poteto-mode to verify the current Business Agent repository and prepare a
reviewable release checkpoint.

Intent: a reviewer should be able to understand the domain model, run the
offline land-administration example, inspect persisted artifacts, and see what
is ready for Microsoft integration versus still pending.

Use /create-verification-skill if the repository lacks a project-local
verification skill. Use the real CLI or web surface, not only unit tests.
Exercise the happy path, missing input path, conflicting evidence path, and
human-review route. Capture commands, exit codes, output paths, and any useful
screenshots or transcripts.

Run typecheck, tests, build, and the documented quickstart. Inspect the final
diff for secrets, generated files, stale job-search language, and unsupported
claims about Azure or AI behavior. Do not broaden scope while fixing unrelated
issues. Return clean, changed, or blocked, with evidence and remaining risks.
```
