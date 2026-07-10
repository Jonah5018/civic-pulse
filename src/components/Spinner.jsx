/**
 * Lightweight loading spinner used while asynchronous Supabase data is in
 * flight (e.g. the incident detail panel). Uses the app's cyan accent so it
 * matches the rest of the UI.
 */
export default function Spinner({ className = "", size = 28 }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-white/15 border-t-cyan ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
