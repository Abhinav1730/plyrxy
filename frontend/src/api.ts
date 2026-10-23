import { useEffect, useState } from "react";
import type { components } from "./api-schema";

export type DayReport = components["schemas"]["DayReport"];
export type MonthReport = components["schemas"]["MonthReport"];
export type Metrics = components["schemas"]["Metrics"];
export type Point = components["schemas"]["Point"];
export type Meta = {
  snapshot_id: string;
  manifest: Record<string, string | number | number[]>;
};

export function useResource<T>(path: string, attempt = 0) {
  const [state, setState] = useState<{
    path: string;
    attempt: number;
    data?: T;
    error?: string;
  }>({ path: "", attempt: -1 });
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    fetch(`/api/v1/${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : `Request failed (${response.status}). Check the selected filters.`,
          );
        }
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (current) setState({ path, attempt, data });
      })
      .catch((error) => {
        if (current && !controller.signal.aborted)
          setState({
            path,
            attempt,
            error:
              error instanceof Error ? error.message : "Unable to load data",
          });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [path, attempt]);
  const fresh = state.path === path && state.attempt === attempt;
  return {
    data: fresh ? state.data : undefined,
    error: fresh ? state.error : undefined,
    loading: !fresh,
  };
}

export const formatNumber = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
export const signed = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${formatNumber(value)}`;
export const hour = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
export const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
export const nextDate = (value: string) =>
  new Date(new Date(`${value}T12:00:00Z`).getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);
