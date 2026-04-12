"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SubscribeForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [tgPhone, setTgPhone] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [tgError, setTgError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          name: name || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
        setPhone("");
        setName("");
      } else {
        setResult({
          success: false,
          message: data.error || "Something went wrong",
        });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgLoading(true);
    setTgError(null);
    setTgLink(null);
    try {
      const res = await fetch("/api/telegram/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: tgPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTgError(data.error || "Could not create link");
        return;
      }
      if (data.deep_link) setTgLink(data.deep_link as string);
    } catch {
      setTgError("Network error. Please try again.");
    } finally {
      setTgLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Subscribe to Job Alerts</CardTitle>
        <CardDescription>
          Enter your WhatsApp number to receive notifications when new relevant
          frontend jobs are posted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+234XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Include your country code (e.g. +234 for Nigeria)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !phone}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              "Subscribe"
            )}
          </Button>

          {result && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                result.success
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-destructive/20 bg-destructive/5 text-destructive"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              {result.message}
            </div>
          )}
        </form>

        <div className="mt-8 border-t pt-6 space-y-3">
          <h3 className="text-sm font-medium">Telegram (optional)</h3>
          <p className="text-xs text-muted-foreground">
            Use the same phone number you subscribed with. You will get a link to
            open our bot in Telegram and finish linking.
          </p>
          <form onSubmit={handleTelegramLink} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tg-phone">Phone number</Label>
              <Input
                id="tg-phone"
                type="tel"
                placeholder="+234XXXXXXXXXX"
                value={tgPhone}
                onChange={(e) => setTgPhone(e.target.value)}
                disabled={tgLoading}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={tgLoading || !tgPhone.trim()}
            >
              {tgLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating link…
                </>
              ) : (
                "Get Telegram link"
              )}
            </Button>
          </form>
          {tgError && (
            <p className="text-xs text-destructive flex items-start gap-1">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              {tgError}
            </p>
          )}
          {tgLink && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 space-y-2">
              <p className="font-medium">Open this link in Telegram</p>
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-green-800 underline"
              >
                {tgLink}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
