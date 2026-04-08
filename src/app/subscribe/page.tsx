import { Bell, MessageSquare, Zap, Shield } from "lucide-react";
import { SubscribeForm } from "@/components/SubscribeForm";

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          Get Job Alerts on WhatsApp
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Never miss a relevant frontend job opportunity. We&apos;ll send you a
          WhatsApp message the moment a matching job is posted.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <div className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-md bg-primary/10 p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Instant Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Receive alerts within minutes of a new job being posted across
                  multiple job boards.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-md bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI-Filtered for You</h3>
                <p className="text-sm text-muted-foreground">
                  Only jobs scored 60%+ relevance for Nigerian frontend
                  developers will be sent to you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-md bg-primary/10 p-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Easy to Manage</h3>
                <p className="text-sm text-muted-foreground">
                  Reply STOP to unsubscribe anytime, RESUME to resubscribe. Full
                  control via WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-md bg-primary/10 p-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your phone number is only used for job alerts. We never share
                  it with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>

        <SubscribeForm />
      </div>
    </div>
  );
}
