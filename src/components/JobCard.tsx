import Link from "next/link";
import {
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/types";

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    remotive: "bg-purple-100 text-purple-800",
    remoteok: "bg-emerald-100 text-emerald-800",
    jobicy: "bg-orange-100 text-orange-800",
    himalayas: "bg-teal-100 text-teal-800",
    workingnomads: "bg-amber-100 text-amber-800",
    arcdev: "bg-rose-100 text-rose-800",
    remoteco: "bg-cyan-100 text-cyan-800",
    jobberman: "bg-green-100 text-green-800",
    adzuna: "bg-sky-100 text-sky-800",
  };
  return colors[source] || "bg-gray-100 text-gray-800";
}

export function JobCard({ job }: { job: Job }) {
  const posted = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
    : job.scraped_at
      ? formatDistanceToNow(new Date(job.scraped_at), { addSuffix: true })
      : "Recently";

  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/jobs/${job.id}`}
              className="text-lg font-semibold leading-tight hover:text-primary transition-colors line-clamp-2"
            >
              {job.title}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {posted}
              </span>
            </div>
          </div>
          <div
            className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${getScoreColor(job.relevance_score)}`}
          >
            {job.relevance_score}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {job.ai_summary && (
          <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
            {job.ai_summary}
          </p>
        )}

        {job.salary_range && (
          <div className="mb-3 flex items-center gap-1 text-sm font-medium text-green-700">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary_range}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={getSourceColor(job.source)}>
            {job.source}
          </Badge>
          {job.tags?.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Apply
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
