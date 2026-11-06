import { ImageResponse } from 'next/og';
import { literalColors } from '@lumio/tokens';

export const runtime = 'nodejs';

const SIZE = { width: 1200, height: 630 };

/** Satori cannot read CSS variables, so the share image uses literal tokens. */
const COLORS = {
  background: literalColors.ogBackground,
  ink: literalColors.ogInk,
  muted: literalColors.ogMuted,
  accent: literalColors.ogAccent,
};

export const GET = async (request: Request): Promise<ImageResponse> => {
  const url = new URL(request.url);
  const title = (url.searchParams.get('title') ?? '').trim().slice(0, 120) || 'Lumio';
  const site = (url.searchParams.get('site') ?? '').trim().slice(0, 60);

  const font = await fetch(new URL('/fonts/NotoSansThai.ttf', url.origin)).then((response) =>
    response.arrayBuffer(),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: COLORS.background,
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 14, height: 56, background: COLORS.accent, borderRadius: 7 }} />
          <div style={{ fontSize: 34, color: COLORS.muted }}>{site}</div>
        </div>
        <div
          style={{
            fontSize: title.length > 70 ? 62 : 76,
            lineHeight: 1.25,
            color: COLORS.ink,
            fontWeight: 700,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: COLORS.muted }}>Lumio</div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [{ name: 'Noto Sans Thai', data: font, style: 'normal', weight: 700 }],
      headers: { 'cache-control': 'public, max-age=86400, immutable' },
    },
  );
};
