import { useCallback, useEffect, useRef, useState } from "react";
import {
  AGENT_RUNTIME_URL,
  AgentClientError,
  cancelAgentRun,
  issueAgentSession,
  streamAgentMessage,
  type AgentSession,
  type AgentSource,
  type AgentStreamEvent,
} from "@/lib/agent/runtime";

export interface ProjectAgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  state: "streaming" | "complete" | "error";
  sources: AgentSource[];
}

export interface ProjectAgentApproval {
  summary: string;
  toolName: string;
  expiresAt: string;
  materialFields: Record<string, unknown>;
}

export interface ProjectAgentMemory {
  memoryId: string;
  category: string;
  sourceKind: string;
  state: string;
}

export interface ProjectAgentClient {
  runtimeUrl: string;
  issueSession: typeof issueAgentSession;
  streamMessage: typeof streamAgentMessage;
  cancelRun: typeof cancelAgentRun;
}

const defaultClient: ProjectAgentClient = {
  runtimeUrl: AGENT_RUNTIME_URL,
  issueSession: issueAgentSession,
  streamMessage: streamAgentMessage,
  cancelRun: cancelAgentRun,
};

export function useProjectAgent(projectId: string | null, client: ProjectAgentClient = defaultClient) {
  const [messages, setMessages] = useState<ProjectAgentMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "working" | "complete" | "error" | "cancelled">("idle");
  const [progress, setProgress] = useState("Ready when you are");
  const [profile, setProfile] = useState<AgentSession["agentProfile"] | null>(null);
  const [error, setError] = useState<AgentClientError | null>(null);
  const [approval, setApproval] = useState<ProjectAgentApproval | null>(null);
  const [memories, setMemories] = useState<ProjectAgentMemory[]>([]);
  const conversationId = useRef(crypto.randomUUID());
  const active = useRef<{
    controller: AbortController;
    sessionToken?: string;
    runId?: string;
    correlationId: string;
  } | null>(null);

  const applyEvent = useCallback((assistantMessageId: string, event: AgentStreamEvent) => {
    switch (event.type) {
      case "run.started":
        setStatus("working");
        setProgress("Understanding your request");
        break;
      case "tool.requested":
        setProgress(event.request.name === "project.tasks.list" ? "Checking this project's task list" : "Checking Proj OS records");
        break;
      case "tool.result":
        setProgress(event.result.status === "succeeded" ? "Project records checked" : "Proj OS could not complete that check");
        break;
      case "message.delta":
        setMessages((current) => current.map((message) => message.id === assistantMessageId
          ? { ...message, content: message.content + event.delta }
          : message));
        break;
      case "message.completed":
        setMessages((current) => current.map((message) => message.id === assistantMessageId
          ? { ...message, content: event.content, sources: event.sources, state: "complete" }
          : message));
        break;
      case "tool.approval_required":
        setApproval({
          summary: event.preview.summary,
          toolName: event.preview.toolName,
          expiresAt: event.preview.expiresAt,
          materialFields: event.preview.materialFields,
        });
        setProgress("Waiting for your review");
        break;
      case "memory.provenance":
        setMemories(event.memories.map((memory) => ({
          memoryId: memory.memoryId,
          category: memory.category,
          sourceKind: memory.sourceKind,
          state: memory.state,
        })));
        break;
      case "error": {
        const nextError = AgentClientError.fromRuntime(event.error);
        setError(nextError);
        setStatus("error");
        setProgress("Needs attention");
        setMessages((current) => current.map((message) => message.id === assistantMessageId
          ? { ...message, content: nextError.message, state: "error" }
          : message));
        break;
      }
      case "run.cancelled":
        setStatus("cancelled");
        setProgress("Stopped");
        setMessages((current) => current.map((message) => message.id === assistantMessageId && !message.content
          ? { ...message, content: "Stopped at your request.", state: "complete" }
          : message));
        break;
      case "run.completed":
        if (event.status === "succeeded") {
          setStatus("complete");
          setProgress("Done");
        } else {
          setStatus("error");
          setProgress("Needs attention");
        }
        break;
      case "usage":
        break;
    }
  }, []);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || !projectId || active.current) return;

    const userMessage: ProjectAgentMessage = {
      id: crypto.randomUUID(), role: "user", content: text, state: "complete", sources: [],
    };
    const assistantMessage: ProjectAgentMessage = {
      id: crypto.randomUUID(), role: "agent", content: "", state: "streaming", sources: [],
    };
    const correlationId = crypto.randomUUID();
    const controller = new AbortController();
    active.current = { controller, correlationId };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setError(null);
    setApproval(null);
    setStatus("connecting");
    setProgress("Checking your Proj OS access");

    try {
      const session = await client.issueSession(projectId);
      if (controller.signal.aborted) return;
      active.current = { ...active.current!, sessionToken: session.sessionToken };
      setProfile(session.agentProfile);
      setProgress("Opening a secure Agent session");
      await client.streamMessage({
        runtimeUrl: client.runtimeUrl,
        sessionToken: session.sessionToken,
        conversationId: conversationId.current,
        messageId: userMessage.id,
        correlationId,
        content: text,
        signal: controller.signal,
        onRunId: (runId) => { if (active.current) active.current.runId = runId; },
        onEvent: (event) => applyEvent(assistantMessage.id, event),
      });
    } catch (caught) {
      if (controller.signal.aborted) {
        setStatus("cancelled");
        setProgress("Stopped");
        return;
      }
      const nextError = caught instanceof AgentClientError
        ? caught
        : new AgentClientError("RUNTIME_UNAVAILABLE", "The Agent is temporarily unavailable.", true, correlationId);
      setError(nextError);
      setStatus("error");
      setProgress("Needs attention");
      setMessages((current) => current.map((message) => message.id === assistantMessage.id
        ? { ...message, content: nextError.message, state: "error" }
        : message));
    } finally {
      active.current = null;
    }
  }, [applyEvent, client, projectId]);

  const cancel = useCallback(() => {
    const run = active.current;
    if (!run) return;
    run.controller.abort();
    setStatus("cancelled");
    setProgress("Stopping safely");
    if (run.sessionToken && run.runId) {
      void client.cancelRun({
        runtimeUrl: client.runtimeUrl,
        sessionToken: run.sessionToken,
        runId: run.runId,
        correlationId: run.correlationId,
      });
    }
  }, [client]);

  const reset = useCallback(() => {
    active.current?.controller.abort();
    active.current = null;
    conversationId.current = crypto.randomUUID();
    setMessages([]);
    setStatus("idle");
    setProgress("Ready when you are");
    setError(null);
    setApproval(null);
    setMemories([]);
  }, []);

  useEffect(() => {
    reset();
  }, [projectId, reset]);

  return {
    messages,
    status,
    progress,
    profile,
    error,
    approval,
    memories,
    isBusy: status === "connecting" || status === "working",
    isConfigured: Boolean(client.runtimeUrl),
    send,
    cancel,
    reset,
  };
}
