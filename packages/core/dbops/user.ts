import { jsonArrayFrom, type KyselyContext, DB } from "@saas/db";

export interface UserInclude {
  organizations?: boolean;
}

export interface UserQueryParams {
  kysely?: KyselyContext;
  id?: string;
  include?: UserInclude;
}

export const userQuery = ({
  kysely = DB.kysely,
  id,
  include,
}: UserQueryParams = {}) => {
  let query = kysely
    .with("user", (db) =>
      db
        .selectFrom("User")
        .selectAll("User")
        .$if(!!include?.organizations, (eb) =>
          eb.select((eb) =>
            jsonArrayFrom(
              eb
                .selectFrom("Organization")
                .selectAll("Organization")
                .innerJoin(
                  "OrganizationMembership",
                  "OrganizationMembership.organizationId",
                  "Organization.id",
                )
                .select("OrganizationMembership.role")
                .whereRef("OrganizationMembership.userId", "=", eb.ref("User.id")),
            ).as("organizations"),
          ),
        ),
    )
    .selectFrom("user")
    .selectAll();

  if (id) {
    query = query.where("user.id", "=", id);
  }

  return query;
};
