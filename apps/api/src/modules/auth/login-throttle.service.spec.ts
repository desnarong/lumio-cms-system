import { describe, expect, it } from 'vitest';
import { MemoryRateLimitStore } from '../../common/rate-limit.store';
import { LOGIN_MAX_FAILURES, LoginThrottleService } from './login-throttle.service';

describe('LoginThrottleService', () => {
  it('locks the account after the configured number of failures', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());

    for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
      await expect(throttle.registerAttempt('user@example.com')).resolves.toBeUndefined();
    }

    await expect(throttle.registerAttempt('user@example.com')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });

  it('clears the counter after a successful login', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());
    await throttle.registerAttempt('user@example.com');
    await throttle.registerAttempt('user@example.com');

    await throttle.reset('user@example.com');

    await expect(throttle.registerAttempt('user@example.com')).resolves.toBeUndefined();
  });

  it('counts the account case-insensitively', async () => {
    const throttle = new LoginThrottleService(new MemoryRateLimitStore());
    for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
      await throttle.registerAttempt('User@Example.Com');
    }

    await expect(throttle.registerAttempt('user@example.com')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });
});
