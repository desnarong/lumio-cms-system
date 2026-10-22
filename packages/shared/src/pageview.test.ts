import { describe, expect, it } from 'vitest';
import {
  deviceFromUserAgent,
  normalizeTrackingPath,
  normalizeTrackingReferrer,
  pageviewInputSchema,
} from './index.js';

describe('normalizeTrackingPath', () => {
  it('keeps a site-relative path', () => {
    expect(normalizeTrackingPath('/services')).toBe('/services');
  });

  it('drops the origin, query and hash', () => {
    expect(normalizeTrackingPath('https://baandoi.example.com/services?utm=1#top')).toBe('/services');
  });

  it('adds a leading slash and collapses repeats', () => {
    expect(normalizeTrackingPath('menu//coffee')).toBe('/menu/coffee');
  });

  it('falls back to the home page for an empty value', () => {
    expect(normalizeTrackingPath('')).toBe('/');
  });
});

describe('normalizeTrackingReferrer', () => {
  it('keeps a usable referrer and drops blanks', () => {
    expect(normalizeTrackingReferrer('https://google.com')).toBe('https://google.com');
    expect(normalizeTrackingReferrer('   ')).toBeUndefined();
    expect(normalizeTrackingReferrer(undefined)).toBeUndefined();
  });
});

describe('deviceFromUserAgent', () => {
  it('separates phones, tablets and desktops', () => {
    expect(deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
    expect(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
    expect(deviceFromUserAgent('Mozilla/5.0 (Android 14; Tablet)')).toBe('tablet');
    expect(deviceFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')).toBe('desktop');
    expect(deviceFromUserAgent(undefined)).toBe('desktop');
  });
});

describe('pageviewInputSchema', () => {
  it('requires a path and accepts an optional visitor id', () => {
    expect(pageviewInputSchema.safeParse({ path: '/' }).success).toBe(true);
    expect(pageviewInputSchema.safeParse({ path: '/', visitorId: 'v1' }).success).toBe(true);
    expect(pageviewInputSchema.safeParse({ path: '' }).success).toBe(false);
  });
});
