# AI fundamentals in Business Agent

Business Agent is organized around a small set of durable concepts.

**Agent.** A bounded responsibility with instructions, inputs, outputs, and
permitted tools.

**Skill.** Reusable procedural guidance in `SKILL.md`. Skills explain how to
perform a task and what boundaries apply. They do not execute code by
themselves.

**Tool.** Typed executable code that reads data, applies a deterministic rule,
or performs an approved action.

**Flow.** A declared sequence and dependency graph for agent work. It defines
failure handling, conflict preservation, and the human-review boundary.

**MCP.** A transport and discovery protocol for exposing selected tools to an
agent. MCP does not replace authorization or tool validation.

**Evaluation.** A versioned test set and rubric for groundedness, tool use,
uncertainty, escalation, safety, latency, and cost.

The land-administration domain demonstrates these concepts without making
legal determinations or taking external side effects.
