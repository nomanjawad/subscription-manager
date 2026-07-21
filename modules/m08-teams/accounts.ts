// m08-teams — GoTrue admin API helpers (server-only, service key).
// Team lead auth accounts live in auth.users; role + team_id are stored in
// app_metadata so middleware/page guards can resolve them from the JWT without
// a DB round-trip. Every call here uses the service role key — never expose
// these to the client.

function adminBase(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }
  return { url: `${url}/auth/v1/admin/users`, key };
}

function adminHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** Best-effort extraction of GoTrue's error message from a failed response. */
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      msg?: string;
      message?: string;
      error_description?: string;
      error?: string;
    };
    return (
      body.msg ??
      body.message ??
      body.error_description ??
      body.error ??
      `Request failed (${res.status}).`
    );
  } catch {
    return `Request failed (${res.status}).`;
  }
}

interface CreateAccountArgs {
  email: string;
  fullName: string | null;
  password: string;
  teamId: string;
}

/**
 * Create a team-lead auth account. Returns the new user's id.
 * Duplicate emails surface as a clean, user-facing message.
 */
export async function createTeamLeadAccount({
  email,
  fullName,
  password,
  teamId,
}: CreateAccountArgs): Promise<string> {
  const { url, key } = adminBase();
  const res = await fetch(url, {
    method: "POST",
    headers: adminHeaders(key),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "team_lead", team_id: teamId },
      user_metadata: { full_name: fullName },
    }),
  });

  if (!res.ok) {
    const message = await readError(res);
    if (res.status === 422 || /already been registered/i.test(message)) {
      throw new Error("A user with this email already exists.");
    }
    throw new Error(`Failed to create account: ${message}`);
  }

  const user = (await res.json()) as { id?: string };
  if (!user.id) {
    throw new Error("Failed to create account: no user id returned.");
  }
  return user.id;
}

/**
 * Update a team lead's app_metadata team assignment (Supabase merges
 * app_metadata, so re-sending role alongside team_id is safe). Pass teamId
 * null to detach the lead from any team.
 */
export async function updateTeamLeadAccount(
  userId: string,
  { teamId }: { teamId: string | null },
): Promise<void> {
  const { url, key } = adminBase();
  const res = await fetch(`${url}/${userId}`, {
    method: "PUT",
    headers: adminHeaders(key),
    body: JSON.stringify({
      app_metadata: { role: "team_lead", team_id: teamId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update account: ${await readError(res)}`);
  }
}

/** Delete a team lead's auth account. 404 is treated as success (idempotent). */
export async function deleteTeamLeadAccount(userId: string): Promise<void> {
  const { url, key } = adminBase();
  const res = await fetch(`${url}/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(key),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete account: ${await readError(res)}`);
  }
}
