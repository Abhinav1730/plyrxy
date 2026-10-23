import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResource } from "./api";

function Probe({ path, attempt = 0 }: { path: string; attempt?: number }) {
  const { data, error } = useResource<{ value: string }>(path, attempt);
  return <p>{error ?? data?.value ?? "loading"}</p>;
}

describe("resource consistency", () => {
  it("ignores an older response that arrives after a newer filter response", async () => {
    const pending: ((response: unknown) => void)[] = [];
    const requests: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: { signal: AbortSignal }) => {
        requests.push(options.signal);
        return new Promise((resolve) => pending.push(resolve));
      }),
    );
    const view = render(<Probe path="day?date=first" />);
    view.rerender(<Probe path="day?date=second" />);
    expect(requests[0].aborted).toBe(true);
    await act(async () =>
      pending[1]({ ok: true, json: async () => ({ value: "new report" }) }),
    );
    expect(screen.getByText("new report")).toBeInTheDocument();
    await act(async () =>
      pending[0]({ ok: true, json: async () => ({ value: "stale report" }) }),
    );
    expect(screen.getByText("new report")).toBeInTheDocument();
    expect(screen.queryByText("stale report")).not.toBeInTheDocument();
  });

  it("surfaces server errors and can retry the same resource", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ detail: "Snapshot unavailable" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ value: "recovered" }),
        }),
    );
    const view = render(<Probe path="day" />);
    expect(await screen.findByText("Snapshot unavailable")).toBeInTheDocument();
    view.rerender(<Probe path="day" attempt={1} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("recovered")).toBeInTheDocument();
  });

  it("does not show the previous report while a new filter is loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ value: "old filter" }),
        })
        .mockImplementationOnce(() => new Promise(() => {})),
    );
    const view = render(<Probe path="day?cutoff=10:00" />);
    await screen.findByText("old filter");
    view.rerender(<Probe path="day?cutoff=12:00" />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByText("old filter")).not.toBeInTheDocument();
  });
});
