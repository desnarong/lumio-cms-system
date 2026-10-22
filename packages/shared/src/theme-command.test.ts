import { describe, expect, it } from 'vitest';
import {
  applyThemeTokensPatch,
  DEFAULT_THEME_TOKENS,
  contrastRatio,
  readableInk,
} from './theme.js';
import {
  aiSiteCommandInputSchema,
  aiSiteCommandProposalSchema,
  themeCommandFromInstruction,
  themeCommandFromPatch,
} from './theme-command.js';

describe('themeCommandFromInstruction', () => {
  it('understands "make every button orange" as the main colour', () => {
    const command = themeCommandFromInstruction(
      'เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม',
      DEFAULT_THEME_TOKENS,
      'th',
    );

    expect(command).not.toBeNull();
    expect(command?.patch.colors?.primary).toMatch(/^#[0-9A-F]{6}$/);
    expect(command?.changes[0]?.field).toBe('colors.primary');
    expect(command?.changes[0]?.label).toBe('สีหลัก (ปุ่มและลิงก์)');
  });

  it('answers with English labels and keeps the text readable on the colour', () => {
    const command = themeCommandFromInstruction(
      'make every button orange',
      DEFAULT_THEME_TOKENS,
      'en',
    );
    const primary = command?.patch.colors?.primary;

    expect(command?.changes[0]?.label).toBe('Main color (buttons and links)');
    expect(primary).toBeTruthy();
    expect(contrastRatio(primary!, readableInk(primary!))).toBeGreaterThanOrEqual(4.5);
  });

  it('targets the accent when the sentence says so', () => {
    const command = themeCommandFromInstruction('เปลี่ยนสีไฮไลต์เป็นสีฟ้า', DEFAULT_THEME_TOKENS);
    expect(command?.patch.colors?.accent).toBe('#0284C7');
    expect(command?.patch.colors?.primary).toBeUndefined();
  });

  it('changes corners, spacing and colour mode too', () => {
    const command = themeCommandFromInstruction(
      'ทำมุมให้โค้งขึ้นและระยะห่างโปร่งขึ้น',
      DEFAULT_THEME_TOKENS,
    );

    expect(command?.patch.radius).toBe('lg');
    expect(command?.patch.density).toBe('spacious');
    expect(command?.changes.map((change) => change.field)).toContain('radius');
  });

  it('offers an inverse patch that puts every changed token back', () => {
    const command = themeCommandFromInstruction(
      'เปลี่ยนปุ่มเป็นสีเขียวและทำมุมกลม',
      DEFAULT_THEME_TOKENS,
    );
    expect(command).not.toBeNull();

    const next = applyThemeTokensPatch(DEFAULT_THEME_TOKENS, command!.patch);
    const undone = applyThemeTokensPatch(next, command!.inversePatch);

    expect(undone.colors.primary).toBe(DEFAULT_THEME_TOKENS.colors.primary);
    expect(undone.radius).toBe(DEFAULT_THEME_TOKENS.radius);
  });

  it('says nothing when the sentence has no usable instruction', () => {
    expect(themeCommandFromInstruction('สวัสดีตอนเช้า', DEFAULT_THEME_TOKENS)).toBeNull();
    expect(themeCommandFromInstruction('   ', DEFAULT_THEME_TOKENS)).toBeNull();
  });
});

describe('themeCommandFromPatch', () => {
  it('rejects invalid values instead of guessing', () => {
    expect(themeCommandFromPatch({ radius: 'huge' as never }, DEFAULT_THEME_TOKENS)).toBeNull();
  });

  it('accepts the legacy flat colour aliases', () => {
    const command = themeCommandFromPatch({ colorBrand: '#123456' }, DEFAULT_THEME_TOKENS);
    expect(command?.patch.colors?.primary).toBe('#123456');
  });
});

describe('site command contracts', () => {
  it('requires a sentence the assistant can read', () => {
    expect(aiSiteCommandInputSchema.safeParse({ instruction: 'hi' }).success).toBe(false);
    expect(
      aiSiteCommandInputSchema.safeParse({ instruction: 'เปลี่ยนปุ่มเป็นสีส้ม' }).success,
    ).toBe(true);
  });

  it('validates a proposal with its patch and inverse patch', () => {
    const command = themeCommandFromInstruction('เปลี่ยนปุ่มเป็นสีส้ม', DEFAULT_THEME_TOKENS)!;
    const parsed = aiSiteCommandProposalSchema.safeParse({
      id: 'p1',
      action: 'site-command',
      label: 'สั่งงานทั้งเว็บ',
      summary: 'ปรับสีและสไตล์ให้ทุกส่วนของเว็บพร้อมกัน',
      changes: command.changes,
      patch: command.patch,
      inversePatch: command.inversePatch,
      provider: 'local',
    });

    expect(parsed.success).toBe(true);
  });
});
