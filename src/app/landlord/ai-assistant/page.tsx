import { AiAssistantChat } from "@/components/landlord/ai-assistant-chat";
import { requireLandlordAccess } from "@/lib/auth/utils";

export const metadata = {
  title: "AI Assistant | RentSpace",
};

/** Renders the read-only operations assistant for an authorized Landlord. */
export default async function LandlordAiAssistantPage() {
  const { profile } = await requireLandlordAccess();

  const prompts = [
    "What should I prioritize in RentSpace today?",
    "Interpret this month's collection rate and outstanding balance.",
    "Summarize our six-month rent collection trend.",
    "Analyze our occupancy rate and available rental spaces.",
    "Which tenants appear to need rent follow-up this week?",
    "Which maintenance requests are still unresolved?",
    "Which payment submissions are still pending verification?",
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">AI Assistant</p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Your RentSpace operations and analytics adviser</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">Ask for interpretations of verified reports, collection performance, occupancy, six-month trends, overdue risks, payments, and maintenance records.</p>
      </section>

      <AiAssistantChat landlordName={profile.first_name} prompts={prompts} initialGeneratedAt={new Date().toISOString()} />
    </div>
  );
}