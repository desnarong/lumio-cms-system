import { Injectable, Logger } from '@nestjs/common';
import type { Form, FormSubmission } from '@lumio/shared';
import { EmailService } from '../email/email.service';

/**
 * Announces a new message (docs/design/03-scope.md "ฟอร์มติดต่อ + แจ้งเตือน
 * Email/LINE"). The site's own mailbox is used when the owner connected one;
 * otherwise the platform sender takes over, and with no mail configuration at
 * all the message is logged so nothing is lost.
 */
export interface FormNotifier {
  notify(siteId: string, form: Form, submission: FormSubmission): Promise<void>;
}

export const FORM_NOTIFIER = 'FORM_NOTIFIER';

const LINE_NOTIFY_URL = 'https://notify-api.line.me/api/notify';

const summarize = (submission: FormSubmission): string =>
  Object.entries(submission.data)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');

/** The visitor's address, when the form collected one, so the team can reply. */
const replyAddress = (submission: FormSubmission): string | undefined =>
  Object.values(submission.data).find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const detailText = (submission: FormSubmission): string =>
  Object.entries(submission.data)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');

@Injectable()
export class SiteFormNotifier implements FormNotifier {
  private readonly logger = new Logger(SiteFormNotifier.name);

  constructor(private readonly email: EmailService) {}

  async notify(siteId: string, form: Form, submission: FormSubmission): Promise<void> {
    this.logger.log(
      `ฟอร์ม "${form.name}" มีข้อความใหม่ (${submission.id}): ${summarize(submission)}`,
    );

    const recipients = await this.recipientsFor(siteId, form);
    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((to) =>
          this.email.sendForSite(siteId, {
            to,
            subject: `มีข้อความใหม่จากฟอร์ม "${form.name}"`,
            text: [
              `มีข้อความใหม่จากฟอร์ม "${form.name}" บนเว็บของคุณ`,
              '',
              detailText(submission),
              '',
              `เวลา: ${submission.createdAt}`,
            ].join('\n'),
            replyTo: replyAddress(submission),
          }),
        ),
      );
    }

    if (form.notify.lineToken) {
      await this.pushToLine(form, submission, form.notify.lineToken);
    }
  }

  /** Per-form recipients win; otherwise the site's default list applies. */
  private async recipientsFor(siteId: string, form: Form): Promise<string[]> {
    if (form.notify.emails.length > 0) return form.notify.emails;
    try {
      return await this.email.notifyEmails(siteId);
    } catch {
      return [];
    }
  }

  private async pushToLine(form: Form, submission: FormSubmission, token: string): Promise<void> {
    const message = [`มีข้อความใหม่จากฟอร์ม "${form.name}"`, summarize(submission)].join('\n');

    try {
      const response = await fetch(LINE_NOTIFY_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ message }),
      });
      if (!response.ok) {
        this.logger.warn(`ส่ง LINE Notify ไม่สำเร็จ (สถานะ ${response.status})`);
      }
    } catch (error) {
      // A failed notification must never lose the message the visitor sent.
      this.logger.warn(`ส่ง LINE Notify ไม่สำเร็จ: ${String(error)}`);
    }
  }
}
