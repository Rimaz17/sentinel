/*
 * Image manifest.
 *
 * Each figure ships as WebP at several widths so a browser can pick the one it
 * actually needs rather than always taking the largest. Two of the three carry
 * real transparency, keyed back out of exports that had it baked in as a
 * checkerboard, and all three are trimmed to their own artwork so no empty
 * margin is shipped as page whitespace. The originals live in
 * `docs/design/source-images/`; regenerate these with `scripts/build-images.py`.
 *
 * Intrinsic width and height are recorded so every figure can reserve its space
 * before the bytes arrive, and nothing on the page shifts as they load.
 */

import dengue640 from './dengue-vector-640.webp'
import dengue768 from './dengue-vector-768.webp'
import dengue960 from './dengue-vector-960.webp'
import fields640 from './privacy-fields-640.webp'
import fields768 from './privacy-fields-768.webp'
import fields960 from './privacy-fields-960.webp'
import fields1280 from './privacy-fields-1280.webp'
import network640 from './network-map-640.webp'
import network768 from './network-map-768.webp'
import network960 from './network-map-960.webp'
import twoViews640 from './two-views-640.webp'
import twoViews768 from './two-views-768.webp'
import twoViews960 from './two-views-960.webp'
import twoViews1280 from './two-views-1280.webp'
import twoViews1600 from './two-views-1600.webp'

export type ImageAsset = {
  /** Fallback for browsers that ignore srcSet. The middle width, not the largest. */
  src: string
  srcSet: string
  width: number
  height: number
}

export const dengueVector: ImageAsset = {
  src: dengue960,
  srcSet: [`${dengue640} 640w`, `${dengue768} 768w`, `${dengue960} 960w`].join(', '),
  width: 1032,
  height: 751,
}

export const twoViews: ImageAsset = {
  src: twoViews960,
  srcSet: [
    `${twoViews640} 640w`,
    `${twoViews768} 768w`,
    `${twoViews960} 960w`,
    `${twoViews1280} 1280w`,
    `${twoViews1600} 1600w`,
  ].join(', '),
  width: 2048,
  height: 2048,
}

export const privacyFields: ImageAsset = {
  src: fields960,
  srcSet: [
    `${fields640} 640w`,
    `${fields768} 768w`,
    `${fields960} 960w`,
    `${fields1280} 1280w`,
  ].join(', '),
  width: 2238,
  height: 1262,
}

export const networkMap: ImageAsset = {
  src: network960,
  srcSet: [`${network640} 640w`, `${network768} 768w`, `${network960} 960w`].join(', '),
  width: 1024,
  height: 982,
}
