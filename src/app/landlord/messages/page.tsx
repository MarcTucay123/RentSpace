import { MessageInbox } from "@/components/messages/message-inbox";
import { requireLandlordAccess } from "@/lib/auth/utils";
import { getMessagingData } from "@/lib/messages/data";

export const metadata = { title: "Messages | RentSpace" };

type MessagesPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LandlordMessagesPage({ searchParams }: MessagesPageProps) {
  const [{ profile }, params] = await Promise.all([requireLandlordAccess(), searchParams]);
  const data = await getMessagingData(profile);
  const selectedContactId = typeof params.contact === "string" ? params.contact : null;
  const initialDraft = typeof params.draft === "string" ? params.draft.slice(0, 2000) : "";

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Messages</p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">Tenant conversations</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">Communicate directly with approved Tenant accounts.</p>
      </section>
      {data.setupRequired ? (
        <section className="rounded-[1.35rem] border border-[#f0d49d] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold text-[var(--color-dormmate-text-strong)]">Messaging setup required</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">Run <strong>20260907_005_direct_messaging.sql</strong> in Supabase SQL Editor, then refresh this page.</p>
          {data.errorCode ? <p className="mt-2 text-xs font-semibold text-[#a66f12]">Diagnostic code: {data.errorCode}</p> : null}
        </section>
      ) : <MessageInbox currentProfileId={profile.id} basePath="/landlord/messages" contacts={data.contacts} messages={data.messages} selectedContactId={selectedContactId} initialDraft={initialDraft} />}
    </div>
  );
}