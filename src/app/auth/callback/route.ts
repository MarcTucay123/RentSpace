import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const passwordRecoveryCookie = "dormmate-password-recovery";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const role = requestUrl.searchParams.get("role") === "admin"
    ? "admin"
    : requestUrl.searchParams.get("role") === "landlord"
      ? "landlord"
      : "tenant";
  const resetUrl = new URL(`/reset-password?role=${role}`, requestUrl.origin);
  const response = NextResponse.redirect(resetUrl);

  if (!code) {
    return NextResponse.redirect(new URL(`/forgot-password?role=${role}&error=invalid-link`, requestUrl.origin));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  const recoveryData = data as typeof data & { redirectType?: string | null };

  if (error || !recoveryData.user || recoveryData.redirectType !== "recovery") {
    await supabase.auth.signOut();
    const invalidResponse = NextResponse.redirect(new URL(`/forgot-password?role=${role}&error=invalid-link`, requestUrl.origin));
    response.cookies.getAll().forEach((cookie) => invalidResponse.cookies.set(cookie));
    return invalidResponse;
  }

  response.cookies.set(passwordRecoveryCookie, recoveryData.user.id, {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}