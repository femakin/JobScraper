import { Briefcase, Zap, Bell } from "lucide-react";
import { JobList } from "@/components/JobList";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          Remote Frontend Jobs
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          AI-curated remote frontend developer positions open to applicants from
          Nigeria
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <div className="rounded-md bg-primary/10 p-2">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Multiple Sources</h3>
              <p className="text-sm text-muted-foreground">
                Jobs from Remotive, RemoteOK, Jobicy, and Adzuna
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <div className="rounded-md bg-primary/10 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Scored</h3>
              <p className="text-sm text-muted-foreground">
                Each job is scored for relevance to Nigerian frontend developers
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <div className="rounded-md bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">WhatsApp Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Get notified instantly when matching jobs are posted
              </p>
            </div>
          </div>
        </div>
      </section>

      <JobList />
    </div>
  );
}
