"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { markConversationRead, sendDirectMessage, type MessageFormState } from "@/app/actions/messages";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { DirectMessage, MessageContact } from "@/lib/messages/data";

const initialState: MessageFormState = {};

type MessageInboxProps = {
  currentProfileId: string;
  basePath: string;
  contacts: MessageContact[];
  messages: DirectMessage[];
  selectedContactId: string | null;
  initialDraft?: string;
  searchEnabled?: boolean;
};

function displayName(contact: MessageContact) {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MessageInbox({ currentProfileId, basePath, contacts, messages, selectedContactId, initialDraft = "", searchEnabled = true }: MessageInboxProps) {
  const [state, action, pending] = useActionState(sendDirectMessage, initialState);
  const [reading, startReading] = useTransition();
  const [contactSearch, setContactSearch] = useState("");
  const normalizedSearch = contactSearch.trim().toLocaleLowerCase();
  const filteredContacts = contacts.filter((contact) => {
    const searchable = [displayName(contact), contact.email, contact.assignmentLabel].filter(Boolean).join(" ").toLocaleLowerCase();
    return !normalizedSearch || searchable.includes(normalizedSearch);
  });
  const selectedContact = filteredContacts.find((contact) => contact.id === selectedContactId) ?? filteredContacts[0] ?? null;
  const selectedMessages = selectedContact
    ? messages.filter((message) =>
        (message.senderProfileId === currentProfileId && message.recipientProfileId === selectedContact.id)
        || (message.senderProfileId === selectedContact.id && message.recipientProfileId === currentProfileId),
      )
    : [];
  const unreadSelected = selectedContact
    ? selectedMessages.filter((message) => message.senderProfileId === selectedContact.id && !message.isRead).length
    : 0;

  return (
    <div className="grid h-[min(760px,calc(100dvh-1.5rem))] min-h-[560px] min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white shadow-[var(--shadow)] lg:h-[min(680px,calc(100dvh-7rem))] lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-[var(--color-dormmate-border)] bg-[#f5f6f4] p-3 lg:border-b-0 lg:border-r lg:p-4">
        <div className="px-2 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-dormmate-primary)]">Conversations</p>
          <p className="mt-1 text-sm text-[var(--color-dormmate-muted)]">{filteredContacts.length} of {contacts.length} contact{contacts.length === 1 ? "" : "s"}</p>
          {searchEnabled ? (
            <label className="mt-3 block">
              <span className="sr-only">Search message contacts</span>
              <input type="search" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Search tenant name or email" className="w-full rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#778da9] focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
            </label>
          ) : null}
        </div>
        <nav aria-label="Message contacts" className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:grid lg:min-h-0 lg:flex-1 lg:content-start lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {filteredContacts.length === 0 ? <p className="px-2 py-4 text-sm text-[var(--color-dormmate-muted)]">{searchEnabled ? "No tenants match your search." : "No landlord contact is available."}</p> : null}
          {filteredContacts.map((contact) => {
            const contactMessages = messages.filter((message) => message.senderProfileId === contact.id || message.recipientProfileId === contact.id);
            const lastMessage = contactMessages.at(-1);
            const unread = contactMessages.filter((message) => message.senderProfileId === contact.id && !message.isRead).length;
            const active = selectedContact?.id === contact.id;
            return (
              <div
                key={contact.id}
                className={`flex min-w-[210px] items-center gap-2.5 rounded-[14px] p-3 transition lg:min-w-0 ${active ? "bg-[var(--color-dormmate-green-soft)]" : "bg-white hover:bg-[var(--color-dormmate-green-soft)]"}`}
              >
                <ProfileAvatar photoUrl={contact.profile_photo_url} name={displayName(contact)} assignmentLabel={contact.role === "tenant" ? contact.assignmentLabel ?? "No current assignment" : "Landlord account"} assignmentPrefix={contact.role === "tenant" ? "Assigned to" : "Account"} className="h-9 w-9" />
                <Link href={`${basePath}?contact=${contact.id}`} className="min-w-0 flex-1 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-[#0d1b2a]">{displayName(contact)}</strong>
                    {unread > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-dormmate-primary)] px-1 text-[10px] font-bold text-white">{unread}</span> : null}
                  </div>
                  {contact.role === "tenant" ? <p className="mt-1 truncate text-[11px] font-medium text-[var(--color-dormmate-primary)]">{contact.assignmentLabel ?? "No current assignment"}</p> : null}
                  <p className="mt-0.5 truncate text-xs text-[var(--color-dormmate-muted)]">{lastMessage?.body ?? `${contact.role} contact`}</p>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden">
        {selectedContact ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-[var(--color-dormmate-border)] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar photoUrl={selectedContact.profile_photo_url} name={displayName(selectedContact)} assignmentLabel={selectedContact.role === "tenant" ? selectedContact.assignmentLabel ?? "No current assignment" : "Landlord account"} assignmentPrefix={selectedContact.role === "tenant" ? "Assigned to" : "Account"} />
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-[#0d1b2a]">{displayName(selectedContact)}</h2>
                  {selectedContact.role === "tenant" ? <p className="truncate text-xs font-medium text-[var(--color-dormmate-primary)]">{selectedContact.assignmentLabel ?? "No current assignment"}</p> : <p className="text-xs capitalize text-[var(--color-dormmate-muted)]">{selectedContact.role}</p>}
                </div>
              </div>
              {unreadSelected > 0 ? (
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => startReading(() => void markConversationRead(selectedContact.id))}
                  className="text-xs font-semibold text-[var(--color-dormmate-primary)] hover:underline disabled:opacity-60"
                >
                  {reading ? "Updating..." : `Mark ${unreadSelected} read`}
                </button>
              ) : null}
            </header>

            <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f8f8f6] p-3 sm:p-5">
              {selectedMessages.length === 0 ? (
                <div className="grid min-h-[260px] place-items-center text-center">
                  <div>
                    <p className="font-semibold text-[#0d1b2a]">Start the conversation</p>
                    <p className="mt-1 text-sm text-[var(--color-dormmate-muted)]">Send a message about rent, maintenance, or rental concerns.</p>
                  </div>
                </div>
              ) : selectedMessages.map((message) => {
                const outgoing = message.senderProfileId === currentProfileId;
                return (
                  <article key={message.id} className={`flex min-w-0 max-w-full ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`min-w-0 max-w-[88%] overflow-hidden rounded-[18px] px-3.5 py-3 sm:max-w-[70%] sm:px-4 ${outgoing ? "rounded-br-md bg-[#1b263b] text-white" : "rounded-bl-md border border-[var(--color-dormmate-border)] bg-white text-[#0d1b2a]"}`}>
                      <p className="whitespace-pre-wrap break-all text-sm leading-6 [overflow-wrap:anywhere]">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${outgoing ? "text-white/70" : "text-[#415a77]"}`}>{formatTime(message.createdAt)}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <form action={action} className="border-t border-[var(--color-dormmate-border)] p-3 sm:p-4">
              <input type="hidden" name="recipientProfileId" value={selectedContact.id} />
              {state.message ? <p className={`mb-2 text-xs ${state.success ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p> : null}
              <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-end">
                <textarea name="body" required maxLength={2000} rows={2} defaultValue={initialDraft} placeholder="Write a message..." className="min-h-[48px] min-w-0 w-full flex-1 resize-none rounded-[16px] border border-[var(--color-dormmate-border)] bg-[#f8f8f6] px-4 py-3 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)]" />
                <button type="submit" disabled={pending} className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto">
                  {pending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div><p className="font-semibold text-[#0d1b2a]">No contacts available</p><p className="mt-1 text-sm text-[var(--color-dormmate-muted)]">Approved contacts will appear here.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}