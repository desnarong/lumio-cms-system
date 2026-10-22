import { describe, expect, it } from 'vitest';
import { formReturnPath } from './form-return';

const HOST = 'baandoi.lumio.app';

describe('formReturnPath', () => {
  it('returns the page the visitor came from', () => {
    expect(formReturnPath(`https://${HOST}/contact`, HOST)).toBe('/contact');
    expect(formReturnPath(`https://${HOST}/about?tab=team`, HOST)).toBe('/about?tab=team');
  });

  it('never leaves the site, so a crafted referer cannot redirect elsewhere', () => {
    expect(formReturnPath('https://evil.example.com/phish', HOST)).toBe('/');
    expect(formReturnPath('//evil.example.com', HOST)).toBe('/');
    expect(formReturnPath('not a url', HOST)).toBe('/');
  });

  it('falls back to the home page when there is no referer', () => {
    expect(formReturnPath(null, HOST)).toBe('/');
    expect(formReturnPath(undefined, HOST)).toBe('/');
  });
});
