'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicForm } from '@lumio/shared';

/**
 * Catalog of the site's contact forms, handed to block panels so the form block
 * can offer a picker. It lives on the client (the editor provides it); the public
 * page passes the same definitions straight to the block as a prop instead, which
 * keeps the public output free of JavaScript.
 */

const FormsCatalogContext = createContext<readonly PublicForm[]>([]);

export const FormsCatalogProvider = ({
  forms,
  children,
}: {
  forms: readonly PublicForm[];
  children: ReactNode;
}) => <FormsCatalogContext.Provider value={forms}>{children}</FormsCatalogContext.Provider>;

export const useFormsCatalog = (): readonly PublicForm[] => useContext(FormsCatalogContext);
