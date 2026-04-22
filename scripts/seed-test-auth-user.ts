import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const TEST_EMAIL = "user@test.com";
const TEST_PASSWORD = "password";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed test credentials in production.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) {
    throw existing.error;
  }

  const existingUser = existing.data.users.find((user) => user.email?.toLowerCase() === TEST_EMAIL);

  let authUserId: string;

  if (existingUser) {
    const updated = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (updated.error) {
      throw updated.error;
    }

    authUserId = updated.data.user.id;
    console.log(`Updated existing auth user: ${TEST_EMAIL}`);
  } else {
    const created = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (created.error) {
      throw created.error;
    }

    authUserId = created.data.user.id;
    console.log(`Created auth user: ${TEST_EMAIL}`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("Skipped AppUser upsert (DATABASE_URL not set).");
    return;
  }

  const prisma = new PrismaClient();

  try {
    await prisma.appUser.upsert({
      where: { authUserId },
      update: {
        email: TEST_EMAIL,
        displayName: "Test User",
      },
      create: {
        authUserId,
        email: TEST_EMAIL,
        displayName: "Test User",
      },
    });

    console.log("Upserted AppUser record for test user.");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error("Failed to seed test user:", error);
    process.exitCode = 1;
  });
