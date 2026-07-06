import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LocateFixed, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getWardsForLga } from "../lib/reports";
import { supabase } from "../lib/supabaseClient";

/**
 * "Use my GPS location" — the signature radar-sweep interaction. Captures
 * lat/lng via the browser Geolocation API, reverse-geocodes with OpenStreetMap,
 * and attempts to auto-fill the ward based on proximity to seeded wards.
 */
export default function GPSButton({ onLocate, state: userState, lga: userLga }) {
  const { t } = useLanguage();
  const [state, setState] = useState("idle"); // idle | locating | success | error
  const [message, setMessage] = useState("");

  const handleClick = () => {
    if (!("geolocation" in navigator)) {
      setState("error");
      setMessage(t.home.gpsUnsupported);
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let placeName = null;
        let matchedWard = null;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            placeName = data?.display_name ?? null;

            // Attempt to auto-fill ward if LGA is selected
            if (userLga) {
              const wards = await getWardsForLga(userLga);
              if (wards && placeName) {
                // Try to match ward name from place name (e.g., "Umuahia North, Abia, Nigeria")
                const placeNameLower = placeName.toLowerCase();
                matchedWard = wards.find((ward) =>
                  placeNameLower.includes(ward.toLowerCase())
                );
              }
            }
          }
        } catch {
          // Reverse geocoding is a nice-to-have — silently fall back to raw coordinates.
        }

        setState("success");
        setMessage(t.home.gpsFound);
        onLocate?.({ latitude, longitude, placeName, matchedWard });
      },
      (error) => {
        setState("error");
        setMessage(error.code === error.PERMISSION_DENIED ? t.home.gpsDenied : t.home.gpsUnsupported);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        disabled={state === "locating"}
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-emerald/30 bg-emerald-soft/40 px-5 py-3.5 text-sm font-medium text-emerald transition-colors hover:border-emerald/60 disabled:cursor-wait"
      >
        {/* Radar sweep */}
        <span className="relative flex h-5 w-5 items-center justify-center">
          {state === "locating" && (
            <>
              <span className="absolute h-5 w-5 rounded-full border border-emerald/60 animate-pulse-ring" />
              <span
                className="absolute h-5 w-5 rounded-full border border-emerald/60 animate-pulse-ring"
                style={{ animationDelay: "0.7s" }}
              />
              <span
                className="absolute inset-0 rounded-full animate-radar-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0%, rgba(22,233,166,0.9) 15%, transparent 30%)",
                }}
              />
            </>
          )}
          {state === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : state === "error" ? (
            <AlertCircle className="h-5 w-5 text-rose" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </span>

        <span>
          {state === "locating"
            ? t.home.gpsLocating
            : state === "success"
              ? t.home.gpsFound
              : t.home.gpsButton}
        </span>
      </motion.button>

      <AnimatePresence>
        {message && state === "error" && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-xs text-rose"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
