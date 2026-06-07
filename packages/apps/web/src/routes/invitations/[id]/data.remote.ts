import { query, command, getRequestEvent } from "$app/server";
import { api } from "$lib/server/api";
import * as v from "valibot";

export const getInvitation = query(async () => {
  const { params } = getRequestEvent();
  const { data } = await api.invitations({ id: params.id as string }).get();

  if (!data) throw new Error("Invitation not found");

  return data;
});

const AcceptSchema = v.object({
  name: v.string(),
  password: v.pipe(v.string(), v.minLength(8)),
});

export const acceptInvitation = command(AcceptSchema, async (input) => {
  const { params } = getRequestEvent();
  const { data } = await api
    .invitations({ id: params.id as string })
    .accept.post(input);

  return data;
});

export const declineInvitation = command(v.object({}), async () => {
  const { params } = getRequestEvent();
  await api.invitations({ id: params.id as string }).decline.post({});
});
