import { z } from 'zod';

/**
 * Turns an object schema into a PATCH schema: every key optional, and no key
 * filled in with its default when it is missing.
 *
 * zod 4 applies `.default()` inside an optional key, so a plain `.partial()`
 * would make `{ accountNumber }` come back with every other field reset to its
 * default and an update would overwrite stored values. Unwrapping the defaults
 * first keeps "omitted means unchanged".
 */
export const patchOf = <S extends z.ZodObject>(schema: S): ReturnType<S['partial']> => {
  const stripped: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(schema.shape) as [string, z.ZodType][]) {
    stripped[key] = field instanceof z.ZodDefault ? (field.unwrap() as z.ZodType) : field;
  }
  return schema.extend(stripped).partial() as unknown as ReturnType<S['partial']>;
};
