import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useMediaPicker, type MediaPickerApi, type PickedImage } from '@lumio/blocks';
import { MEDIA_MAX_UPLOAD_BYTES } from '@lumio/shared';
import { ToastProvider } from '@lumio/ui';
import { MediaLibraryProvider, toPickedImage } from './MediaLibraryProvider.js';
import { MediaLibraryPage } from './MediaLibraryPage.js';
import { createHttpMediaApi } from './api.js';

/** Stands in for a block panel that needs the media library. */
const PickerProbe = () => {
  const picker = useMediaPicker();
  return (
    <button type="button" disabled={!picker}>
      เลือกภาพ
    </button>
  );
};

const createApi = () => createHttpMediaApi({ baseUrl: '', fetchImpl: (async () => undefined) as never });

describe('MediaLibraryProvider', () => {
  it('gives block panels a working picker', () => {
    const html = renderToStaticMarkup(
      <MediaLibraryProvider api={createApi()}>
        <PickerProbe />
      </MediaLibraryProvider>,
    );

    expect(html).toContain('เลือกภาพ');
    expect(html).not.toContain('disabled');
  });

  it('keeps the library closed until a panel asks for an image', () => {
    const html = renderToStaticMarkup(
      <MediaLibraryProvider api={createApi()}>
        <span>เนื้อหาหน้า</span>
      </MediaLibraryProvider>,
    );

    expect(html).toContain('เนื้อหาหน้า');
    expect(html).not.toContain('เลือกจากคลังรูปภาพ');
  });

  it('exposes the pick contract block panels rely on', () => {
    let captured: MediaPickerApi | null = null;
    const Capture = () => {
      captured = useMediaPicker();
      return null;
    };

    renderToStaticMarkup(
      <MediaLibraryProvider api={createApi()}>
        <Capture />
      </MediaLibraryProvider>,
    );

    const picker = captured as MediaPickerApi | null;
    expect(picker).not.toBeNull();
    expect(picker?.pick({ aspect: 'square' })).toBeInstanceOf(Promise);
  });

  it('hands panels the ladder, the media id and the alt text', () => {
    const picked: PickedImage = toPickedImage({
      id: 'media-1',
      url: 'http://localhost:49100/media/site/a-1024.webp',
      srcSet: 'http://localhost:49100/media/site/a-480.webp 480w',
      avifSrcSet: 'http://localhost:49100/media/site/a-480.avif 480w',
      filename: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 2048,
      width: 1600,
      height: 900,
      alt: 'หน้าร้าน',
      folder: null,
      focalPoint: { x: 0.25, y: 0.75 },
      variants: [],
      status: 'ready',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    });

    expect(picked).toEqual({
      url: 'http://localhost:49100/media/site/a-1024.webp',
      mediaId: 'media-1',
      srcSet: 'http://localhost:49100/media/site/a-480.webp 480w',
      avifSrcSet: 'http://localhost:49100/media/site/a-480.avif 480w',
      width: 1600,
      height: 900,
      alt: 'หน้าร้าน',
      focalPoint: { x: 0.25, y: 0.75 },
    });
  });

  it('leaves alt out when the image has none, so panels keep their own text', () => {
    const picked: PickedImage = toPickedImage({
      id: 'media-2',
      url: '/media/a.webp',
      srcSet: null,
      filename: 'a.webp',
      mime: 'image/webp',
      sizeBytes: MEDIA_MAX_UPLOAD_BYTES,
      width: null,
      height: null,
      alt: null,
      folder: null,
      focalPoint: null,
      variants: [],
      status: 'ready',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    });

    expect(picked.alt).toBeUndefined();
    expect(picked.srcSet).toBeUndefined();
    expect(picked.width).toBeUndefined();
  });
});

describe('MediaLibraryPage', () => {
  it('renders the page header and the shared library body', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <MediaLibraryPage api={createApi()} />
      </ToastProvider>,
    );

    expect(html).toContain('รูปภาพ');
    expect(html).toContain('ค้นหารูป');
  });
});