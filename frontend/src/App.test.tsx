import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./Dashboard";

// Layout-heavy charts are verified in the real browser. These component tests
// exercise filter state, fetching, navigation and data tables without a fake
// jsdom layout engine performing thousands of SVG measurements per edit.
vi.mock("./components", async (importOriginal) => {
  const original = await importOriginal<typeof import("./components")>();
  return {
    ...original,
    GenerationCharts: () => <div aria-label="Generation charts" />,
  };
});

const baseMetrics = {
  expected: 24,
  matched: 24,
  coverage_percent: 100,
  forecast_average_mw: 8240,
  mae_mw: 612,
  rmse_mw: 700,
  bias_mw: 280,
  wape_percent: 7.1,
  overforecast_percent: 60,
  underforecast_percent: 40,
};
const day = {
  decision_date: "2026-01-14",
  delivery_date: "2026-01-15",
  cutoff: "2026-01-14T10:00:00Z",
  snapshot_id: "test",
  comparison: "timestamp-matched",
  expected_actual_half_hours: 48,
  available_actual_half_hours: 48,
  forecast_available: 24,
  publication_times: ["2026-01-14T09:30:00Z"],
  latest_publication: "2026-01-14T09:30:00Z",
  oldest_publication: "2026-01-14T09:30:00Z",
  stale_forecast_count: 0,
  metrics: baseMetrics,
  sensitivity: baseMetrics,
  points: Array.from({ length: 24 }, (_, i) => ({
    start_time: `2026-01-15T${String(i).padStart(2, "0")}:00:00Z`,
    forecast_mw: 8240,
    actual_mw: 8000,
    error_mw: 240,
    publish_time: "2026-01-14T09:30:00Z",
    actual_publish_time: "2026-01-15T00:30:00Z",
    hour_mean_actual_mw: 8100,
    status: "matched",
  })),
};

describe("core workflow", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/dashboard");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => ({
        ok: true,
        json: async () =>
          input.includes("accuracy")
            ? {
                metrics: baseMetrics,
                sensitivity: baseMetrics,
                days: [
                  {
                    decision_date: day.decision_date,
                    delivery_date: day.delivery_date,
                    metrics: baseMetrics,
                  },
                ],
              }
            : input.includes("meta")
              ? { snapshot_id: "test", manifest: {} }
              : day,
      })),
    );
  });

  it("loads real response, updates delivery date and requests selected filters", async () => {
    render(<App />);
    expect(
      await within(
        await screen.findByRole("complementary", { name: "Decision snapshot" }),
      ).findByText("8,240"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Decision date"), {
      target: { value: "2026-01-31" },
    });
    expect(screen.getByLabelText("Delivery date")).toHaveValue("01 Feb 2026");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("decision_date=2026-01-31"),
        expect.anything(),
      ),
    );
    fireEvent.change(screen.getByLabelText("Decision cutoff"), {
      target: { value: "12:00" },
    });
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("cutoff=12%3A00"),
        expect.anything(),
      ),
    );
  });

  it("navigates accuracy and methodology and paginates table", async () => {
    render(<App />);
    await within(
      await screen.findByRole("complementary", { name: "Decision snapshot" }),
    ).findByText("8,240");
    fireEvent.click(screen.getByRole("button", { name: "Next hours" }));
    expect(screen.getByText("Hours 5–8 of 24")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Accuracy" }));
    expect(
      await screen.findByRole("heading", { name: "Forecast accuracy" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Methodology" }));
    expect(
      await screen.findByRole("heading", { name: "How the replay works" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not an official market deadline/i),
    ).toBeInTheDocument();
  });

  it("shows recoverable network errors without substituting fake data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network unavailable")),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("8,240")).not.toBeInTheDocument();
  });

  it("handles native input events after browser autofill changes a date", async () => {
    render(<App />);
    await screen.findByRole("complementary", { name: "Decision snapshot" });
    const input = screen.getByLabelText("Decision date") as HTMLInputElement;
    act(() => {
      input.value = "2026-01-31";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(screen.getByLabelText("Delivery date")).toHaveValue("01 Feb 2026");
  });

  it("keeps the share URL aligned with tabs and filters and restores it on refresh", async () => {
    const view = render(<App />);
    await screen.findByRole("complementary", { name: "Decision snapshot" });
    fireEvent.click(screen.getByRole("tab", { name: "Accuracy" }));
    expect(new URLSearchParams(window.location.search).get("view")).toBe(
      "accuracy",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Methodology" }));
    expect(new URLSearchParams(window.location.search).get("view")).toBe(
      "methodology",
    );
    fireEvent.change(screen.getByLabelText("Decision date"), {
      target: { value: "2026-01-31" },
    });
    fireEvent.change(screen.getByLabelText("Decision cutoff"), {
      target: { value: "12:00" },
    });
    expect(
      new URLSearchParams(window.location.search).get("decision_date"),
    ).toBe("2026-01-31");
    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "How the replay works" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Decision date")).toHaveValue("2026-01-31");
    expect(screen.getByLabelText("Decision cutoff")).toHaveValue("12:00");
  });
});
