import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@lumio/ui/cn';
import type { BlockNode, BlockStyle } from '@lumio/shared';

const visibleDevices = (visibility: BlockStyle['visibility']): string =>
  (['mobile', 'tablet', 'desktop'] as const).filter((device) => visibility[device]).join(' ');

export interface BlockShellProps {
  block: BlockNode;
  className?: string;
  children: ReactNode;
}

/**
 * Applies the shared block style (spacing, background, responsive visibility, animation)
 * around any block. Visibility uses `data-visibility` so CSS media queries stay in one place.
 */
export const BlockShell = ({ block, className, children }: BlockShellProps) => {
  const { style } = block;
  return (
    <section
      className={cn('lumio-block', className)}
      data-block-id={block.id}
      data-block-type={block.type}
      data-visibility={visibleDevices(style.visibility)}
      data-background={style.background === 'none' ? undefined : style.background}
      data-custom-background={style.backgroundColor ? 'true' : undefined}
      data-background-full={style.backgroundFullWidth === false ? 'false' : undefined}
      data-custom-width={typeof style.widthPx === 'number' ? 'true' : undefined}
      data-custom-height={typeof style.heightPx === 'number' ? 'true' : undefined}
      data-text-align={style.textAlign ?? undefined}
      data-text-scale={typeof style.textScale === 'number' ? 'true' : undefined}
      data-animation={style.animation === 'none' ? undefined : style.animation}
      style={
        {
          '--block-padding-y':
            typeof style.paddingYpx === 'number'
              ? `${style.paddingYpx}px`
              : `calc(var(--space-${style.paddingY}) * var(--density-scale, 1))`,
          '--block-padding-x':
            typeof style.paddingXpx === 'number'
              ? `${style.paddingXpx}px`
              : `calc(var(--space-${style.paddingX}) * var(--density-scale, 1))`,
          ...(typeof style.paddingTopPx === 'number'
            ? { '--block-padding-top': `${style.paddingTopPx}px` }
            : {}),
          ...(typeof style.paddingBottomPx === 'number'
            ? { '--block-padding-bottom': `${style.paddingBottomPx}px` }
            : {}),
          ...(typeof style.marginTopPx === 'number'
            ? { '--block-margin-top': `${style.marginTopPx}px` }
            : {}),
          ...(style.backgroundColor ? { '--block-background': style.backgroundColor } : {}),
          '--block-offset-x': `${style.offsetX ?? 0}px`,
          '--block-offset-y': `${style.offsetY ?? 0}px`,
          '--block-text-scale': String((style.textScale ?? 100) / 100),
          ...(typeof style.widthPx === 'number'
            ? { '--block-width': `${style.widthPx}px` }
            : {}),
          ...(typeof style.heightPx === 'number'
            ? { '--block-height': `${style.heightPx}px` }
            : {}),
          ...(style.textAlign ? { '--block-text-align': style.textAlign } : {}),
        } as CSSProperties
      }
    >
      <div className="lumio-block__inner">{children}</div>
    </section>
  );
};
