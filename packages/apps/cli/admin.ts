import { createAuth } from "../admin/src/lib/server/create-auth";

function getAuth() {
  if (!process.env.CONFIG) {
    throw new Error("CONFIG is not set");
  }

  const config = JSON.parse(process.env.CONFIG);

  return createAuth({
    databaseUrl: config.adminDatabaseUrl,
    secret: config.betterAuth.adminSecret,
    host: config.host,
  });
}

export const addAdmin = async (args: string[]) => {
  const [email, password, name] = args;

  if (!email || !password || !name) {
    console.error("Usage: create-user <email> <password> <name>");
    process.exit(1);
  }

  const auth = getAuth();

  await auth.api.signUpEmail({ body: { email, password, name } });

  console.log(`Created user: ${email}`);
};
