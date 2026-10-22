'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface PickedImage {
  url: string;
  alt?: string;
  /** Media id in the library, so panels can re-open the same file later. */
  mediaId?: string;
  /** Ready-to-use `srcset` from the media pipeline, when it has run. */
  srcSet?: string;
  /** AVIF ladder for `<picture>`, when the pipeline rendered one. */
  avifSrcSet?: string;
  /** Keeps the subject in frame when the block crops the image. */
  focalPoint?: { x: number; y: number };
  width?: number;
  height?: number;
}

export interface MediaPickerApi {
  /** Opens the media library and resolves with the chosen image, or `null` if cancelled. */
  pick: (options?: { aspect?: 'square' | 'wide' }) => Promise<PickedImage | null>;
}

const MediaPickerContext = createContext<MediaPickerApi | null>(null);

/**
 * Lets block panels open the media library without importing it. The editor (or
 * an App) provides the picker; on the public site nothing is provided, so the
 * picker button stays disabled and no library code is pulled into the page.
 */
export const MediaPickerProvider = ({
  api,
  children,
}: {
  api: MediaPickerApi | null;
  children: ReactNode;
}) => <MediaPickerContext.Provider value={api}>{children}</MediaPickerContext.Provider>;

export const useMediaPicker = (): MediaPickerApi | null => useContext(MediaPickerContext);
