"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { JobCard } from "./JobCard";
import { SearchFilter } from "./SearchFilter";
import { Button } from "@/components/ui/button";
import type { Job } from "@/lib/types";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [minScore, setMinScore] = useState(0);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (source) params.set("source", source);
      if (minScore > 0) params.set("min_score", minScore.toString());

      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");

      const data = await res.json();
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, source, minScore]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handleSourceFilter = useCallback((s: string) => {
    setSource(s);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handleScoreFilter = useCallback((score: number) => {
    setMinScore(score);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  return (
    <div className="space-y-6">
      <SearchFilter
        onSearch={handleSearch}
        onSourceFilter={handleSourceFilter}
        onScoreFilter={handleScoreFilter}
        activeSource={source}
        activeMinScore={minScore}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pagination.total} job{pagination.total !== 1 ? "s" : ""} found
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No jobs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters, or trigger a new scrape.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page - 1 }))
            }
          >
            Previous
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
