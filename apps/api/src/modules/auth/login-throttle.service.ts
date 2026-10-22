import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../../common/api-error';
import { RATE_LIMIT_STORE } from '../../common/rate-limit.module';
import type { RateLimitStore } from '../../common/rate-limit.store';

/** Consecutive failures allowed before the account is locked. */
export const LOGIN_MAX_FAILURES = 5;
/** How long the lock and the failure counter last. */
export const LOGIN_LOCKOUT_MS = 15 * 60_000;

const throttleKey = (email: string): string => `login:fail:${email.trim().toLowerCase()}`;

/**
 * Temporary account lockout after repeated failed logins
 * (docs/design/15-security.md 15.1). The counter lives in the shared rate limit
 * store, so it works across API instances. Platform-level auth events are not
 * written to `audit_logs` (that table is site-scoped under RLS); they go to the
 * application log, which production ships to the log collector.
 */
@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger('LoginThrottle');

  constructor(@Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore) {}

  /**
   * Counts one attempt for the account and refuses it once too many have
   * failed. Called before the password is checked, so a locked account is
   * rejected without touching the database.
   */
  async registerAttempt(email: string): Promise<void> {
    const { count } = await this.store.hit(throttleKey(email), LOGIN_LOCKOUT_MS);
    if (count > LOGIN_MAX_FAILURES) {
      this.logger.warn(
        `ล็อกการเข้าสู่ระบบชั่วคราวหลังล้มเหลว ${LOGIN_MAX_FAILURES} ครั้ง: ${email}`,
      );
      throw ApiException.rateLimited('บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ในอีก 15 นาที');
    }
  }

  /** Clears the failure counter after a successful login. */
  async reset(email: string): Promise<void> {
    await this.store.reset(throttleKey(email));
  }
}
