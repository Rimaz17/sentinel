/*
 * Image manifest.
 *
 * Each figure ships as WebP at several widths so a browser can pick the one it
 * actually needs — a phone on mobile data takes the 960px hero at 34 KB rather
 * than the 2816px one at 182 KB. The originals live in
 * `docs/design/source-images/`; regenerate these with `scripts/build-images.py`.
 *
 * Intrinsic width and height are recorded so every figure can reserve its space
 * before the bytes arrive, and nothing on the page shifts as they load.
 */

import dengue960 from './dengue-vector-960.webp'
import dengue1440 from './dengue-vector-1440.webp'
import dengue2048 from './dengue-vector-2048.webp'
import dengue2816 from './dengue-vector-2816.webp'
import network512 from './network-map-512.webp'
import network764 from './network-map-764.webp'
import twoViews640 from './two-views-640.webp'
import twoViews1024 from './two-views-1024.webp'

export type ImageAsset = {
  /** Fallback for browsers that ignore srcSet. The middle width, not the largest. */
  src: string
  srcSet: string
  width: number
  height: number
}

export const dengueVector: ImageAsset = {
  src: dengue1440,
  srcSet: [
    `${dengue960} 960w`,
    `${dengue1440} 1440w`,
    `${dengue2048} 2048w`,
    `${dengue2816} 2816w`,
  ].join(', '),
  width: 2816,
  height: 1536,
}

export const twoViews: ImageAsset = {
  src: twoViews1024,
  srcSet: [`${twoViews640} 640w`, `${twoViews1024} 1024w`].join(', '),
  width: 1024,
  height: 1054,
}

export const networkMap: ImageAsset = {
  src: network764,
  srcSet: [`${network512} 512w`, `${network764} 764w`].join(', '),
  width: 764,
  height: 768,
}
