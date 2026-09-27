import type { SymptomGroup } from './api/types'

type GroupStyle = {
  /** The name used everywhere a person reads it. A syndrome, never a diagnosis. */
  label: string
  /**
   * The group's fixed hue, as a literal because Leaflet's canvas renderer and
   * SVG attributes cannot resolve a CSS custom property. Each must equal its
   * --color-group-* token in index.css; a test holds them together.
   */
  hue: string
  token: string
  /** A complete class literal, so Tailwind can see it. */
  swatch: string
}

export const SYMPTOM_GROUP_STYLES: Record<SymptomGroup, GroupStyle> = {
  DENGUE_LIKE: {
    label: 'Dengue-like',
    hue: '#8b3a8f',
    token: '--color-group-dengue',
    swatch: 'bg-group-dengue',
  },
  INFLUENZA_LIKE: {
    label: 'Influenza-like',
    hue: '#2f67b1',
    token: '--color-group-ili',
    swatch: 'bg-group-ili',
  },
  GASTROINTESTINAL: {
    label: 'Gastrointestinal',
    hue: '#6e7f1f',
    token: '--color-group-gi',
    swatch: 'bg-group-gi',
  },
  LEPTOSPIROSIS_LIKE: {
    label: 'Leptospirosis-like',
    hue: '#12806e',
    token: '--color-group-lepto',
    swatch: 'bg-group-lepto',
  },
}

export function groupLabel(group: SymptomGroup): string {
  return SYMPTOM_GROUP_STYLES[group].label
}
