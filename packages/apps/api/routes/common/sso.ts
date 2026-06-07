import { Elysia, t } from "elysia";
import { requirePermission, getAuth } from "@saas/auth";
import { authPlugin } from "../../server/auth-plugin";

export const ssoRouter = new Elysia({ name: "sso-router" })
  .use(authPlugin)

  .get(
    "/settings/sso",
    async ({ user, request }) => {
      if (!user?.organizations?.length) throw new Error("No organization found");
      const org = user.organizations[0]!;
      requirePermission(org.role.toLowerCase() as any, "settings:read");

      const result = await getAuth().api.getSSOProvider({
        headers: request.headers,
        query: { organizationId: org.id },
      });

      return result ?? null;
    },
    { auth: true },
  )

  .post(
    "/settings/sso",
    async ({ body, user, request }) => {
      if (!user?.organizations?.length) throw new Error("No organization found");
      const org = user.organizations[0]!;
      requirePermission(org.role.toLowerCase() as any, "settings:manage");

      return getAuth().api.registerSSOProvider({
        headers: request.headers,
        body: {
          providerId: `org-${org.id}`,
          issuer: body.issuer,
          domain: body.domain,
          oidcConfig: {
            clientId: body.clientId,
            clientSecret: body.clientSecret,
          },
          organizationId: org.id,
        },
      });
    },
    {
      auth: true,
      body: t.Object({
        issuer: t.String(),
        domain: t.String(),
        clientId: t.String(),
        clientSecret: t.String(),
      }),
    },
  )

  .delete(
    "/settings/sso",
    async ({ user, request }) => {
      if (!user?.organizations?.length) throw new Error("No organization found");
      const org = user.organizations[0]!;
      requirePermission(org.role.toLowerCase() as any, "settings:manage");

      await getAuth().api.deleteSSOProvider({
        headers: request.headers,
        query: { providerId: `org-${org.id}` },
      });

      return { message: "SSO provider removed" };
    },
    { auth: true },
  );
