import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { phone_number, name } = await request.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number: ensure it starts with +
    const normalized = phone_number.startsWith("+")
      ? phone_number
      : `+${phone_number}`;

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from("subscribers")
      .select("id, is_active")
      .eq("phone_number", normalized)
      .single();

    if (existing) {
      if (!existing.is_active) {
        await supabaseAdmin
          .from("subscribers")
          .update({ is_active: true, name: name || undefined })
          .eq("id", existing.id);

        return NextResponse.json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
          reactivated: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "You are already subscribed!",
        already_subscribed: true,
      });
    }

    const { error } = await supabaseAdmin.from("subscribers").insert({
      phone_number: normalized,
      name: name || null,
      is_active: true,
      preferences: {
        keywords: [
          "frontend",
          "react",
          "nextjs",
          "javascript",
          "typescript",
        ],
        min_relevance: 60,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message:
        "You have been subscribed! You will receive WhatsApp notifications when new relevant jobs are found.",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
