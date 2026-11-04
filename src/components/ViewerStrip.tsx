import type { CSSProperties, ReactNode, RefObject } from 'react'

/**
 * Bande d'une visionneuse : la photo affichée et ses deux voisines, déjà chargées de part et d'autre.
 * Chaque cadre garde sa clé d'une photo à l'autre, si bien que la voisine qui arrive n'est pas rechargée.
 * Le cadre du milieu porte `zoomed`, l'élément agrandi par le pincement.
 */
export function ViewerStrip<T extends { id: string }>({
  items,
  index,
  track,
  zoomed,
  render,
}: {
  items: T[]
  index: number
  track: RefObject<HTMLDivElement>
  zoomed: RefObject<HTMLDivElement>
  render: (item: T, active: boolean) => ReactNode
}) {
  return (
    <div ref={track} className="viewer-photo__track">
      {[-1, 0, 1].map((offset) => {
        const item = items[index + offset]
        if (!item) return null
        return (
          <div key={item.id} className="viewer-photo__slide" style={{ '--offset': offset } as CSSProperties} aria-hidden={offset !== 0 || undefined}>
            <div ref={offset === 0 ? zoomed : undefined} className="viewer-photo__zoom">
              {render(item, offset === 0)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
