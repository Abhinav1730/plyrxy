import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("homepage and workspace entry", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
  });

  it("introduces the real product with imagery and a clear workspace link without fetching analytics", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /tomorrow’s wind/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore the dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.getByRole("link", { name: "Explore accuracy" }),
    ).toHaveAttribute("href", "/dashboard?view=accuracy");
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("opens the analytical workspace directly and provides a way home", async () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<App />);
    expect(
      await screen.findByLabelText("Decision date", {}, { timeout: 15000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Home$/ })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
