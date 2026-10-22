import sharp from 'sharp';
import { mediaMaxInputPixels } from './media.config';

/** Small enough to read in a blink, big enough to keep the logo's colours. */
const SAMPLE_SIZE = 64;

export interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decodes a stored image into plain RGBA pixels for the palette maths
 * (`extractBrandPalette`). The image is scaled down first: colour shares do not
 * change, and a 64×64 decode is cheap next to a full-size logo.
 */
export const readRgbaPixels = async (buffer: Buffer): Promise<RgbaImage> => {
  const { data, info } = await sharp(buffer, {
    animated: false,
    limitInputPixels: mediaMaxInputPixels(),
  })
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
