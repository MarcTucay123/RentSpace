"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedProfile } from "@/lib/auth/utils";
import { createClient } from "@/utils/supabase/server";

export type MessageFormState = { success?: boolean; message?: string };

export async function sendDirectMessage(_state: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const { profile } = await requireAuthenticatedProfile();
  if (profile.account_status !== "approved" || !["tenant", "landlord"].includes(profile.role)) {
    return { success: false, message: "Your account cannot send messages." };
  }

  const recipientProfileId = String(formData.get("recipientProfileId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!recipientProfileId || !body) return { success: false, message: "Choose a contact and enter a message." };
  if (body.length > 2000) return { success: false, message: "Messages must be 2,000 characters or fewer." };

  const supabase = await createClient();
  const expectedRole = profile.role === "landlord" ? "tenant" : "landlord";
  const { data: recipient } = await supabase
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", recipientProfileId)
    .eq("role", expectedRole)
    .eq("account_status", "approved")
    .maybeSingle();

  if (!recipient) return { success: false, message: "That contact is unavailable." };

  const { error } = await supabase.from("messages").insert({
    sender_profile_id: profile.id,
    recipient_profile_id: recipient.id,
    body,
  });
  if (error) return { success: false, message: error.code === "42P01" ? "Messaging is not installed yet." : "Unable to send your message." };

  revalidatePath("/landlord/messages");
  revalidatePath("/tenant/messages");
  revalidatePath("/landlord/notifications");
  revalidatePath("/tenant/notifications");
  return { success: true, message: "Message sent." };
}

export async function markConversationRead(contactProfileId: string) {
  const { profile } = await requireAuthenticatedProfile();
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("sender_profile_id", contactProfileId)
    .eq("recipient_profile_id", profile.id)
    .eq("is_read", false);

  revalidatePath("/landlord/messages");
  revalidatePath("/tenant/messages");
}