import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssistantEnabled } from "../useAssistantEnabled";

describe("useAssistantEnabled", () => {
  beforeEach(() => { localStorage.clear(); });

  it("defaults to false and persists when toggled", () => {
    const { result } = renderHook(() => useAssistantEnabled());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("buildos-assistant-enabled")).toBe("1");

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem("buildos-assistant-enabled")).toBe("0");
  });

  it("reads an existing enabled preference on mount", () => {
    localStorage.setItem("buildos-assistant-enabled", "1");
    const { result } = renderHook(() => useAssistantEnabled());
    expect(result.current[0]).toBe(true);
  });
});
