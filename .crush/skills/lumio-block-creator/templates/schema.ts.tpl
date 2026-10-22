import { z } from "zod";

export const __NAME__Schema = z.object({
  version: z.literal(1),
  props: z.object({
    heading: z.string().default("__DEFAULT_HEADING__"),
    subheading: z.string().default("__DEFAULT_SUBHEADING__"),
    image: z
      .object({ mediaId: z.string(), alt: z.string() })
      .nullable()
      .default(null),
  }),
  style: z
    .object({
      paddingY: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
      visibility: z
        .object({ mobile: z.boolean(), tablet: z.boolean(), desktop: z.boolean() })
        .default({ mobile: true, tablet: true, desktop: true }),
      animation: z.enum(["none", "fade-up", "fade-in"]).default("fade-up"),
    })
    .default({}),
});

export type __NAME__Props = z.infer<typeof __NAME__Schema>;
