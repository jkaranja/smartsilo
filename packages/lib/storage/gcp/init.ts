import { TRPCError } from "@trpc/server";

export interface GCPConfig {
  // credentials property names are defined in GCP service account JSON file
  credentials: {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    universe_domain: string;
  };
  storageBucket: string;
}

export const getGCPConfig = (): GCPConfig => {
  const config = process.env.GCP_CREDENTIALS;

  if (!config) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "GCP is not configured",
    });
  }

  return JSON.parse(config);
};
