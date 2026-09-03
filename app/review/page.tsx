"use client";

import { useState } from "react";

export default function ReviewPage() {
  const [runId, setRunId] = useState("");
  const [message, setMessage] = useState("");
  async function decide(status: "approved" | "rejected") {
    const response = await fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId, status }) });
    const body = await response.json() as { error?: string };
    setMessage(response.ok ? `Run ${runId} marked ${status}.` : body.error ?? "Review failed.");
  }
  return <main><h1>Local review console</h1><p>Enter a completed run ID. This console only changes review status; it does not issue payments, file documents, or contact owners.</p><label>Run ID <input value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="run-..." /></label><p><button disabled={!runId} onClick={() => decide("approved")}>Approve</button>{" "}<button disabled={!runId} onClick={() => decide("rejected")}>Reject</button></p><p role="status">{message}</p><p><a href="/">Back</a></p></main>;
}
