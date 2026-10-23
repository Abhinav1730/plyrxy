import { useEffect, useState, type KeyboardEvent } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import Brand from "./Brand";
import type { DayReport } from "./api";
import { nextDate, shortDate, useResource } from "./api";
import {
  CoverageNotice,
  GenerationCharts,
  HourlyTable,
  SnapshotPanel,
} from "./components";
import { AccuracyView, LoadState, MethodologyView } from "./views";

type Tab = "Decision replay" | "Accuracy" | "Methodology";
const tabs: Tab[] = ["Decision replay", "Accuracy", "Methodology"];
const validDecision = /^2026-01-(0[1-9]|[12]\d|3[01])$/;
const validCutoff = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export default function Dashboard() {
  const search = new URLSearchParams(window.location.search);
  const requestedView = search.get("view");
  const [tab, setTab] = useState<Tab>(
    requestedView === "accuracy"
      ? "Accuracy"
      : requestedView === "methodology"
        ? "Methodology"
        : "Decision replay",
  );
  const [decision, setDecision] = useState(() => {
    const value = search.get("decision_date") ?? "";
    return validDecision.test(value) ? value : "2026-01-14";
  });
  const [cutoff, setCutoff] = useState(() => {
    const value = search.get("cutoff") ?? "";
    return validCutoff.test(value) ? value : "10:00";
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    const values = {
      view: tab === "Decision replay" ? null : tab.toLowerCase(),
      decision_date: decision === "2026-01-14" ? null : decision,
      cutoff: cutoff === "10:00" ? null : cutoff,
    };
    for (const [name, value] of Object.entries(values)) {
      if (value === null) url.searchParams.delete(name);
      else url.searchParams.set(name, value);
    }
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [tab, decision, cutoff]);
  const [attempt, setAttempt] = useState(0);
  const params = new URLSearchParams({ decision_date: decision, cutoff });
  const { data: report, error } = useResource<DayReport>(
    `day?${params}`,
    attempt,
  );
  const changeDecision = (value: string) => {
    if (validDecision.test(value)) setDecision(value);
  };
  const changeCutoff = (value: string) => {
    if (validCutoff.test(value)) setCutoff(value);
  };
  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setTab(tabs[next]);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <header className="topbar">
        <Brand />
        <a className="workspace-home" href="/">
          Home
        </a>
        <nav className="tabs" role="tablist" aria-label="Workspace views">
          {tabs.map((item, index) => (
            <button
              role="tab"
              id={`tab-${index}`}
              key={item}
              aria-selected={tab === item}
              aria-controls="workspace"
              tabIndex={tab === item ? 0 : -1}
              onClick={() => setTab(item)}
              onKeyDown={(event) => tabKeys(event, index)}
            >
              {item}
            </button>
          ))}
        </nav>
        <span className="pilot-label">Historical pilot</span>
      </header>
      <div className="toolbar">
        <div className="filters">
          <label className="filter">
            <span>Decision</span>
            <div className="input-wrap">
              <CalendarBlankIcon size={18} />
              <input
                type="date"
                aria-label="Decision date"
                value={decision}
                min="2026-01-01"
                max="2026-01-31"
                onChange={(event) => changeDecision(event.target.value)}
                onInput={(event) => changeDecision(event.currentTarget.value)}
              />
            </div>
          </label>
          <label className="filter delivery-filter">
            <span>Delivery</span>
            <div className="input-wrap">
              <CalendarBlankIcon size={18} />
              <input
                aria-label="Delivery date"
                value={shortDate(nextDate(decision))}
                readOnly
              />
            </div>
          </label>
          <label className="filter">
            <span>Cutoff</span>
            <div className="input-wrap cutoff-input">
              <input
                type="time"
                aria-label="Decision cutoff"
                value={cutoff}
                onChange={(event) => changeCutoff(event.target.value)}
                onInput={(event) => changeCutoff(event.currentTarget.value)}
              />
              <span>GMT</span>
            </div>
          </label>
        </div>
        <a
          className="button export-button"
          href={`/api/v1/export?${params}`}
          download
        >
          <DownloadSimpleIcon size={18} />
          Export CSV
        </a>
      </div>
      <div
        id="workspace"
        role="tabpanel"
        aria-labelledby={`tab-${tabs.indexOf(tab)}`}
        tabIndex={-1}
      >
        {tab === "Decision replay" ? (
          !report ? (
            <LoadState error={error} retry={() => setAttempt((x) => x + 1)} />
          ) : (
            <main className="page replay-page">
              <div className="replay-grid">
                <section className="review">
                  <div className="page-heading">
                    <h1>Day-ahead forecast review</h1>
                    <span className="heading-note">
                      Delivery {shortDate(report.delivery_date)}
                    </span>
                  </div>
                  <CoverageNotice report={report} />
                  <GenerationCharts points={report.points} />
                </section>
                <SnapshotPanel report={report} />
              </div>
              <HourlyTable
                key={`${decision}-${cutoff}`}
                points={report.points}
              />
            </main>
          )
        ) : tab === "Accuracy" ? (
          <AccuracyView
            cutoff={cutoff}
            onReplay={(day) => {
              setDecision(day);
              setTab("Decision replay");
            }}
          />
        ) : (
          <MethodologyView report={report} />
        )}
      </div>
      <footer className="footer">
        <span>Source: Elexon FUELHH + WINDFOR</span>
        <span>Hourly timestamps · matching half-hour actuals · GB wind</span>
      </footer>
    </>
  );
}
