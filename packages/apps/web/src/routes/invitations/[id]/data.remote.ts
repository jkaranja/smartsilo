import { query, command, getRequestEvent } from "$app/server";
import { api } from "$lib/server/api";
import * as v from "valibot";

export const getInvitation = query(async () => {
  const { params } = getRequestEvent();

  const { data, error } = await api.invitations[params.id as string].get();

  if (error) throw new Error("error" in error ? error.error : "Not found");

  return data;
});

const AcceptSchema = v.object({
  name: v.string(),
  password: v.pipe(v.string(), v.minLength(8)),
});

export const acceptInvitation = command(AcceptSchema, async (input) => {
  const { params } = getRequestEvent();

  const { data, error } =
    await api.invitations[params.id as string].accept.post(input);

  if (error)
    throw new Error("error" in error ? error.error : "Failed to accept");

  return data;
});

export const declineInvitation = command(v.object({}), async () => {
  const { params } = getRequestEvent();

  const { error } = await api.invitations[params.id as string].decline.post({});

  if (error)
    throw new Error("error" in error ? error.error : "Failed to decline");
});
