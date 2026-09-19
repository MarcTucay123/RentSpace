import { AiAssistantChat } from "@/components/landlord/ai-assistant-chat";
import { requireLandlordAccess } from "@/lib/auth/utils";

export const metadata = {
  title: "AI Assistant | RentSpace",
};

export default async function LandlordAiAssistantPage() {
  const { profile } = await requireLandlordAccess();

  const prompts = [
    "What should I prioritize in RentSpace today?",
    "Which tenants appear to need rent follow-up this week?",
    "Give me advice for handling overdue rent professionally.",
    "Which maintenance requests are still unresolved?",
    "Which payment submissions are still pending verification?",
    "How can I communicate with a tenant through RentSpace?",
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">AI Assistant</p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Your RentSpace operations adviser</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">
          Ask about authorized Tenant, Rent, Payment, Maintenance, Message, and Notification records. The adviser can recommend next steps and prepare Tenant message drafts, while keeping every action and conversation inside RentSpace. It never changes records or sends messages without your review.
        </p>
      </section>

      <AiAssistantChat landlordName={profile.first_name} prompts={prompts} initialGeneratedAt={new Date().toISOString()} />
    </div>
  );
}