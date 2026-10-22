import { Injectable, Logger } from '@nestjs/common';
import { DomainsService } from './domains.service';

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Automatic custom-domain verification (docs/design/03-scope.md "Custom Domain
 * + SSL อัตโนมัติ", 18-deployment.md 18.5).
 *
 * A customer adds the domain and changes DNS at their registrar; this timer
 * notices the new records without them coming back to press "ตรวจสอบอีกครั้ง".
 * Once the domain is active, Caddy's on-demand TLS issues the certificate on
 * the first request, so SSL is automatic too.
 */
@Injectable()
export class DomainsVerifier {
  private readonly logger = new Logger(DomainsVerifier.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly domains: DomainsService) {}

  start(intervalMs: number = FIVE_MINUTES): void {
    if (this.timer) return;
    void this.runDue().catch((error: unknown) => {
      this.logger.warn(`ตรวจโดเมนรอบแรกไม่สำเร็จ: ${String(error)}`);
    });
    this.timer = setInterval(() => {
      void this.runDue().catch((error: unknown) => {
        this.logger.warn(`ตรวจโดเมนอัตโนมัติไม่สำเร็จ: ${String(error)}`);
      });
    }, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Activates every pending domain whose DNS now points at the site. */
  async runDue(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const activated = await this.domains.autoVerify();
      if (activated > 0) {
        this.logger.log(`เปิดใช้งานโดเมนที่ชี้มาแล้ว ${activated} รายการ`);
      }
      return activated;
    } finally {
      this.running = false;
    }
  }
}
