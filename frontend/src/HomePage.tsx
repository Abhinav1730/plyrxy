import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { FingerprintIcon } from "@phosphor-icons/react/dist/csr/Fingerprint";
import Brand from "./Brand";
import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <a className="skip-link" href="#home-content">
        Skip to content
      </a>
      <header className="home-header">
        <Brand />
        <nav aria-label="Homepage navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#data-scope">Data & scope</a>
        </nav>
        <a className="home-button home-button-small" href="/dashboard">
          Dashboard
          <ArrowUpRightIcon size={16} aria-hidden="true" />
        </a>
      </header>
      <main id="home-content">
        <section
          className="home-hero home-container"
          aria-labelledby="home-title"
        >
          <div className="home-hero-copy">
            <h1 id="home-title">
              Tomorrow’s wind.<span>A clearer decision.</span>
            </h1>
            <p className="home-lead">
              Understand the wind forecast behind a day-ahead decision. See what
              was known, what actually happened, and how far the forecast
              missed.
            </p>
            <div className="home-actions">
              <a className="home-button" href="/dashboard">
                Explore the dashboard
                <ArrowRightIcon size={19} aria-hidden="true" />
              </a>
              <a className="home-secondary" href="#how-it-works">
                See how it works
                <ArrowRightIcon size={17} aria-hidden="true" />
              </a>
            </div>
            <p className="home-hero-note">
              Great Britain wind. Elexon data. Every forecast in context.
            </p>
          </div>
          <figure className="home-hero-figure">
            <img
              src="/images/coastal-wind.webp"
              alt="White wind turbines across a green coastal headland overlooking the sea"
              width="1536"
              height="1024"
              fetchPriority="high"
            />
            <figcaption>
              Perspective on a changing energy landscape.{" "}
              <span>Illustrative AI-generated imagery.</span>
            </figcaption>
          </figure>
        </section>
        <div className="home-facts home-container" aria-label="Pilot scope">
          <div>
            <strong>31</strong>
            <span>January decision days</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Elexon source datasets</span>
          </div>
          <div className="home-fact-text">
            <strong>One transparent view</strong>
            <span>Forecasts, actuals and the evidence behind them</span>
          </div>
        </div>
        <section
          id="how-it-works"
          className="home-section home-container"
          aria-labelledby="workflow-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">
                From forecast to understanding
              </span>
              <h2 id="workflow-title">
                The decision deserves
                <br />
                the whole picture.
              </h2>
            </div>
            <p>
              Three connected views turn historical wind data into a clear,
              inspectable account of forecast performance.
            </p>
          </div>
          <div className="home-workflows">
            <article>
              <ClockCounterClockwiseIcon
                size={29}
                weight="regular"
                aria-hidden="true"
              />
              <span className="home-step">01 / Replay</span>
              <h3>See what was known.</h3>
              <p>
                Choose a decision date and cutoff. Reconstruct the latest
                forecast available before the buying decision, without later
                updates slipping in.
              </p>
              <a href="/dashboard">
                Replay a decision
                <ArrowRightIcon size={16} aria-hidden="true" />
              </a>
            </article>
            <article>
              <ChartLineUpIcon size={29} weight="regular" aria-hidden="true" />
              <span className="home-step">02 / Evaluate</span>
              <h3>Put the error in context.</h3>
              <p>
                Compare forecast and observed generation. Review MAE, RMSE, bias
                and coverage to understand the size and direction of the miss.
              </p>
              <a href="/dashboard?view=accuracy">
                Explore accuracy
                <ArrowRightIcon size={16} aria-hidden="true" />
              </a>
            </article>
            <article>
              <FingerprintIcon size={29} weight="regular" aria-hidden="true" />
              <span className="home-step">03 / Inspect</span>
              <h3>Follow the evidence.</h3>
              <p>
                Trace forecast publications, inspect the source snapshot, and
                understand the assumptions used to compare different data
                resolutions.
              </p>
              <a href="/dashboard?view=methodology">
                Read the methodology
                <ArrowRightIcon size={16} aria-hidden="true" />
              </a>
            </article>
          </div>
        </section>
        <section
          id="data-scope"
          className="home-scope home-container"
          aria-labelledby="scope-title"
        >
          <figure>
            <img
              src="/images/offshore-wind.webp"
              alt="An offshore wind farm with white turbines spaced across blue water near a distant coastline"
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Illustrative AI-generated imagery.</figcaption>
          </figure>
          <div className="home-scope-copy">
            <span className="home-eyebrow">Grounded in source data</span>
            <h2 id="scope-title">
              Built on evidence.
              <br />
              Clear about its limits.
            </h2>
            <p>
              The pilot brings together Elexon’s WINDFOR publication history and
              WIND FUELHH observations for Great Britain.
            </p>
            <ul>
              <li>Decisions from 1–31 January 2026</li>
              <li>Delivery from 2 January–1 February</li>
              <li>Publication timestamps and missing-data coverage</li>
              <li>Explicit comparison and alignment assumptions</li>
            </ul>
            <p className="home-scope-note">
              A focused wind forecast review. Demand, prices and the utility’s
              contracted portfolio are outside this pilot, so it does not
              calculate an actual procurement requirement.
            </p>
            <a className="home-secondary" href="/dashboard?view=methodology">
              Explore the data & methodology
              <ArrowRightIcon size={17} aria-hidden="true" />
            </a>
          </div>
        </section>
        <section className="home-cta home-container">
          <div>
            <span className="home-eyebrow">Start with a decision</span>
            <h2>Look beyond the forecast.</h2>
            <p>
              Replay January’s decisions and explore the outcomes for yourself.
            </p>
          </div>
          <a className="home-button" href="/dashboard">
            Open the workspace
            <ArrowRightIcon size={19} aria-hidden="true" />
          </a>
        </section>
      </main>
      <footer className="home-footer home-container">
        <Brand />
        <p>Contains BMRS data © Elexon Limited copyright and database right.</p>
        <a
          href="https://developer.data.elexon.co.uk/"
          target="_blank"
          rel="noreferrer"
        >
          Elexon Insights
          <ArrowUpRightIcon size={14} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
