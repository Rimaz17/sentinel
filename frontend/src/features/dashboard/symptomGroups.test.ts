/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SYMPTOM_GROUPS } from './api/types'
import { SYMPTOM_GROUP_STYLES } from './symptomGroups'

// Read from disk, relative to the frontend root Vitest runs from: Vitest stubs
// CSS imports out, even as ?raw.
const css = readFileSync('src/index.css', 'utf8')

describe('symptom group styles', () => {
  it('covers every symptom group the API sends', () => {
    expect(Object.keys(SYMPTOM_GROUP_STYLES).sort()).toEqual([...SYMPTOM_GROUPS].sort())
  })

  it.each(SYMPTOM_GROUPS)('keeps the %s hue equal to its design token', (group) => {
    const { hue, token } = SYMPTOM_GROUP_STYLES[group]
    const declared = new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)?.[1]
    expect(declared?.toLowerCase()).toBe(hue)
  })

  it('names groups as syndromes, not diagnoses', () => {
    expect(SYMPTOM_GROUP_STYLES.DENGUE_LIKE.label).toBe('Dengue-like')
    expect(SYMPTOM_GROUP_STYLES.INFLUENZA_LIKE.label).toBe('Influenza-like')
  })
})
