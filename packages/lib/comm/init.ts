export type MailConfig = {
  resendApiKey: string;
  fromAddress?: string;
};

let mailConfig: MailConfig | undefined;

export const configureMail = (config: MailConfig | undefined) => {
  if (!config) {
    throw new Error("MailConfig is required");
  }

  if (!config.resendApiKey) {
    throw new Error("resendApiKey is required");
  }

  mailConfig = config;
};

export const getMailConfig = (): MailConfig => {
  if (!mailConfig) {
    throw new Error("Mail is not configured");
  }

  return mailConfig;
};

export const isMailEnabled = () => !!mailConfig;
