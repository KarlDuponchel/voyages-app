/**
 * Illustration de couverture (ciel en dégradé + collines), en attendant les vraies photos.
 * `fadeTo` fond le bas de l'image dans la couleur de fond de l'app.
 */
export function Cover({ colors, skyline = false, fadeTo }: { colors: [string, string, string]; skyline?: boolean; fadeTo?: string }) {
  const id = colors.join('').replace(/#/g, '')
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.55" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
        {fadeTo && (
          <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
            {/* style (et non attribut) pour accepter une variable CSS comme var(--bg-base) */}
            <stop offset="0.45" style={{ stopColor: fadeTo, stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: fadeTo }} />
          </linearGradient>
        )}
      </defs>
      <rect width="400" height="300" fill={`url(#sky-${id})`} />
      <circle cx="285" cy="170" r="44" fill="#FFF1D2" fillOpacity="0.75" />
      {skyline ? (
        <>
          <path
            d="M0 210 L20 202 L20 186 L34 186 L34 195 L52 195 L52 176 L60 168 L68 176 L68 190 L88 190 L88 180 L110 180 L110 195 L126 195 L126 170 L132 162 L138 170 L138 192 L160 192 L160 178 L184 178 L184 188 L206 188 L206 166 L214 150 L222 166 L222 186 L246 186 L246 176 L270 176 L270 192 L292 192 L292 180 L316 180 L316 194 L340 194 L340 174 L352 174 L352 184 L372 184 L372 196 L400 196 L400 300 L0 300Z"
            fill="#1A0F24"
            fillOpacity="0.75"
          />
          <path d="M0 240 L28 234 L28 224 L50 224 L50 232 L74 232 L74 218 L96 218 L96 230 L120 230 L120 222 L150 222 L150 236 L176 236 L176 226 L204 226 L204 238 L236 238 L236 220 L262 220 L262 232 L290 232 L290 224 L318 224 L318 236 L348 236 L348 226 L400 226 L400 300 L0 300Z" fill="#000" fillOpacity="0.45" />
        </>
      ) : (
        <>
          <path d="M0 200 C70 150 130 175 200 185 C270 195 320 155 400 168 V300 H0Z" fill="#000" fillOpacity="0.22" />
          <path d="M0 236 C90 210 160 230 230 224 C300 218 340 205 400 214 V300 H0Z" fill="#000" fillOpacity="0.32" />
        </>
      )}
      {fadeTo && <rect width="400" height="300" fill={`url(#fade-${id})`} />}
    </svg>
  )
}
