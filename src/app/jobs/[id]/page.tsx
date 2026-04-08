import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@supabase/supabase-js";

async function getJob(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  const posted = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
    : "Recently";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <div className="flex-shrink-0 rounded-full border-2 border-primary bg-primary/10 px-4 py-1.5 text-lg font-bold text-primary">
              {job.relevance_score}%
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {job.company}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {posted}
            </span>
            {job.salary_range && (
              <span className="flex items-center gap-1.5 text-green-700 font-medium">
                <DollarSign className="h-4 w-4" />
                {job.salary_range}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{job.source}</Badge>
            {job.tags?.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {job.ai_summary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex gap-3 pt-6">
              <Sparkles className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-primary mb-1">AI Summary</h3>
                <p className="text-sm leading-relaxed">{job.ai_summary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Apply Now
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <Separator />

        <div>
          <h2 className="mb-4 text-xl font-semibold">Job Description</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
            {stripHtml(job.description || "No description available.")}
          </div>
        </div>
      </div>
    </div>
  );
}
