"use server";

// m10-users — admin server actions for the Users directory. Every export is
// admin-only (requireAdmin redirects non-admins). Members are plain DB rows
// with no auth account, so there is no GoTrue work here — just inserts/updates
// on public.members. Each member is assigned to a team lead (a profile).
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string field, or null when missing/empty. */
function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function assertUuid(id: string, what: string): void {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${what} id.`);
  }
}

/** Confirm a profile exists and is a team lead; throws otherwise. */
async function assertLeadExists(
  supabase: ReturnType<typeof createServiceClient>,
  leadId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", leadId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to verify team lead: ${error.message}`);
  }
  if (!data || (data as { role: string }).role !== "team_lead") {
    throw new Error("That team lead no longer exists.");
  }
}

export async function addMember(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = text(formData, "email")?.toLowerCase() ?? null;
  if (!email) throw new Error("Email is required.");
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const fullName = text(formData, "full_name");
  if (fullName !== null && fullName.length > 200) {
    throw new Error("Full name must be at most 200 characters.");
  }

  const leadId = text(formData, "lead_id");
  if (!leadId) throw new Error("A team lead is required.");
  assertUuid(leadId, "team lead");

  const supabase = createServiceClient();
  await assertLeadExists(supabase, leadId);

  const { error } = await supabase.from("members").insert({
    email,
    full_name: fullName,
    lead_id: leadId,
  });

  if (error) {
    // 23505 = unique_violation on the case-insensitive email index.
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      throw new Error("A user with this email already exists.");
    }
    throw new Error(`Failed to add user: ${error.message}`);
  }

  revalidatePath("/users");
}

export async function reassignMember(
  memberId: string,
  leadId: string | null,
): Promise<void> {
  await requireAdmin();
  assertUuid(memberId, "user");
  if (leadId !== null) assertUuid(leadId, "team lead");

  const supabase = createServiceClient();
  if (leadId !== null) await assertLeadExists(supabase, leadId);

  const { error } = await supabase
    .from("members")
    .update({ lead_id: leadId })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to reassign user: ${error.message}`);
  }

  revalidatePath("/users");
}

export async function removeMember(memberId: string): Promise<void> {
  await requireAdmin();
  assertUuid(memberId, "user");

  const supabase = createServiceClient();
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) {
    throw new Error(`Failed to remove user: ${error.message}`);
  }

  revalidatePath("/users");
}
