/**
 * JSON-LD goes into a `<script>` tag, so `<` is escaped to keep the markup from
 * being closed early (docs/design/14-seo-performance.md 14.4).
 */
export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');

export interface JsonLdProps {
  data: unknown;
}

export const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
  />
);
