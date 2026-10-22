/** Cursor-paginated list result, wrapped by the response envelope's `meta`. */
export interface Page<T> {
  items: T[];
  cursor: string | null;
}
