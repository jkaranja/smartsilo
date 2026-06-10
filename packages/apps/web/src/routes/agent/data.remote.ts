import { query, getRequestEvent } from "$app/server";
import { api } from "$lib/server/api";

export const getThreads = query(async () => {
  const { request } = getRequestEvent();

  const { data = [] } = await api.threads.get({
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  return data;
});
