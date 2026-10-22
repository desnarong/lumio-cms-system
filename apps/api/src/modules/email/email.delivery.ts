import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

/**
 * Sends one message through the provider the site's owner configured
 * (docs/design/03-scope.md "ฟอร์มติดต่อ + แจ้งเตือน Email"). Kept as a plain
 * function so both the live service and the tests exercise the exact same
 * request building without booting Nest.
 */

export interface OutgoingAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  /** Set when the visitor left an address, so the team can answer directly. */
  replyTo?: string;
  /** PDFs and other files the message carries, e.g. an order receipt. */
  attachments?: OutgoingAttachment[];
}

export interface SmtpDeliveryConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface ResendDeliveryConfig {
  apiKey: string;
}

export interface EmailDeliveryConfig {
  provider: 'smtp' | 'resend';
  fromName: string;
  fromEmail: string;
  smtp?: SmtpDeliveryConfig;
  resend?: ResendDeliveryConfig;
}

export type SmtpTransportFactory = (config: SmtpDeliveryConfig) => Pick<Transporter, 'sendMail'>;

export interface DeliveryDeps {
  fetchImpl?: typeof fetch;
  smtpTransport?: SmtpTransportFactory;
  timeoutMs?: number;
}

export interface DeliveryResult {
  sent: boolean;
  /** Human wording for the settings screen; never contains a secret. */
  error: string | null;
}

const RESEND_API = 'https://api.resend.com/emails';

/** Header-safe display name; quotes and angle brackets would break the address. */
export const displayFrom = (name: string, email: string): string => {
  const clean = name.replace(/[\r\n"<>]/g, ' ').trim();
  return clean.length > 0 ? `${clean} <${email}>` : email;
};

const smtpTransport: SmtpTransportFactory = (config) =>
  nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });

const failure = (error: string): DeliveryResult => ({ sent: false, error });

export const deliverEmail = async (
  config: EmailDeliveryConfig,
  message: OutgoingEmail,
  deps: DeliveryDeps = {},
): Promise<DeliveryResult> => {
  if (config.provider === 'smtp') {
    const smtp = config.smtp;
    if (!smtp || smtp.password.length === 0) {
      return failure('ยังไม่ได้ตั้งค่ารหัสผ่านอีเมล');
    }

    try {
      const transport = (deps.smtpTransport ?? smtpTransport)(smtp);
      const mail: SendMailOptions = {
        from: displayFrom(config.fromName, config.fromEmail),
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((file) => ({
                filename: file.filename,
                content: file.content,
                ...(file.contentType ? { contentType: file.contentType } : {}),
              })),
            }
          : {}),
      };
      await transport.sendMail(mail);
      return { sent: true, error: null };
    } catch (error) {
      // Never leak the password or the server's full response into the UI.
      const reason = error instanceof Error ? error.message : String(error);
      return failure(reason.length > 0 ? `ส่งอีเมลไม่สำเร็จ: ${reason.slice(0, 200)}` : 'ส่งอีเมลไม่สำเร็จ');
    }
  }

  const key = config.resend?.apiKey ?? '';
  if (key.length === 0) return failure('ยังไม่ได้ตั้งค่าคีย์ Resend');

  try {
    const response = await (deps.fetchImpl ?? fetch)(RESEND_API, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: displayFrom(config.fromName, config.fromEmail),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((file) => ({
                filename: file.filename,
                content: file.content.toString('base64'),
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 8_000),
    });
    if (!response.ok) {
      return failure(`ส่งอีเมลไม่สำเร็จ (ผู้ให้บริการตอบ ${response.status})`);
    }
    return { sent: true, error: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failure(`ส่งอีเมลไม่สำเร็จ: ${reason.slice(0, 200)}`);
  }
};
