import { slugify, type ContentType } from '@lumio/shared';

/**
 * Link name the create dialog starts with. A Thai title has no latin characters
 * to transliterate, so it gets a short unique suffix instead of an empty slug
 * that would leave "สร้างแล้วเริ่มแก้" disabled forever.
 */
export const suggestSlug = (
  title: string,
  kind: ContentType,
  now: number = Date.now(),
): string => {
  const latin = slugify(title, '');
  return latin.length > 0 ? latin : `${kind}-${now.toString(36)}`;
};
