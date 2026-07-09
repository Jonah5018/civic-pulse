import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "motion/react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { getReports } from "../lib/reports";
import { getReportCoords } from "../data/locations";

const STATUS_COLORS = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  resolved: "#10b981",
  escalated: "#ef4444",
};

export default function MapPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReports({});
        setReports(data ?? []);
      } catch (e) {
        console.warn("[MapPage] fetch failed:", e.message);
      }
    })();
  }, []);

  const pinned = useMemo(
    () =>
      reports.map((r) => {
        const { coords, approximate } = getReportCoords(r);
        return { ...r, coords, approximate };
      }),
    [reports]
  );

  const center = useMemo(() => {
    if (!pinned.length) return [6.2, 7.0];
    const latSum = pinned.reduce((s, r) => s + r.coords[0], 0);
    const lngSum = pinned.reduce((s, r) => s + r.coords[1], 0);
    return [latSum / pinned.length, lngSum / pinned.length];
  }, [pinned]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-surface/60">
          <svg className="h-8 w-8 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Sign in with an admin account to access the incident map.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.admin.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live incident map — {pinned.length} {pinned.length === 1 ? "location" : "locations"} pinned
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-pending" />
            <span className="text-xs text-ink-muted">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-in-progress" />
            <span className="text-xs text-ink-muted">In progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-resolved" />
            <span className="text-xs text-ink-muted">Resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-escalated" />
            <span className="text-xs text-ink-muted">Escalated</span>
          </div>
        </div>
      </div>

      <div className="mt-6 h-[70vh] overflow-hidden rounded-2xl border border-border-soft">
        <MapContainer
          center={center}
          zoom={pinned.length ? 10 : 7}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
      {pinned.map((r) => (
        <CircleMarker
          key={r.id}
          center={r.coords}
          radius={8}
          fillColor={STATUS_COLORS[r.status] ?? "#29d3f5"}
          color={STATUS_COLORS[r.status] ?? "#29d3f5"}
          weight={2}
          opacity={0.9}
          fillOpacity={0.7}
        >
          <Popup>
            <div className="min-w-[180px] p-1">
              <p className="font-mono text-xs text-cyan">{r.tracking_id}</p>
              <p className="mt-1 text-xs font-medium text-ink">{t.categories[r.category] ?? r.category}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {r.ward}, {r.lga}
              </p>
              <p className="text-[11px] text-ink-faint">Status: {r.status}</p>
              {r.approximate && (
                <p className="mt-1 text-[11px] text-amber-400">
                  Approx. location — GPS not provided
                </p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
        </MapContainer>
      </div>
    </motion.div>
  );
}
