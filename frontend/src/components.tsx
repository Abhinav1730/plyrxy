import { useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayReport, Metrics, Point } from "./api";
import { formatNumber as n, hour, shortDate, signed } from "./api";

const BLUE = "#246bfe";
const SLATE = "#475569";
const AMBER = "#e38d38";
const chartMargin = { top: 10, right: 14, bottom: 0, left: 5 };

export function Metric({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit"> {unit}</span>}
      </div>
      {note && <p className="metric-note">{note}</p>}
    </div>
  );
}

export function GenerationCharts({ points }: { points: Point[] }) {
  const rows = points.map((p) => ({ ...p, label: hour(p.start_time) }));
  return (
    <div className="charts">
      <div className="chart-caption">
        <span>Wind generation (MW)</span>
        <div className="legend">
          <span>
            <i className="key forecast" />
            Forecast (WINDFOR)
          </span>
          <span>
            <i className="key actual" />
            Actual (FUELHH)
          </span>
        </div>
      </div>
      <div
        className="generation-chart"
        role="img"
        aria-label="Hourly wind forecast and timestamp-matched actual generation in megawatts. Exact values are in the table below."
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 900, height: 340 }}
        >
          <LineChart data={rows} margin={chartMargin} accessibilityLayer>
            <CartesianGrid stroke="#e2e7ef" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#b8c3d2" }}
              tick={{ fill: SLATE, fontSize: 11 }}
              minTickGap={14}
              height={32}
            />
            <YAxis
              tickFormatter={(v) => n(Number(v))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: SLATE, fontSize: 12 }}
              width={64}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #dce3ec",
                borderRadius: 6,
                fontSize: 13,
              }}
              formatter={(v, name) => [
                `${n(Number(v))} MW`,
                name === "forecast_mw"
                  ? "Forecast"
                  : "Actual (matching half-hour)",
              ]}
              labelFormatter={(label) => `Delivery ${label} GMT`}
            />
            <Line
              name="forecast_mw"
              dataKey="forecast_mw"
              stroke={BLUE}
              strokeWidth={2.3}
              dot={{ r: 3.4, fill: BLUE, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              name="actual_mw"
              dataKey="actual_mw"
              stroke={SLATE}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3.1, fill: SLATE, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="error-caption">
        Error (MW)<span>Forecast − Actual</span>
      </div>
      <div
        className="error-chart"
        role="img"
        aria-label="Signed forecast error. Positive blue bars mean wind was overforecast; negative amber bars mean underforecast."
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 900, height: 130 }}
        >
          <BarChart data={rows} margin={chartMargin} accessibilityLayer>
            <CartesianGrid stroke="#e2e7ef" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#b8c3d2" }}
              tick={{ fill: SLATE, fontSize: 11 }}
              minTickGap={14}
              height={30}
            />
            <YAxis
              tickFormatter={(v) => n(Number(v))}
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: SLATE, fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="#9baac0" />
            <Tooltip
              formatter={(v) => [
                `${signed(Number(v))} MW`,
                "Forecast − Actual",
              ]}
              contentStyle={{
                border: "1px solid #dce3ec",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <Bar dataKey="error_mw" maxBarSize={26} isAnimationActive={false}>
              {rows.map((p) => (
                <Cell
                  key={p.start_time}
                  fill={(p.error_mw ?? 0) >= 0 ? BLUE : AMBER}
                  fillOpacity={0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SnapshotPanel({ report }: { report: DayReport }) {
  const age = report.latest_publication
    ? Math.round(
        (new Date(report.cutoff).getTime() -
          new Date(report.latest_publication).getTime()) /
          60_000,
      )
    : null;
  const publicationLabel =
    report.publication_times.length > 1
      ? "Latest selected publication"
      : "Publication time";
  return (
    <aside className="snapshot" aria-label="Decision snapshot">
      <h2>Decision snapshot</h2>
      <Metric
        label={publicationLabel}
        value={
          report.latest_publication ? hour(report.latest_publication) : "—"
        }
        unit={report.latest_publication ? "GMT" : ""}
        note={
          age == null
            ? "No eligible forecast before cutoff"
            : `Published ${age < 60 ? `${age} min` : `${n(age / 60, 1)} hours`} before cutoff`
        }
      />
      {report.publication_times.length > 1 && (
        <p className="publication-note">
          {report.publication_times.length} publications selected. Inspect each
          row for provenance.
        </p>
      )}
      <Metric
        label="Forecast average"
        value={n(report.metrics.forecast_average_mw)}
        unit="MW"
      />
      <Metric label="MAE" value={n(report.metrics.mae_mw)} unit="MW" />
      <Metric label="Bias" value={signed(report.metrics.bias_mw)} unit="MW" />
      <Metric
        label="Matched timestamps"
        value={`${report.metrics.matched} / ${report.metrics.expected}`}
      />
      <p className="snapshot-footnote">Actuals shown retrospectively.</p>
    </aside>
  );
}

export function HourlyTable({ points }: { points: Point[] }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const pageSize = 4;
  const visible = points.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <section className="interval-section" aria-labelledby="hourly-title">
      <div className="section-heading">
        <h2 id="hourly-title">
          Hourly values <span>(MW)</span>
        </h2>
        <span className="muted tiny">Select a timestamp to highlight</span>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Forecast and matching half-hour actual generation, with publication
            provenance
          </caption>
          <thead>
            <tr>
              <th scope="col">Time (GMT)</th>
              <th scope="col">
                Forecast <span>(WINDFOR)</span>
              </th>
              <th scope="col">
                Actual <span>(FUELHH)</span>
              </th>
              <th scope="col">
                Error <span>(MW)</span>
              </th>
              <th scope="col">Forecast publication (GMT)</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.start_time}
                className={
                  (selected ?? points[0]?.start_time) === p.start_time
                    ? "selected-row"
                    : ""
                }
              >
                <th scope="row">
                  <button
                    className="time-button"
                    onClick={() => setSelected(p.start_time)}
                    aria-pressed={
                      (selected ?? points[0]?.start_time) === p.start_time
                    }
                  >
                    {hour(p.start_time)}
                  </button>
                </th>
                <td>{n(p.forecast_mw)}</td>
                <td>{n(p.actual_mw)}</td>
                <td>{signed(p.error_mw)}</td>
                <td>
                  {p.publish_time ? (
                    `${shortDate(p.publish_time)} ${hour(p.publish_time)}`
                  ) : (
                    <span className="missing">No eligible forecast</span>
                  )}
                  {p.status !== "matched" && (
                    <span className="sr-only">
                      {" "}
                      · {p.status.replaceAll("_", " ")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <span>
          Hours {page * pageSize + 1}–
          {Math.min((page + 1) * pageSize, points.length)} of {points.length}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous hours"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ArrowLeftIcon size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Next hours"
            disabled={(page + 1) * pageSize >= points.length}
            onClick={() => setPage((p) => p + 1)}
          >
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function CoverageNotice({ report }: { report: DayReport }) {
  if (
    report.metrics.matched === report.metrics.expected &&
    !report.stale_forecast_count
  )
    return null;
  return (
    <div className="notice" role="status">
      <InfoIcon size={18} />
      <span>
        {report.metrics.matched} of {report.metrics.expected} timestamps
        matched. Missing values are excluded from accuracy metrics.
        {report.stale_forecast_count > 0
          ? ` ${report.stale_forecast_count} selected publications are more than 24 hours old.`
          : ""}
      </span>
    </div>
  );
}

export function MetricsStrip({ metrics }: { metrics: Metrics }) {
  return (
    <div className="metrics-strip">
      <Metric label="Mean absolute error" value={n(metrics.mae_mw)} unit="MW" />
      <Metric
        label="Root mean square error"
        value={n(metrics.rmse_mw)}
        unit="MW"
      />
      <Metric label="Mean bias" value={signed(metrics.bias_mw)} unit="MW" />
      <Metric label="WAPE" value={n(metrics.wape_percent, 1)} unit="%" />
      <Metric
        label="Matched timestamps"
        value={`${metrics.matched} / ${metrics.expected}`}
      />
    </div>
  );
}
