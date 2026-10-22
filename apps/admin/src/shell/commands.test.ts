import { describe, expect, it } from 'vitest';
import { createTranslator } from '@lumio/ui';
import {
  actionCommands,
  commandSections,
  contentCommands,
  navigationCommands,
  parseCommand,
} from './commands.js';

const th = createTranslator('th');
const en = createTranslator('en');

describe('navigationCommands', () => {
  it('offers the screens the role may open, with real paths', () => {
    const owner = navigationCommands('owner', th);
    expect(owner.map((item) => item.id)).toContain('nav:/settings/team');
    expect(owner.map((item) => item.label)).toContain('หน้าเว็บ');
  });

  it('never offers a screen the role cannot open', () => {
    const viewer = navigationCommands('viewer', th);
    expect(viewer.map((item) => item.id)).not.toContain('nav:/settings/team');
    expect(viewer.map((item) => item.id)).not.toContain('nav:/design/style');
  });
});

describe('actionCommands', () => {
  it('adds create, view and sign-out actions', () => {
    const ids = actionCommands({ t: th, publicUrl: 'https://baandoi.lumio.app' }).map((item) => item.id);
    expect(ids).toEqual(['action:new-page', 'action:new-post', 'action:view-site', 'action:sign-out']);
  });

  it('drops the create commands for read-only roles', () => {
    const ids = actionCommands({ t: th, canCreate: false }).map((item) => item.id);
    expect(ids).not.toContain('action:new-page');
    expect(ids).toContain('action:sign-out');
  });
});

describe('contentCommands', () => {
  it('opens the editor with a path hint', () => {
    const [command] = contentCommands([{ id: 'c1', title: 'บริการ', type: 'page', slug: 'services' }], th);
    expect(command).toMatchObject({ id: 'content:c1', group: 'content', hint: '/services' });
  });
});

describe('commandSections', () => {
  it('filters and groups commands for the palette', () => {
    const commands = [...navigationCommands('owner', th), ...actionCommands({ t: th })];
    const sections = commandSections(commands, 'ตั้งค่า', th);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.label).toBe('ไปที่');
    expect(sections[0]?.items.map((item) => item.id)).toContain('nav:/settings/general');
  });

  it('shows everything in order for an empty query', () => {
    const sections = commandSections(navigationCommands('owner', th), '', th);
    expect(sections[0]?.id).toBe('goto');
    expect(sections[0]?.items.length).toBeGreaterThan(0);
  });
});

describe('commandSections languages', () => {
  it('labels the sections and the commands in the chosen language', () => {
    const english = commandSections(navigationCommands('owner', en), '', en);
    const goTo = english.find((section) => section.id === 'goto');

    expect(goTo?.label).toBe('Go to');
    expect(goTo?.items.map((item) => item.label)).toContain('Pages');
  });

  it('finds a command by its own language', () => {
    const english = commandSections(navigationCommands('owner', en), 'settings', en);
    expect(english.flatMap((section) => section.items).map((item) => item.id)).toContain(
      'nav:/settings/general',
    );
  });
});

describe('parseCommand', () => {
  it('maps each command id back to its action', () => {
    expect(parseCommand('nav:/growth/seo')).toEqual({ kind: 'navigate', path: '/growth/seo' });
    expect(parseCommand('content:c1')).toEqual({ kind: 'open-content', contentId: 'c1' });
    expect(parseCommand('action:new-page')).toEqual({ kind: 'create', contentType: 'page' });
    expect(parseCommand('action:new-post')).toEqual({ kind: 'create', contentType: 'post' });
    expect(parseCommand('action:view-site')).toEqual({ kind: 'view-site' });
    expect(parseCommand('action:sign-out')).toEqual({ kind: 'sign-out' });
    expect(parseCommand('action:unknown')).toEqual({ kind: 'unknown' });
    expect(parseCommand('nope')).toEqual({ kind: 'unknown' });
  });
});
