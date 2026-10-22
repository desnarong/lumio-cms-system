import { Injectable, Logger } from '@nestjs/common';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Files such as an order receipt PDF. */
  attachments?: MailAttachment[];
}

const RESEND_API = 'https://api.resend.com/emails';

/**
 * Minimal transactional email sender (docs/design/03-scope.md, 05-admin-ia.md).
 * Uses Resend's REST API so there is no SDK to keep current, and when no key is
 * configured it logs the message instead: a missing mail provider must never
 * fail a checkout or lose an order.
 */
@Injectable()
export class Mailer {
  private readonly logger = new Logger(Mailer.name);

  configured(): boolean {
    return (process.env.RESEND_API_KEY ?? '').length > 0;
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.configured()) {
      this.logger.log(`อีเมล (โหมดบันทึก) ถึง ${message.to}: ${message.subject}`);
      return false;
    }

    try {
      const response = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'Lumio <no-reply@example.com>',
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.attachments?.length
            ? {
                attachments: message.attachments.map((file) => ({
                  filename: file.filename,
                  content: file.content.toString('base64'),
                })),
              }
            : {}),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        this.logger.warn(`ส่งอีเมลไม่สำเร็จ (สถานะ ${response.status}) ถึง ${message.to}`);
        return false;
      }
      return true;
    } catch (error) {
      // The order already exists; a failed email is reported, never thrown.
      this.logger.warn(`ส่งอีเมลไม่สำเร็จ: ${String(error)}`);
      return false;
    }
  }
}
