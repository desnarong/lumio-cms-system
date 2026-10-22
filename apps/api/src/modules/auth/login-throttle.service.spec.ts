import { describe, expect, it } from 'vitest';
import { MemoryRateLimitStore } from '../../common/rate-limit.store';
import { LOGIN_MAX_FAILURES, LoginThrottleService } from './login-throttle.service';

describe('LoginThrottleService', () => {
  it('locks the account after the configured number of failures', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());

    for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
      await expect(throttle.registerAttempt('user@lumio.app')).resolves.toBeUndefined();
    }

    await expect(throttle.registerAttempt('user@lumio.app')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });

  it('clears the counter after a successful login', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());
    await throttle.registerAttempt('user@lumio.app');
    await throttle.registerAttempt('user@lumio.app');

    await throttle.reset('user@lumio.app');

    await expect(throttle.registerAttempt('user@lumio.app')).resolves.toBeUndefined();
  });

  it('counts the account case-insensitively', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());
    for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
      await throttle.registerAttempt('User@Lumio.app');
    }

    await expect(throttle.registerAttempt('user@lumio.app')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });
});
