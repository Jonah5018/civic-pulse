import { useCallback, useEffect, useRef, useState } from "react";
import { getReports, updateReportStatus } from "../lib/reports";
import { supabase } from "../lib/supabaseClient";
import { useDebouncedValue } from "./useDebouncedValue";

function matchesFilters(report, filters = {}) {
  const normalizedSearch = (filters.search ?? "").trim().toLowerCase();
  const matchesState = !filters.state || report.state === filters.state;
  const matchesStatus = !filters.status || report.status === filters.status;
  const matchesSearch =
    !normalizedSearch ||
    [report.tracking_id, report.category, report.description].some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearch)
    );

  return matchesState && matchesStatus && matchesSearch;
}

export function useReports(options = {}) {
  const { filters = {}, page = 1, pageSize = 15, scopedWards } = options;
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebouncedValue(filters.search ?? "", 250);
  const abortControllerRef = useRef(null);

  const fetchReports = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const debouncedFilters = { ...filters, search: debouncedSearch };
        const offset = (page - 1) * pageSize;
        const [data, { count }] = await Promise.all([
          getReports({ ...debouncedFilters, limit: pageSize, offset, scopedWards }, signal),
          supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .abortSignal(signal),
        ]);
        setReports(data ?? []);
        setTotalReports(count ?? 0);
        setError(null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setReports([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, debouncedSearch, page, pageSize, scopedWards]
  );

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchReports(controller.signal);

    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          setReports((prev) => {
            if (!matchesFilters(payload.new, filters)) return prev;
            return [
              payload.new,
              ...prev.filter((report) => report.id !== payload.new.id),
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reports" },
        (payload) => {
          setReports((prev) => {
            const updated = payload.new;
            if (!matchesFilters(updated, filters)) {
              return prev.filter((report) => report.id !== updated.id);
            }
            return prev.map((report) =>
              report.id === updated.id ? updated : report
            );
          });
        }
      )
      .subscribe();

    return () => {
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, [fetchReports, filters, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));

  const updateStatus = useCallback(
    async (id, status) => {
      setReports((prev) =>
        prev.map((report) => (report.id === id ? { ...report, status } : report))
      );
      try {
        const updated = await updateReportStatus(id, status);
        setReports((prev) =>
          prev.map((report) => (report.id === updated.id ? updated : report))
        );
        return { error: null };
      } catch (err) {
        setReports((prev) =>
          prev.map((report) => (report.id === id ? { ...report, status: prev.find((r) => r.id === id)?.status } : report))
        );
        return { error: err };
      }
    },
    []
  );

  return { reports, loading, error, refetch: fetchReports, updateStatus, totalReports, totalPages, page };
}

export function exportReportsToCsv(reports) {
  const headers = ["Tracking ID", "Category", "Priority", "Status", "State", "LGA", "Ward", "Reported At"];
  const rows = reports.map((r) => [
    r.tracking_id,
    r.category,
    r.priority,
    r.status,
    r.state,
    r.lga,
    r.ward,
    new Date(r.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `civicpulse-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
