import { describe, expect, it } from 'vitest';
import { createDemoSettingsApi } from './demo.js';

describe('createDemoSettingsApi', () => {
  it('renames the site and updates the free address', async () => {
    const api = createDemoSettingsApi();

    const updated = await api.updateSite({ name: 'ร้านกาแฟใหม่', subdomain: 'newcafe' });

    expect(updated.name).toBe('ร้านกาแฟใหม่');
    expect((await api.getSite()).subdomain).toBe('newcafe');
  });

  it('points new domains at the free address and keeps them pending', async () => {
    const api = createDemoSettingsApi();

    const list = await api.listDomains();
    expect(list.cnameTarget).toBe('baandoi.lumio.app');

    const created = await api.addDomain({ hostname: 'baandoi.com', isPrimary: false });
    expect(created.sslStatus).toBe('pending');

    const verified = await api.verifyDomain(created.id);
    expect(verified.verified).toBe(false);
  });

  it('refuses a duplicate domain', async () => {
    const api = createDemoSettingsApi();
    await api.addDomain({ hostname: 'baandoi.com', isPrimary: false });

    await expect(
      api.addDomain({ hostname: 'baandoi.com', isPrimary: false }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('invites, re-roles and removes a teammate', async () => {
    const api = createDemoSettingsApi();
    const before = (await api.listMembers()).length;

    const invited = await api.inviteMember({ email: 'new@lumio.app', role: 'author' });
    expect((await api.listMembers()).length).toBe(before + 1);

    const updated = await api.updateMemberRole(invited.userId, { role: 'admin' });
    expect(updated.role).toBe('admin');

    await api.removeMember(invited.userId);
    expect((await api.listMembers()).length).toBe(before);
  });

  it('reports a missing teammate', async () => {
    await expect(
      createDemoSettingsApi().updateMemberRole('nobody', { role: 'admin' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
