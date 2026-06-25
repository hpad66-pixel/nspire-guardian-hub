import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssistantEnabled } from "../useAssistantEnabled";

describe("useAssistantEnabled", () => {
  beforeEach(() => { localStorage.clear(); });

  it("defaults to ON (visible) and persists when toggled", () => {
    const { result } = renderHook(() => useAssistantEnabled());
    // Default ON: with no stored preference, the assistant is visible to everyone.
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem("buildos-assistant-enabled")).toBe("0");

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("buildos-assistant-enabled")).toBe("1");
  });

  it("only an explicit opt-out ('0') disables it", () => {
    localStorage.setItem("buildos-assistant-enabled", "0");
    const { result } = renderHook(() => useAssistantEnabled());
    expect(result.current[0]).toBe(false);
  });

  it("reads an existing enabled preference on mount", () => {
    localStorage.setItem("buildos-assistant-enabled", "1");
    const { result } = renderHook(() => useAssistantEnabled());
    expect(result.current[0]).toBe(true);
  });
});
