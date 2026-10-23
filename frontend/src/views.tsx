import { useState } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DatabaseIcon } from "@phosphor-icons/react/dist/csr/Database";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayReport, Meta, MonthReport } from "./api";
import { formatNumber as n, shortDate, signed, useResource } from "./api";
import { MetricsStrip } from "./components";

export function LoadState({
  error,
  retry,
}: {
  error?: string;
  retry: () => void;
}) {
  return error ? (
    <div className="load-state" role="alert">
      <InfoIcon size={24} />
      <h2>Unable to load this view</h2>
      <p>{error}</p>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </div>
  ) : (
    <div className="load-state" role="status">
      <span className="loading-indicator" />
      <p>Loading Elexon snapshot…</p>
    </div>
  );
}

export function AccuracyView({
  cutoff,
  onReplay,
}: {
  cutoff: string;
  onReplay: (day: string) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useResource<MonthReport>(
    `accuracy?${new URLSearchParams({ cutoff })}`,
    attempt,
  );
  if (!data)
    return <LoadState error={error} retry={() => setAttempt((x) => x + 1)} />;
  return (
    <main className="page accuracy-page">
      <div className="page-heading">
        <h1>Forecast accuracy</h1>
        <span className="heading-note">
          January decision cohort · {cutoff} GMT cutoff
        </span>
      </div>
      <p className="intro">
        Decisions from 1–31 January. Delivery from 2 January–1 February 2026.
        Each forecast was available before its decision cutoff.
      </p>
      <MetricsStrip metrics={data.metrics} />
      <section className="accuracy-chart-section">
        <div className="section-heading">
          <h2>Daily forecast error</h2>
          <span className="muted tiny">Mean absolute error · MW</span>
        </div>
        <div
          className="daily-chart"
          role="img"
          aria-label="Daily mean absolute forecast error in megawatts. Exact figures appear in the daily table."
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 1000, height: 280 }}
          >
            <BarChart
              data={data.days.map((d) => ({
                ...d,
                label: `${Number(d.decision_date.slice(-2))} Jan`,
                mae: d.metrics.mae_mw,
              }))}
              margin={{ left: 5, right: 10, top: 12 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="#e2e7ef"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#475569" }}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={(v) => n(Number(v))}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#475569" }}
                width={60}
              />
              <Tooltip
                formatter={(v) => [`${n(Number(v))} MW`, "MAE"]}
                labelFormatter={(l) => `Decision ${l}`}
              />
              <Bar
                dataKey="mae"
                fill="#246bfe"
                maxBarSize={28}
                isAnimationActive={false}
              >
                {data.days.map((d) => (
                  <Cell
                    key={d.decision_date}
                    fillOpacity={
                      d.metrics.coverage_percent === 100 ? 0.85 : 0.4
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="insight-strip">
        <InfoIcon size={20} />
        <p>
          <strong>
            {n(data.metrics.overforecast_percent, 1)}% of matched timestamps
            were overforecast.
          </strong>{" "}
          Positive bias means less wind was observed than forecast. This does
          not quantify the utility’s procurement need.
        </p>
      </div>
      <section>
        <div className="section-heading">
          <h2>Daily breakdown</h2>
          <span className="tiny muted">Open a day to inspect its forecast</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Decision date</th>
                <th scope="col">Delivery date</th>
                <th scope="col">MAE (MW)</th>
                <th scope="col">RMSE (MW)</th>
                <th scope="col">Bias (MW)</th>
                <th scope="col">WAPE</th>
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.decision_date}>
                  <th scope="row">
                    <button
                      className="text-link"
                      onClick={() => onReplay(d.decision_date)}
                    >
                      {shortDate(d.decision_date)}
                      <ArrowUpRightIcon size={13} />
                    </button>
                  </th>
                  <td>{shortDate(d.delivery_date)}</td>
                  <td>{n(d.metrics.mae_mw)}</td>
                  <td>{n(d.metrics.rmse_mw)}</td>
                  <td>{signed(d.metrics.bias_mw)}</td>
                  <td>{n(d.metrics.wape_percent, 1)}%</td>
                  <td>
                    {d.metrics.matched}/{d.metrics.expected}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export function MethodologyView({ report }: { report?: DayReport }) {
  const [attempt, setAttempt] = useState(0);
  const { data, error } = useResource<Meta>("meta", attempt);
  return (
    <main className="page methodology-page">
      <div className="page-heading">
        <h1>How the replay works</h1>
        <span className="heading-note">
          Transparent assumptions. Reproducible evidence.
        </span>
      </div>
      <div className="method-grid">
        <div>
          <section className="method-section">
            <span className="eyebrow">01 / Decision reconstruction</span>
            <h2>Only what was known at the cutoff</h2>
            <p>
              For each target on the next delivery day, select the latest
              WINDFOR publication at or before the decision cutoff. Later
              forecasts are excluded, even when they are more accurate.
              Selection happens independently for every target.
            </p>
            <p>
              The default is 10:00 Europe/London. This is a configurable pilot
              assumption, not an official market deadline. January is GMT;
              timestamps are stored and compared in UTC.
            </p>
            <div className="rule">
              Publication time ≤ decision cutoff → latest eligible forecast
            </div>
          </section>
          <section className="method-section">
            <span className="eyebrow">02 / Comparison resolution</span>
            <h2>Native forecasts. Explicit alignment.</h2>
            <p>
              WINDFOR has hourly target timestamps in this snapshot. FUELHH
              reports average MW over 30 minutes. The main report compares equal
              start timestamps: a 12:00 forecast is matched to the actual
              average for 12:00–12:30.
            </p>
            <p>
              This is a timestamp-matched diagnostic, not proof that the
              averaging periods are equivalent. No forecasts are interpolated.
              All 48 actual half-hours are retained, but only 24 timestamps per
              day enter the primary comparison.
            </p>
            <p>
              The sensitivity check below instead averages the two actual
              half-hours in each hour. It requires both observations and is a
              modelling assumption, not a verified interpretation of WINDFOR’s
              averaging period.
            </p>
            {report && (
              <div className="sensitivity">
                <h3>
                  Alignment sensitivity · {shortDate(report.delivery_date)}
                </h3>
                <div>
                  <span>Timestamp-matched MAE</span>
                  <strong>{n(report.metrics.mae_mw)} MW</strong>
                </div>
                <div>
                  <span>Hourly-mean actual MAE</span>
                  <strong>{n(report.sensitivity.mae_mw)} MW</strong>
                </div>
                <div>
                  <span>Hourly-mean matched</span>
                  <strong>
                    {report.sensitivity.matched}/{report.sensitivity.expected}
                  </strong>
                </div>
              </div>
            )}
          </section>
          <section className="method-section">
            <span className="eyebrow">03 / Error definitions</span>
            <h2>Measured in megawatts</h2>
            <p>
              Signed error = forecast − actual. A positive error is
              overforecasting: less wind was observed than forecast. Negative
              means underforecasting. Metrics use only matched, non-null pairs.
            </p>
            <dl className="definitions">
              <div>
                <dt>MAE</dt>
                <dd>Mean of |forecast − actual|. Typical absolute miss.</dd>
              </div>
              <div>
                <dt>RMSE</dt>
                <dd>
                  Square root of mean squared error. Emphasizes larger misses.
                </dd>
              </div>
              <div>
                <dt>Bias</dt>
                <dd>Mean signed error. Positive indicates overforecasting.</dd>
              </div>
              <div>
                <dt>WAPE</dt>
                <dd>
                  100 × total absolute error / total actual generation across
                  matched pairs. Undefined if the denominator is zero.
                </dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>
                  Matched valid timestamps / expected hourly targets. Missing
                  values never become zero generation.
                </dd>
              </div>
            </dl>
            <p>
              Monthly metrics are calculated from all matched timestamps, not
              averages of daily percentages. Forecast average uses every
              available selected forecast, including targets without an actual.
            </p>
          </section>
          <section className="method-section">
            <span className="eyebrow">04 / Scope and limitations</span>
            <h2>A historical wind pilot</h2>
            <p>
              Decision dates are 1–31 January 2026, corresponding to delivery on
              2 January–1 February.
            </p>
            <p>
              Elexon covers Great Britain; these datasets do not represent every
              UK renewable source or the utility’s own generation portfolio.
              Demand, other contracts and prices are not supplied, so no actual
              procurement volume or cost is calculated.
            </p>
            <p>
              Actuals are retrospective latest observations in the retrieved
              snapshot. Forecast publication time is used as the proxy for
              availability; historical API receipt latency cannot be
              reconstructed. Three days of publication lookback are included;
              any earlier unavailable forecasts remain gaps.
            </p>
            <p>
              Historical error summaries describe this sample. They are not
              calibrated prediction intervals, and full-month results include
              days after an individual replay decision.
            </p>
          </section>
        </div>
        <aside className="data-provenance">
          <DatabaseIcon size={25} />
          <h2>Data provenance</h2>
          {!data ? (
            <LoadState error={error} retry={() => setAttempt((x) => x + 1)} />
          ) : (
            <>
              <p className="verified">
                <CheckCircleIcon size={16} /> Integrity-checked snapshot
              </p>
              <dl>
                <div>
                  <dt>Snapshot</dt>
                  <dd className="mono">{data.snapshot_id}</dd>
                </div>
                <div>
                  <dt>Retrieved</dt>
                  <dd>
                    {typeof data.manifest.retrieved_at === "string"
                      ? new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/London",
                        }).format(new Date(data.manifest.retrieved_at)) + " UK"
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Forecast records</dt>
                  <dd>{n(Number(data.manifest.forecast_records ?? 0))}</dd>
                </div>
                <div>
                  <dt>Actual half-hours</dt>
                  <dd>{n(Number(data.manifest.actual_records ?? 0))}</dd>
                </div>
              </dl>
              <p>
                Fetched explicitly and packaged with the application. Browsing
                does not trigger external API calls.
              </p>
              <a
                href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
                target="_blank"
                rel="noreferrer"
              >
                WINDFOR documentation <ArrowUpRightIcon size={14} />
              </a>
              <a
                href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
                target="_blank"
                rel="noreferrer"
              >
                FUELHH documentation <ArrowUpRightIcon size={14} />
              </a>
              <a href="/docs" target="_blank" rel="noreferrer">
                Application API <ArrowUpRightIcon size={14} />
              </a>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
