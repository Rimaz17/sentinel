import { useCallback, useId, useRef } from 'react'
import { PointPlate } from './PointPlate'
import { RidgePlate } from './RidgePlate'
import { PLATES, type Plate } from './plates'
import './plate.css'

type PlateFigureProps = {
  activeId: string
  onSelect: (id: string) => void
}

function PlateArt({ plate }: { plate: Plate }) {
  if (plate.kind === 'ridge') {
    return <RidgePlate mode={plate.variant === 'signal' ? 'signal' : 'baseline'} />
  }
  return <PointPlate mode={plate.variant === 'cluster' ? 'cluster' : 'spread'} />
}

/**
 * The plate and its switcher.
 *
 * Implemented as a tab set: the switcher is the tab list, each plate is a
 * panel. That gives the arrow-key behaviour a visitor already expects, and it
 * means the caption and the drawing change together rather than the caption
 * lagging a click behind.
 */
export function PlateFigure({ activeId, onSelect }: PlateFigureProps) {
  const baseId = useId()
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const current = PLATES.findIndex((p) => p.id === activeId)
      if (current < 0) return

      const last = PLATES.length - 1
      let next: number | null = null

      if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1
      else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = last

      if (next === null) return
      event.preventDefault()
      const target = PLATES[next]
      if (!target) return
      onSelect(target.id)
      tabsRef.current[next]?.focus()
    },
    [activeId, onSelect],
  )

  const active = PLATES.find((p) => p.id === activeId) ?? PLATES[0]

  return (
    <figure className="plate">
      <div className="plate__stage">
        {PLATES.map((plate) => {
          const isActive = plate.id === activeId
          return (
            <div
              key={plate.id}
              id={`${baseId}-panel-${plate.id}`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${plate.id}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className={`plate__panel${isActive ? ' is-active' : ''}`}
            >
              <PlateArt plate={plate} />
            </div>
          )
        })}

        {/* The text alternative. It carries the same information as the
            drawing, not a description of how the drawing looks. */}
        <p className="sr-only" aria-live="polite">
          {active?.alt}
        </p>

        <div className="plate__switcher" role="tablist" aria-label="Plate">
          <span className="plate__switcher-label label label--sm" aria-hidden="true">
            Plate
          </span>
          {PLATES.map((plate, i) => {
            const isActive = plate.id === activeId
            return (
              <button
                key={plate.id}
                ref={(el) => {
                  tabsRef.current[i] = el
                }}
                id={`${baseId}-tab-${plate.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${plate.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`plate__tab${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect(plate.id)}
                onKeyDown={onKeyDown}
              >
                <span className="plate__tab-ordinal tnum">{plate.ordinal}</span>
                <span className="plate__tab-name">{plate.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <figcaption className="plate__caption">
        <p className="plate__caption-text">{active?.caption}</p>
        <p className="plate__provenance label label--sm">
          Simulated data · generated from a fixed seed
        </p>
      </figcaption>
    </figure>
  )
}
