import { Injectable, Logger } from '@nestjs/common';
import type { BusinessType, TemplateSummary } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { apiPublicUrl } from '../media/media.config';
import {
  loadTemplatePacks,
  packForBusinessType,
  resolveTemplatesDirectory,
  toTemplateSummary,
  type TemplatePack,
} from './template-store';

/**
 * Template packs are read from disk once and kept in memory: they ship with the
 * app and are never edited at runtime, so a request never touches the filesystem.
 */
@Injectable()
export class TemplatesService {
  private packs: TemplatePack[] | null = null;

  private all(): TemplatePack[] {
    if (this.packs) return this.packs;
    const dir = resolveTemplatesDirectory();
    this.packs = loadTemplatePacks(dir);
    Logger.log(`โหลดเทมเพลต ${this.packs.length} แบบจาก ${dir}`, 'Templates');
    return this.packs;
  }

  private summary(pack: TemplatePack): TemplateSummary {
    const summary = toTemplateSummary(pack);
    // Absolute, so the admin can use it in an <img> without knowing the API base.
    return { ...summary, previewUrl: `${apiPublicUrl()}${summary.previewUrl}` };
  }

  list(): TemplateSummary[] {
    return this.all().map((pack) => this.summary(pack));
  }

  /** Summary for one template id, as the admin's wizard reads it. */
  summaryById(templateId: string): TemplateSummary {
    return this.summary(this.byId(templateId));
  }

  /** The pack behind a template id, for `/design/template/:id/apply`. */
  byId(templateId: string): TemplatePack {
    const pack = this.all().find((candidate) => candidate.manifest.id === templateId);
    if (!pack) throw ApiException.notFound('ไม่พบเทมเพลตนี้');
    return pack;
  }

  byKey(key: string): TemplatePack {
    const pack = this.all().find((candidate) => candidate.key === key);
    if (!pack) throw ApiException.notFound('ไม่พบเทมเพลตนี้');
    return pack;
  }

  /** Template the wizard starts from when the user only picked a business type. */
  forBusinessType(businessType: BusinessType): TemplatePack {
    return packForBusinessType(this.all(), businessType);
  }
}