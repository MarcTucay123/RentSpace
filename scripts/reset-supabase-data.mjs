import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "kwsjfgfqxlhedqcnehup";
const EXECUTE_FLAG = "--execute=RESET-DORMMATE-DATA";
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const READ_RETRY_ATTEMPTS = 3;

const resetTables = [
  "messages",
  "notifications",
  "maintenance_attachments",
  "maintenance_requests",
  "payment_proofs",
  "payments",
  "rental_obligations",
  "tenant_assignments",
  "tenant_profiles",
  "bed_spaces",
  "rooms",
  "units",
  "properties",
];

const optionalTables = new Set(["properties"]);
const fullyClearedBuckets = ["payment-proofs", "maintenance-photos"];
const preservedRoles = new Set(["admin"]);

function formatSupabaseError(error) {
  if (!error) return "Unknown Supabase error";

  const fields = [
    ["message", error.message],
    ["code", error.code],
    ["details", error.details],
    ["hint", error.hint],
    ["status", error.status],
    ["statusCode", error.statusCode],
    ["name", error.name],
  ]
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${String(value)}`);

  if (fields.length) return fields.join("; ");

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Fall through to String(error).
  }

  return String(error) || "Unknown Supabase error";
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function isMissingOptionalTableError(table, error) {
  return optionalTables.has(table) && (error?.code === "PGRST205" || error?.code === "42P01");
}

async function retryRead(label, operation, { acceptError } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= READ_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const result = await operation();
      if (!result?.error) return result;
      if (acceptError?.(result.error)) return result;
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }

    if (attempt < READ_RETRY_ATTEMPTS) {
      console.warn(`Read attempt ${attempt}/${READ_RETRY_ATTEMPTS} failed for ${label}: ${formatSupabaseError(lastError)}. Retrying...`);
      await wait(attempt * 750);
    }
  }

  throw new Error(`${label}: ${formatSupabaseError(lastError)}`);
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const contents = readFileSync(envPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator < 1) continue;

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function projectRefFromUrl(url) {
  return new URL(url).hostname.split(".")[0];
}

function formatAccount(profile, authUser) {
  const name = profile
    ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ")
    : "No public profile";

  return `${profile?.role ?? "orphan"}: ${name} <${authUser?.email ?? profile?.email ?? "no email"}> (${profile?.id ?? authUser?.id})`;
}

async function getAllProfiles(supabase) {
  const profiles = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await retryRead("Unable to read profiles", () =>
      supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, email, role")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1),
    );
    profiles.push(...data);
    if (data.length < PAGE_SIZE) return profiles;
  }
}

async function getAllAuthUsers(supabase) {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data } = await retryRead("Unable to list Auth users", () =>
      supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE }),
    );

    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

async function countRows(supabase, table) {
  const { count, error } = await retryRead(
    `Unable to count ${table}`,
    () => supabase.from(table).select("*", { count: "exact", head: true }),
    { acceptError: (readError) => isMissingOptionalTableError(table, readError) },
  );

  if (error) {
    console.warn(`Optional table ${table} is unavailable and will be treated as empty: ${formatSupabaseError(error)}`);
    return 0;
  }

  return count ?? 0;
}

async function getResetTableCounts(supabase) {
  const entries = [];
  for (const table of resetTables) entries.push([table, await countRows(supabase, table)]);
  return Object.fromEntries(entries);
}

async function listBucketFiles(supabase, bucket, folder = "") {
  const files = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await retryRead(`Unable to list ${bucket}/${folder || "<root>"}`, () =>
      supabase.storage.from(bucket).list(folder, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    );

    for (const entry of data) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listBucketFiles(supabase, bucket, path)));
      } else {
        files.push(path);
      }
    }

    if (data.length < PAGE_SIZE) return files;
  }
}

async function getStoragePlan(supabase, preservedProfileIds) {
  const [paymentProofs, maintenancePhotos, profilePhotos] = await Promise.all([
    listBucketFiles(supabase, "payment-proofs"),
    listBucketFiles(supabase, "maintenance-photos"),
    listBucketFiles(supabase, "profile-photos"),
  ]);

  return {
    "payment-proofs": paymentProofs,
    "maintenance-photos": maintenancePhotos,
    "profile-photos": profilePhotos.filter((path) => !preservedProfileIds.has(path.split("/", 1)[0])),
  };
}

async function removeStorageFiles(supabase, bucket, paths) {
  for (let index = 0; index < paths.length; index += DELETE_BATCH_SIZE) {
    const batch = paths.slice(index, index + DELETE_BATCH_SIZE);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Unable to remove files from ${bucket}: ${formatSupabaseError(error)}`);
  }
}

async function clearTable(supabase, table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);
  if (isMissingOptionalTableError(table, error)) {
    console.warn(`Skipping unavailable optional table ${table}: ${formatSupabaseError(error)}`);
    return;
  }
  if (error) throw new Error(`Unable to clear ${table}: ${formatSupabaseError(error)}`);
}

