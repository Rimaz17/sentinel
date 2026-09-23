import type { CSSProperties } from 'react'
import type { ImageAsset } from '@/assets/images'
import { cx } from '@/styles/recipes'

type FigureProps = {
  image: ImageAsset
  /**
   * What the picture says, for someone who cannot see it. Not a description of
   * the artwork, but of the information it carries. Each of these
   * ends by naming itself an illustration: the figures carry no visible
   * caption, so the alt text is where that disclosure lives for anyone who
   * cannot see the drawing.
   */
  alt: string
  /** `sizes` for the browser's srcSet choice. Must match the real CSS width. */
  sizes: string
  /**
   * Crop ratio, e.g. `"2.4 / 1"`. Defaults to the image's own. It is passed as
   * a custom property rather than as `aspect-ratio` directly, because an inline
   * `aspect-ratio` would beat any class, and `fill` needs to switch it off at
   * the wide breakpoint. Each ratio used here was checked against the subject's
   * bounding box in the source image, so nothing important falls outside the
   * frame.
   */
  ratio?: string
  /**
   * `contain` (the default) fits the whole drawing in the frame, which is what
   * a trimmed cut-out needs, because cropping one just clips the artwork. `cover`
   * fills the frame and is for opaque artwork that can take a crop.
   */
  fit?: 'contain' | 'cover'
  /**
   * For a figure in a stretched split: from the wide breakpoint the frame drops
   * its ratio and fills whatever height the text column beside it sets.
   */
  fill?: boolean
  /** Only the figure at the fold should load eagerly. */
  priority?: boolean
  className?: string
}

export function Figure({
  image,
  alt,
  sizes,
  ratio,
  fit = 'contain',
  fill = false,
  priority = false,
  className,
}: FigureProps) {
  const frameStyle = {
    '--figure-ratio': ratio ?? `${image.width} / ${image.height}`,
  } as CSSProperties

  return (
    <figure className={cx(fill && 'xl:flex xl:min-h-0 xl:flex-col', className)}>
      {/* Always ratio'd, so the space is reserved before the bytes arrive and
          nothing on the page shifts as the image loads. Under `fill`, the
          frame's flex basis is 0, not auto: with auto the basis is the image's
          own height, the figure reports that as its intrinsic height, and the
          grid row sizes to the image rather than to the text. */}
      <div
        className={cx(
          'relative aspect-(--figure-ratio) overflow-hidden',
          fill && 'xl:min-h-0 xl:flex-[1_1_0] xl:aspect-auto',
        )}
        style={frameStyle}
      >
        <img
          className={cx(
            // `contain` suits a trimmed cut-out, since cropping one just clips
            // the drawing; `cover` is for opaque artwork that can take a crop.
            'h-full w-full object-center',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            // Out of flow under `fill`: an in-flow image would put its own
            // height back into the figure's intrinsic size.
            fill && 'xl:absolute xl:inset-0',
          )}
          src={image.src}
          srcSet={image.srcSet}
          sizes={sizes}
          width={image.width}
          height={image.height}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...(priority ? { fetchPriority: 'high' as const } : {})}
        />
      </div>
    </figure>
  )
}
