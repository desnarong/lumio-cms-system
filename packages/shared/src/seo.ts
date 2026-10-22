import type { Seo } from './content.js';

export interface PageSeoInput {
  title: string;
  siteName: string;
  description?: string;
  canonical?: string;
  /** `hreflang` map (locale → absolute URL) for multi-language pages (design 17.4). */
  languages?: Record<string, string>;
  ogImage?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

/**
 * The exact shape a public page exposes to crawlers and social networks
 * (docs/design/14-seo-performance.md 14.1). It is a plain object, so the same
 * value can be handed to Next.js `generateMetadata` and to a static publisher.
 */
export interface PageSeo {
  title: string;
  description?: string;
  alternates?: { canonical: string; languages?: Record<string, string> };
  robots?: { index: boolean; follow: boolean };
  openGraph: {
    title: string;
    description?: string;
    siteName: string;
    type: 'website' | 'article';
    images?: string[];
  };
  twitter: {
    card: 'summary_large_image';
    title: string;
    description?: string;
    images?: string[];
  };
}

/** Builds the meta/OG/Twitter payload every public page must expose. */
export const buildPageSeo = (input: PageSeoInput): PageSeo => {
  const images = input.ogImage ? [input.ogImage] : undefined;
  return {
    title: input.title,
    description: input.description,
    alternates: input.canonical
      ? {
          canonical: input.canonical,
          ...(input.languages && Object.keys(input.languages).length > 0
            ? { languages: input.languages }
            : {}),
        }
      : undefined,
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: input.title,
      description: input.description,
      siteName: input.siteName,
      type: input.type ?? 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images,
    },
  };
};

export interface ResolvePageSeoInput {
  /** Per-page overrides the editor saved (may be empty). */
  seo: Seo;
  /** Fallbacks coming from the content row and the site. */
  title: string;
  siteName: string;
  canonical: string;
  /** `hreflang` map for the page's other languages. */
  languages?: Record<string, string>;
  excerpt?: string | null;
  type?: 'website' | 'article';
}

/**
 * Fills every SEO gap automatically so the user never has to write meta tags:
 * an explicit `seo.title` wins, otherwise the page title is composed with the
 * site name; description falls back to the excerpt; `noindex` becomes `robots`.
 */
export const resolvePageSeo = (input: ResolvePageSeoInput): PageSeoInput => ({
  title: input.seo.title ?? `${input.title} — ${input.siteName}`,
  siteName: input.siteName,
  description: input.seo.description ?? input.excerpt ?? undefined,
  canonical: input.canonical,
  languages: input.languages,
  ogImage: input.seo.ogImage,
  type: input.type ?? 'website',
  noindex: input.seo.noindex,
});

export type JsonLd = Record<string, unknown>;

export interface JsonLdSite {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export interface JsonLdContent {
  type: 'page' | 'post';
  title: string;
  description?: string;
  url: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface JsonLdBlock {
  type: string;
  props: Record<string, unknown>;
}

export interface JsonLdContext {
  site: JsonLdSite;
  content: JsonLdContent;
  /** Stored blocks; structured data is derived from them, never typed by the user. */
  blocks?: JsonLdBlock[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/** Reads `props.items` of an FAQ block into schema.org questions. */
const faqEntities = (blocks: JsonLdBlock[]): JsonLd[] => {
  for (const block of blocks) {
    if (block.type !== 'faq') continue;
    const items = asRecord(block.props).items;
    if (!Array.isArray(items)) continue;
    const entities: JsonLd[] = [];
    for (const item of items) {
      const record = asRecord(item);
      const question = asString(record.question);
      const answer = asString(record.answer);
      if (!question || !answer) continue;
      entities.push({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      });
    }
    if (entities.length > 0) return entities;
  }
  return [];
};

/** Reads the first contact block that carries an address into LocalBusiness data. */
const localBusiness = (blocks: JsonLdBlock[]): JsonLd | null => {
  for (const block of blocks) {
    if (block.type !== 'contact' && block.type !== 'local-business') continue;
    const props = asRecord(block.props);
    const address = asString(props.address);
    const telephone = asString(props.phone);
    const url = asString(props.website);
    if (!address && !telephone) continue;
    return {
      '@type': 'LocalBusiness',
      ...(address ? { address } : {}),
      ...(telephone ? { telephone } : {}),
      ...(url ? { url } : {}),
    };
  }
  return null;
};

/**
 * Generates JSON-LD from the site, the page and its blocks
 * (docs/design/14-seo-performance.md 14.4). Callers render the result as a
 * `<script type="application/ld+json">` tag; nothing here needs a browser.
 */
export const buildJsonLd = (ctx: JsonLdContext): JsonLd[] => {
  const { site, content } = ctx;
  const graph: JsonLd[] = [
    {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      ...(site.logo ? { logo: site.logo } : {}),
      ...(site.description ? { description: site.description } : {}),
    },
    {
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
    },
  ];

  if (content.type === 'post') {
    graph.push({
      '@type': 'Article',
      headline: content.title,
      mainEntityOfPage: content.url,
      ...(content.description ? { description: content.description } : {}),
      ...(content.publishedAt ? { datePublished: content.publishedAt } : {}),
      ...(content.updatedAt ? { dateModified: content.updatedAt } : {}),
      publisher: { '@type': 'Organization', name: site.name, url: site.url },
    });
  }

  const faq = faqEntities(ctx.blocks ?? []);
  if (faq.length > 0) {
    graph.push({ '@type': 'FAQPage', mainEntity: faq });
  }

  const business = localBusiness(ctx.blocks ?? []);
  if (business) {
    graph.push({ name: site.name, url: site.url, ...business });
  }

  return graph.map((node) => ({ '@context': 'https://schema.org', ...node }));
};
