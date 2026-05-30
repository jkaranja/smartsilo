// import { env } from "cloudflare:workers";
// import {
//   RESOURCE_MIME_TYPE,
//   type McpUiAppResourceConfig,
//   type ReadResourceCallback,
// } from "@modelcontextprotocol/ext-apps/server";
// import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
// import { getMcpConfig } from "../../../config";
// import { logger } from "../util";

// interface ResourceView {
//   uri: string;
//   html: string;
//   _meta?: NonNullable<McpUiAppResourceConfig["_meta"]>;
// }

// export type ResourceExtra = Parameters<ReadResourceCallback>[1];

// type ResourceExecutor = (
//   uri: URL,
//   extra: ResourceExtra,
// ) => Promise<ResourceView> | ResourceView;

// interface ResourceDefinition {
//   name: string;
//   uri: string;
//   handler: (uri: URL, extra: ResourceExtra) => Promise<ReadResourceResult>;
// }

// const toErrorResult = (uri: string, message: string): ReadResourceResult => {
//   return {
//     contents: [
//       {
//         uri,
//         mimeType: "text/plain",
//         text: message,
//       },
//     ],
//   };
// };

// const isOpenAiClient = (extra: ResourceExtra): boolean => {
//   const ua = extra.requestInfo?.headers["user-agent"];
//   const uaStr = (Array.isArray(ua) ? ua[0] : ua)?.toLowerCase() ?? "";
//   return uaStr.includes("openai") || uaStr.includes("chatgpt");
// };

// const toResourceResult = (
//   view: ResourceView,
//   extra: ResourceExtra,
// ): ReadResourceResult => {
//   const domain = isOpenAiClient(extra) ? getMcpConfig().host : undefined;

//   return {
//     contents: [
//       {
//         uri: view.uri,
//         mimeType: RESOURCE_MIME_TYPE,
//         text: view.html,
//         _meta: {
//           ui: {
//             // domain format is host-dependent: The format and validation rules for this field are determined by each host. Servers MUST consult host-specific documentation for the expected domain format. Common patterns include: {hash}.claudemcpcontent.com (Claude), www-example-com.oaiusercontent.com (ChatGPT). If omitted, host uses default sandbox origin.
//             // for OpenAI, unique domain is required for app submission.
//             domain,
//             prefersBorder: false, // make it explicit
//             csp: {
//               resourceDomains: [
//                 "https://firebasestorage.googleapis.com",
//                 // 'https://*.mapbox.com',
//                 // 'https://events.mapbox.com',
//               ],
//             },
//           },
//           ...view._meta,
//         },
//       },
//     ],
//   };
// };

// export const resource = (
//   uri: string,
//   executor: ResourceExecutor,
// ): ResourceDefinition => {
//   return {
//     name: uri,
//     uri,
//     handler: async (_uri, extra) => {
//       try {
//         const view = await executor(_uri, extra);
//         return toResourceResult(view, extra);
//       } catch (error) {
//         const message =
//           error instanceof Error ? error.message : "Unknown error";

//         logger.error(`[resource:${_uri}]`, error);

//         return toErrorResult(_uri.toString(), message);
//       }
//     },
//   };
// };

// export const getHtml = async (assetPath: string) => {
//   const assetUrl = new URL(assetPath, getMcpConfig().host);
//   const res = await env.ASSETS.fetch(new Request(assetUrl.href));

//   return await res.text();
// };

export {}