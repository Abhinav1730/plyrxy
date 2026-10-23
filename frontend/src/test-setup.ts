import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// jsdom has no layout engine. Give chart containers real test dimensions;
// browser verification covers responsive geometry separately.
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  value() {
    return {
      width: 1000,
      height: 340,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 340,
      x: 0,
      y: 0,
      toJSON() {},
    };
  },
});
