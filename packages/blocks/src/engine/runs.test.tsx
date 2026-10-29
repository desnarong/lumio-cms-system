import { describe, expect, it } from 'vitest';
import { applyTextRun, normalizeRuns, textSegments } from './runs.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { Editable } from './editable.js';

describe('text runs', () => {
  it('splits text into plain and styled segments', () => {
    const segments = textSegments('Light That Feel', [
      { start: 0, end: 5, color: 'accent', size: 'lg' },
    ]);
    expect(segments[0]).toEqual({
      text: 'Light',
      run: { start: 0, end: 5, color: 'accent', size: 'lg' },
    });
    expect(segments[1]?.text).toBe(' That Feel');
    expect(segments[1]?.run).toBeNull();
  });

  it('cuts existing runs at the selection edges when a patch is applied', () => {
    const runs = applyTextRun(
      [{ start: 0, end: 10, color: 'muted' }],
      3,
      6,
      { size: 'xl' },
      10,
    );
    expect(runs).toEqual([
      { start: 0, end: 3, color: 'muted' },
      { start: 3, end: 6, size: 'xl' },
      { start: 6, end: 10, color: 'muted' },
    ]);
  });

  it('merges neighbours with the same style and drops out-of-range runs', () => {
    expect(
      normalizeRuns(
        [
          { start: 0, end: 2, color: 'primary' },
          { start: 2, end: 4, color: 'primary' },
          { start: 8, end: 20, color: 'accent' },
        ],
        10,
      ),
    ).toEqual([
      { start: 0, end: 4, color: 'primary' },
      { start: 8, end: 10, color: 'accent' },
    ]);
  });

  it('renders style spans and still exposes the editable path', () => {
    const html = renderToStaticMarkup(
      <Editable
        as="h1"
        path="props.heading"
        value="Light That Feel"
        runs={[{ start: 0, end: 5, color: 'accent', size: 'xl' }]}
      />,
    );
    expect(html).toContain('data-editable-path="props.heading"');
    expect(html).toContain('lumio-run--color-accent');
    expect(html).toContain('lumio-run--size-xl');
    expect(html).toContain('Light');
  });

  it('supports a free colour and font size from the editor', () => {
    const html = renderToStaticMarkup(
      <Editable
        as="h1"
        path="props.heading"
        value="Light That Feel"
        runs={[{ start: 0, end: 5, colorHex: '#ff8800', sizePx: 64 }]}
      />,
    );
    expect(html).toContain('color:#ff8800');
    // The size travels as a variable so a phone can cap it.
    expect(html).toContain('--run-size:64px');
    expect(html).toContain('data-run-size="true"');
    expect(textSegments('abc', [{ start: 0, end: 3, colorHex: '#fff' }])[0]?.run).toEqual({
      start: 0,
      end: 3,
      colorHex: '#fff',
    });
  });
});