async function verifyReset(supabase, preservedProfileIds) {
  const [profiles, authUsers, tableCounts, storagePlan] = await Promise.all([
    getAllProfiles(supabase),
    getAllAuthUsers(supabase),
    getResetTableCounts(supabase),
    getStoragePlan(supabase, preservedProfileIds),
  ]);

  const unexpectedProfiles = profiles.filter((profile) => !preservedRoles.has(profile.role));
  const unexpectedAuthUsers = authUsers.filter((user) => !preservedProfileIds.has(user.id));
  const unclearedTables = Object.entries(tableCounts).filter(([, count]) => count !== 0);
  const unclearedFiles = Object.entries(storagePlan).filter(([, paths]) => paths.length !== 0);

  if (unexpectedProfiles.length || unexpectedAuthUsers.length || unclearedTables.length || unclearedFiles.length) {
    throw new Error(
      [
        `Verification failed.`,
        `Unexpected profiles: ${unexpectedProfiles.length}.`,
        `Unexpected Auth users: ${unexpectedAuthUsers.length}.`,
        `Uncleared tables: ${unclearedTables.map(([table, count]) => `${table}=${count}`).join(", ") || "none"}.`,
        `Uncleared Storage files: ${unclearedFiles.map(([bucket, paths]) => `${bucket}=${paths.length}`).join(", ") || "none"}.`,
      ].join(" "),
    );
  }

  return { profiles, authUsers };
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const execute = process.argv.includes(EXECUTE_FLAG);

  if (!supabaseUrl) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  if (!secretKey) {
    throw new Error("Set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in .env.local or the current shell.");
  }

  const projectRef = projectRefFromUrl(supabaseUrl);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(`Refusing to use project ${projectRef}. Expected ${EXPECTED_PROJECT_REF}.`);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [profiles, authUsers, tableCounts] = await Promise.all([
    getAllProfiles(supabase),
    getAllAuthUsers(supabase),
    getResetTableCounts(supabase),
  ]);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  const preservedProfiles = profiles.filter((profile) => preservedRoles.has(profile.role));
  const preservedProfileIds = new Set(preservedProfiles.map((profile) => profile.id));
  const authUsersToDelete = authUsers.filter((user) => !preservedProfileIds.has(user.id));
  const profilesToDelete = profiles.filter((profile) => !preservedProfileIds.has(profile.id));
  const storagePlan = await getStoragePlan(supabase, preservedProfileIds);

  if (preservedProfiles.length === 0) {
    throw new Error("Refusing to reset because no admin profile was found to preserve.");
  }

  console.log(`\nSupabase project: ${projectRef}`);
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}\n`);

  console.log(`Accounts preserved (${preservedProfiles.length}):`);
  for (const profile of preservedProfiles) console.log(`  - ${formatAccount(profile, authUserById.get(profile.id))}`);

  console.log(`\nPublic profiles removed (${profilesToDelete.length}):`);
  for (const profile of profilesToDelete) console.log(`  - ${formatAccount(profile, authUserById.get(profile.id))}`);

  const orphanAuthUsers = authUsersToDelete.filter((user) => !profileById.has(user.id));
  if (orphanAuthUsers.length) {
    console.log(`\nOrphan Auth users removed (${orphanAuthUsers.length}):`);
    for (const user of orphanAuthUsers) console.log(`  - ${formatAccount(undefined, user)}`);
  }

  console.log("\nRows cleared:");
  for (const table of resetTables) console.log(`  - ${table}: ${tableCounts[table]}`);

  console.log("\nStorage files removed:");
  for (const [bucket, paths] of Object.entries(storagePlan)) console.log(`  - ${bucket}: ${paths.length}`);

  if (!execute) {
    console.log(`\nDry run only. Review the accounts and counts above.`);
    console.log(`To permanently execute: npm run db:reset-data -- ${EXECUTE_FLAG}\n`);
    return;
  }

  console.log("\nDeleting Storage files...");
  for (const bucket of [...fullyClearedBuckets, "profile-photos"]) {
    await removeStorageFiles(supabase, bucket, storagePlan[bucket]);
  }

  console.log("Clearing operational and history tables...");
  for (const table of resetTables) await clearTable(supabase, table);

  console.log(`Deleting ${authUsersToDelete.length} non-admin Auth account(s)...`);
  for (const user of authUsersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Unable to delete Auth user ${user.email ?? user.id}: ${formatSupabaseError(error)}`);
  }

  console.log("Verifying reset...");
  const verified = await verifyReset(supabase, preservedProfileIds);

  console.log(`\nReset complete. Preserved ${verified.profiles.length} profile(s) and ${verified.authUsers.length} Auth user(s).`);
  console.log("All operational/history tables are empty, all non-admin files are removed, and no non-admin Auth users remain.\n");
}

main().catch((error) => {
  console.error(`\nReset aborted: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
