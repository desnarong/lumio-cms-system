import { z } from 'zod';

/**
 * Agency / white-label branding (docs/PROGRESS.md "งานนอก MVP"). One deployment
 * can present itself under an agency's name instead of Lumio's: the name in the
 * back office, the logo shown in the sidebar, the support address printed on
 * error screens, and whether the "Lumio" footer is shown at all.
 *
 * It is platform-level data, not site data: the branding belongs to whoever runs
 * this installation, so the table intentionally has no `site_id`.
 */

export const AGENCY_ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const agencyBrandingSchema = z.object({
  /** Name printed in the sidebar and the browser tab. */
  brandName: z.string().trim().min(1).max(80),
  /** Logo shown above the menu; null falls back to the brand name only. */
  logoUrl: z.string().trim().url().max(2000).nullable(),
  /** Address printed on the help card; null hides it. */
  supportEmail: z.string().trim().email().max(200).nullable(),
  /** True keeps "Lumio" out of the back office footer. */
  hideBranding: z.boolean(),
  /** Accent colour used by the shell; null keeps the design-token default. */
  accentColor: z.string().trim().regex(AGENCY_ACCENT_PATTERN, 'สีต้องอยู่ในรูป #rrggbb').nullable(),
});
export type AgencyBranding = z.infer<typeof agencyBrandingSchema>;

export const agencyBrandingInputSchema = agencyBrandingSchema.partial();
export type AgencyBrandingInput = z.infer<typeof agencyBrandingInputSchema>;

/** Branding plus whether this deployment's licence allows white-labelling. */
export const agencyViewSchema = agencyBrandingSchema.extend({ licensed: z.boolean() });
export type AgencyView = z.infer<typeof agencyViewSchema>;

export const DEFAULT_AGENCY_BRANDING: AgencyBranding = {
  brandName: 'Lumio',
  logoUrl: null,
  supportEmail: null,
  hideBranding: false,
  accentColor: null,
};

/** The stored row merged over the defaults, ignoring empty strings. */
export const mergeAgencyBranding = (row: Partial<AgencyBranding> | null): AgencyBranding => {
  if (!row) return { ...DEFAULT_AGENCY_BRANDING };
  const pick = <K extends keyof AgencyBranding>(key: K, fallback: AgencyBranding[K]) =>
    row[key] === undefined ? fallback : (row[key] as AgencyBranding[K]);
  return {
    brandName:
      typeof row.brandName === 'string' && row.brandName.trim().length > 0
        ? row.brandName
        : DEFAULT_AGENCY_BRANDING.brandName,
    logoUrl: pick('logoUrl', DEFAULT_AGENCY_BRANDING.logoUrl),
    supportEmail: pick('supportEmail', DEFAULT_AGENCY_BRANDING.supportEmail),
    hideBranding: pick('hideBranding', DEFAULT_AGENCY_BRANDING.hideBranding),
    accentColor: pick('accentColor', DEFAULT_AGENCY_BRANDING.accentColor),
  };
};

/** The brand name a browser tab should show, never blank. */
export const brandNameOf = (branding: Pick<AgencyBranding, 'brandName'>): string => {
  const name = branding.brandName.trim();
  return name.length > 0 ? name : DEFAULT_AGENCY_BRANDING.brandName;
};
