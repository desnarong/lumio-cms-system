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
          ...(style.backgroundColor ? { '--block-background': style.backgroundColor } : {}),
          '--block-offset-x': `${style.offsetX ?? 0}px`,
          '--block-offset-y': `${style.offsetY ?? 0}px`,
          ...(style.textAlign ? { '--block-text-align': style.textAlign } : {}),
        } as CSSProperties
      }
    >
      <div className="lumio-block__inner">{children}</div>
    </section>
  );
};
