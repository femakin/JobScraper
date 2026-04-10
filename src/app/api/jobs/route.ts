import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // console.log(searchParams);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";
  const minScore = parseInt(searchParams.get("min_score") || "0");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("jobs")
    .select("*", { count: "exact" })
    .gte("relevance_score", minScore)
    .order("scraped_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,ai_summary.ilike.%${search}%`
    );
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data: jobs, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    jobs: jobs || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}
