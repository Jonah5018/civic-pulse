import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Construction,
  Zap,
  Droplet,
  Trash2,
  ShieldAlert,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  MapPin,
  User,
  Phone,
  Loader2,
  CheckCircle2,
  Copy,
  Search,
  ChevronDown,
  Mic,
  MicOff,
} from "lucide-react";

import FloatingField from "../components/FloatingField";
import GPSButton from "../components/GPSButton";
import FileDropzone from "../components/FileDropzone";
import PermissionHelpModal from "../components/PermissionHelpModal";
import RadarField from "../components/RadarField";
import { StatusPill } from "../components/StatusPill";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { STATES, LGAS_BY_STATE, SEED_WARDS } from "../data/locations";
import { submitReport, getReportByTrackingId, getReportStats, getWardsForLga } from "../lib/reports";

const CATEGORY_ICONS = {
  road: Construction,
  power: Zap,
  water: Droplet,
  waste: Trash2,
  security: ShieldAlert,
  health: HeartPulse,
  education: GraduationCap,
  other: MoreHorizontal,
};

const PRIORITY_ORDER = ["low", "medium", "high", "critical"];
const PRIORITY_DOT = {
  low: "bg-ink-faint",
  medium: "bg-cyan",
  high: "bg-amber",
  critical: "bg-rose",
};

