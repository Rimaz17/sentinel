import type { CSSProperties } from 'react'
import type { ImageAsset } from '@/assets/images'
import './figure.css'

type FigureProps = {
  image: ImageAsset
  /**
   * What the picture says, for someone who cannot see it. Not a description of
   * the artwork — a description of the information it carries. Each of these
   * ends by naming itself an illustration: the figures carry no visible
   * caption, so the alt text is where that disclosure lives for anyone who
   * cannot see the drawing.
   */
  alt: string
  /** `sizes` for the browser's srcSet choice. Must match the real CSS width. */
  sizes: string
  /**
   * Crop ratio, e.g. `"2.4 / 1"`. Defaults to the image's own. It is passed as
   * a custom property rather than as `aspect-ratio` directly, so a media query
   * can change the crop at a breakpoint without fighting the inline style.
   * Each ratio used here was checked against the subject's bounding box in the
   * source image, so nothing important falls outside the frame.
   */
  ratio?: string
  /**
   * `contain` (the default) fits the whole drawing in the frame, which is what
   * a trimmed cut-out needs — cropping one just clips the artwork. `cover`
   * fills the frame and is for opaque artwork that can take a crop.
   */
  fit?: 'contain' | 'cover'
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
  priority = false,
  className,
}: FigureProps) {
  const frameStyle = {
    '--figure-ratio': ratio ?? `${image.width} / ${image.height}`,
    '--figure-fit': fit,
  } as CSSProperties

  return (
    <figure className={['figure', className].filter(Boolean).join(' ')}>
      <div className="figure__frame" style={frameStyle}>
        <img
          className="figure__img"
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
