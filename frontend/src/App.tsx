import { lazy, Suspense, useEffect } from "react";
import HomePage from "./HomePage";

const Dashboard = lazy(() => import("./Dashboard"));

export default function App() {
  const home = window.location.pathname === "/";
  useEffect(() => {
    document.title = home
      ? "Wind Intelligence · A clearer decision"
      : "Wind Intelligence · Day-ahead review";
  }, [home]);
  return home ? (
    <HomePage />
  ) : (
    <Suspense
      fallback={
        <div className="load-state" role="status">
          Opening workspace…
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
