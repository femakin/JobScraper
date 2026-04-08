"use client";

import { useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onSourceFilter: (source: string) => void;
  onScoreFilter: (minScore: number) => void;
  activeSource: string;
  activeMinScore: number;
}

const sources = [
  { id: "", label: "All Sources" },
  { id: "remotive", label: "Remotive" },
  { id: "remoteok", label: "RemoteOK" },
  { id: "jobicy", label: "Jobicy" },
  { id: "himalayas", label: "Himalayas" },
  { id: "workingnomads", label: "WorkingNomads" },
  { id: "arcdev", label: "Arc.dev" },
  { id: "remoteco", label: "Remote.co" },
  { id: "jobberman", label: "Jobberman" },
  { id: "adzuna", label: "Adzuna" },
  { id: "moniepoint", label: "Moniepoint" },
  { id: "myjobmag", label: "MyJobMag" },
];

const scoreFilters = [
  { value: 0, label: "All" },
  { value: 40, label: "40+" },
  { value: 60, label: "60+" },
  { value: 80, label: "80+" },
];

export function SearchFilter({
  onSearch,
  onSourceFilter,
  onScoreFilter,
  activeSource,
  activeMinScore,
}: SearchFilterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timeout = setTimeout(() => onSearch(value), 300);
      return () => clearTimeout(timeout);
    },
    [onSearch]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, skills..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            showFilters
              ? "border-primary bg-primary/5 text-primary"
              : "hover:bg-accent"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
          <div>
            <span className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Source
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sources.map(({ id, label }) => (
                <Badge
                  key={id}
                  variant={activeSource === id ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onSourceFilter(id)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Min Relevance
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scoreFilters.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={activeMinScore === value ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => onScoreFilter(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