const EMPTY_FORM = {
  category: "",
  description: "",
  priority: "medium",
  state: "",
  lga: "",
  ward: "",
  latitude: null,
  longitude: null,
  placeName: "",
  name: "",
  phone: "",
};

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  const [stats, setStats] = useState({ total: null, resolved: null });

  const [trackOpen, setTrackOpen] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(undefined);
  const [trackLoading, setTrackLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [permHelp, setPermHelp] = useState(null); // null | "microphone"
  const [voiceLanguage, setVoiceLanguage] = useState("auto");

  const lgas = form.state ? LGAS_BY_STATE[form.state] : [];

  useEffect(() => {
    (async () => {
      try {
        const nextStats = await getReportStats();
        setStats(nextStats);
      } catch {
        setStats({ total: null, resolved: null });
      }
    })();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    if (!form.lga) {
      setWards([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setWardsLoading(true);
      const fromDb = await getWardsForLga(form.lga);
      if (cancelled) return;
      setWards(fromDb ?? SEED_WARDS[form.lga] ?? []);
      setWardsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.lga]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.description || !form.state || !form.lga || !form.ward) {
      toast.error(t.toast.reportError);
      return;
    }
    if (!user) {
      navigate("/signup", { state: { from: "/" } });
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitReport(form, files, user?.id);
      setResult(data);
      toast.success(`${t.toast.reportSubmitted} ${data.tracking_id}`);
    } catch (err) {
      console.error(err);
      toast.error(t.toast.reportError);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setResult(null);
  };

  const toggleVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(t.home.voiceUnsupported);
      return;
    }

    if (isListening) {
      setIsListening(false);
      window.__civicPulseRecognition?.stop?.();
      return;
    }

    setSpeechError("");
    setIsListening(true);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      setIsListening(false);
      if (err?.name === "NotAllowedError") {
        setPermHelp("microphone");
      } else {
        setSpeechError(t.home.voiceError);
      }
      return;
    }

    const preferredLanguages =
      voiceLanguage === "ig" ? ["ig-NG"] : voiceLanguage === "en" ? ["en-US"] : ["en-US", "ig-NG"];

    const startRecognition = (language, attemptIndex) => {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();

        if (transcript) {
          setForm((prev) => ({
            ...prev,
            description: `${prev.description}${prev.description ? " " : ""}${transcript}`.trim(),
          }));
        }
      };

      recognition.onerror = (event) => {
        const isPermissionIssue = event.error === "not-allowed" || event.error === "audio-capture";
        if (!isPermissionIssue && attemptIndex < preferredLanguages.length - 1) {
          startRecognition(preferredLanguages[attemptIndex + 1], attemptIndex + 1);
          return;
        }

        if (isPermissionIssue) {
          setPermHelp("microphone");
        } else {
          setSpeechError(t.home.voiceError);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (window.__civicPulseRecognition === recognition) {
          setIsListening(false);
        }
      };

      window.__civicPulseRecognition = recognition;
      recognition.start();
    };

    startRecognition(preferredLanguages[0], 0);
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setTrackLoading(true);
    try {
      const data = await getReportByTrackingId(trackId);
      setTrackResult(data ?? null);
    } catch {
      setTrackResult(null);
    } finally {
      setTrackLoading(false);
    }
  };

  const categoryKeys = useMemo(() => Object.keys(CATEGORY_ICONS), []);

  return (
    <div className="relative">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <RadarField />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-slate-200"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
            </span>
            {t.home.eyebrow}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl"
          >
            {t.home.title} <span className="text-gradient">{t.home.titleAccent}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-balance text-sm text-slate-200 sm:text-base"
          >
            {t.home.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3"
          >
            <StatChip value={stats.total} label={t.home.statReports} accent="emerald" />
            <StatChip value={stats.resolved} label={t.home.statResolved} accent="cyan" />
            <StatChip value={5} label={t.home.statStates} accent="violet" />
          </motion.div>
        </div>
      </section>

      {/* ---------------- Report form ---------------- */}
      <section className="relative px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {result ? (
              <SuccessCard key="success" result={result} t={t} onReset={resetForm} />
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onSubmit={handleSubmit}
                className="glass-strong rounded-3xl p-5 sm:p-8"
              >
                <h2 className="font-display text-xl font-semibold">{t.home.formTitle}</h2>
                <p className="mt-1 text-sm text-slate-200">{t.home.formSubtitle}</p>

                {/* Category chips */}
                <div className="mt-6">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t.home.category}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {categoryKeys.map((key) => {
                      const Icon = CATEGORY_ICONS[key];
                      const active = form.category === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => update({ category: key })}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition-all ${
                            active
                              ? "border-emerald/50 bg-emerald-soft/30 text-emerald shadow-[0_0_16px_rgba(22,233,166,0.25)]"
                              : "border-border-soft bg-surface/40 text-ink-muted hover:border-border-strong"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          {t.categories[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-5">
                  <FloatingField
                    as="textarea"
                    label={t.home.description}
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    rows={3}
                    required
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isListening
                          ? "border-rose/40 bg-rose/10 text-rose"
                          : "border-cyan/30 bg-cyan-soft/20 text-cyan"
                      }`}
                    >
                      {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      {isListening ? t.home.voiceListening : t.home.voiceButton}
                    </button>
                    <select
                      value={voiceLanguage}
                      onChange={(e) => setVoiceLanguage(e.target.value)}
                      className="rounded-full border border-border-soft bg-surface/70 px-2.5 py-1 text-[11px] text-slate-200 outline-none"
                      aria-label={t.home.voiceLanguage}
                    >
                      <option value="auto">{t.home.voiceAuto}</option>
                      <option value="en">{t.home.voiceEnglish}</option>
                      <option value="ig">{t.home.voiceIgbo}</option>
                    </select>
                    {!speechSupported && <span className="text-xs text-slate-300">{t.home.voiceUnsupported}</span>}
                  </div>
                  {speechError ? <p className="mt-2 text-xs text-rose">{speechError}</p> : null}
                  <p className="mt-1.5 pl-1 text-xs text-slate-300">{t.home.descriptionPlaceholder}</p>
                </div>

                {/* Priority segmented control */}
                <div className="mt-5">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t.home.priority}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITY_ORDER.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => update({ priority: p })}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                          form.priority === p
                            ? "border-border-strong bg-white/8 text-ink"
                            : "border-border-soft text-ink-muted hover:border-border-strong"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
                        {t.priority[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="mt-6">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    <MapPin className="h-3.5 w-3.5" /> {t.home.locationTitle}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FloatingField
                      as="select"
                      label={t.common.state}
                      required
                      value={form.state}
                      onChange={(e) => update({ state: e.target.value, lga: "", ward: "" })}
                    >
                      <option value="" disabled />
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </FloatingField>

                    <FloatingField
                      as="select"
                      label={t.common.lga}
                      required
                      disabled={!form.state}
                      value={form.lga}
                      onChange={(e) => update({ lga: e.target.value, ward: "" })}
                    >
                      <option value="" disabled />
                      {lgas.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </FloatingField>

                    {wards.length > 0 ? (
                      <FloatingField
                        as="select"
                        label={t.common.ward}
                        required
                        disabled={!form.lga || wardsLoading}
                        value={form.ward}
                        onChange={(e) => update({ ward: e.target.value })}
                      >
                        <option value="" disabled />
                        {wards.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </FloatingField>
                    ) : (
                      <div>
                        <FloatingField
                          label={t.home.wardFallbackLabel}
                          required
                          disabled={!form.lga}
                          value={form.ward}
                          onChange={(e) => update({ ward: e.target.value })}
                        />
                        {form.lga && (
                          <p className="mt-1.5 pl-1 text-xs text-ink-faint">
                            {t.home.wardFallbackPlaceholder}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <GPSButton
                      state={form.state}
                      lga={form.lga}
                      onLocate={({ latitude, longitude, placeName, matchedWard }) =>
                        update({
                          latitude,
                          longitude,
                          placeName: placeName ?? "",
                          ...(matchedWard && { ward: matchedWard }),
                        })
                      }
                    />
                    {form.latitude && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 truncate text-xs text-ink-faint"
                      >
                        📍 {form.placeName || `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Evidence */}
                <div className="mt-6">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t.home.evidenceTitle}
                  </p>
                  <FileDropzone files={files} onFilesChange={setFiles} />
                </div>

                {/* Contact */}
                <div className="mt-6">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t.home.contactTitle}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FloatingField
                      label={t.home.name}
                      icon={User}
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <FloatingField
                      label={t.home.phone}
                      icon={Phone}
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update({ phone: e.target.value })}
                    />
                  </div>
                  <p className="mt-1.5 pl-1 text-xs text-slate-300">{t.home.contactHint}</p>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald to-cyan px-5 py-3.5 text-sm font-semibold text-[#04120c] shadow-[0_0_30px_-6px_rgba(22,233,166,0.55)] transition-opacity disabled:opacity-70"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? t.home.submitting : t.home.submit}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Track a report */}
          {!result && (
            <div className="mt-4">
              <button
                onClick={() => setTrackOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-2xl border border-border-soft bg-surface/40 px-5 py-4 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong"
              >
                {t.home.trackTitle}
                <ChevronDown className={`h-4 w-4 transition-transform ${trackOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {trackOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="glass mt-2 rounded-2xl p-5">
                      <p className="text-xs text-ink-faint">{t.home.trackSubtitle}</p>
                      <form onSubmit={handleTrack} className="mt-3 flex gap-2">
                        <div className="flex-1">
                          <FloatingField
                            label={t.home.trackPlaceholder}
                            icon={Search}
                            value={trackId}
                            onChange={(e) => setTrackId(e.target.value)}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={trackLoading}
                          className="rounded-xl border border-cyan/30 bg-cyan-soft/30 px-4 text-sm font-medium text-cyan transition-colors hover:border-cyan/60"
                        >
                          {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.home.trackButton}
                        </button>
                      </form>

                      {trackResult === null && (
                        <p className="mt-3 text-xs text-rose">{t.home.trackNotFound}</p>
                      )}
                      {trackResult && (
                        <div className="mt-4 rounded-xl border border-border-soft bg-surface/60 p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-cyan">{trackResult.tracking_id}</span>
                            <StatusPill status={trackResult.status} />
                          </div>
                          <p className="mt-2 text-sm text-ink">{t.categories[trackResult.category] ?? trackResult.category}</p>
                          <p className="text-xs text-ink-faint">
                            {trackResult.ward}, {trackResult.lga}, {trackResult.state}
                          </p>
                          {trackResult.admin_note && (
                            <div className="mt-3 rounded-lg border border-border-soft bg-surface/80 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Admin Update</p>
                              <p className="mt-1 text-sm text-ink">{trackResult.admin_note}</p>
                            </div>
                          )}
                          {trackResult.evidence_urls?.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {trackResult.evidence_urls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border-soft">
                                  <img src={url} alt={`Evidence ${idx + 1}`} className="h-20 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      <PermissionHelpModal
        open={permHelp === "microphone"}
        onClose={() => setPermHelp(null)}
        type="microphone"
      />
    </div>
  );
}

function StatChip({ value, label, accent }) {
  const color = { emerald: "text-emerald", cyan: "text-cyan", violet: "text-violet" }[accent];
  return (
    <div className="glass rounded-xl px-3 py-3 text-center">
      <p className={`font-display text-xl font-semibold ${color}`}>
        {value === null ? (
          <span className="inline-block h-5 w-8 animate-pulse rounded bg-white/10 align-middle" />
        ) : (
          value.toLocaleString()
        )}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
    </div>
  );
}

function SuccessCard({ result, t, onReset }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(result.tracking_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12 }}
      className="glass-strong rounded-3xl p-8 text-center"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald/30 bg-emerald-soft/30"
      >
        <CheckCircle2 className="h-8 w-8 text-emerald" />
      </motion.span>
      <h2 className="mt-5 font-display text-xl font-semibold">{t.home.successTitle}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t.home.successBody}</p>

      <button
        onClick={copy}
        className="mx-auto mt-3 flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-3 font-mono text-lg tracking-wider text-cyan transition-colors hover:border-cyan/50"
      >
        {result.tracking_id}
        {copied ? <CheckCircle2 className="h-4 w-4 text-emerald" /> : <Copy className="h-4 w-4" />}
      </button>

      <p className="mt-3 text-xs text-ink-faint">{t.home.successHint}</p>

      <button
        onClick={onReset}
        className="mt-6 rounded-xl border border-border-soft px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
      >
        {t.home.reportAnother}
      </button>
    </motion.div>
  );
}
