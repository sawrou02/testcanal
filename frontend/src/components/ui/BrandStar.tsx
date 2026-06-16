interface BrandStarProps {
  size?: number
}

export function BrandStar({ size = 48 }: BrandStarProps) {
  const barH = Math.round(size * 0.1)
  const gap = Math.round(size * 0.04)
  const totalBarH = barH * 3 + gap * 2
  const rectH = size - totalBarH - gap

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Green rounded rectangle */}
      <rect x="0" y="0" width={size} height={rectH} rx={size * 0.1} fill="#0E8A4F" />
      {/* White star */}
      <polygon
        points={(() => {
          const cx = size / 2
          const cy = rectH / 2
          const outerR = rectH * 0.38
          const innerR = rectH * 0.17
          const points = []
          for (let i = 0; i < 5; i++) {
            const outerAngle = (i * 72 - 90) * (Math.PI / 180)
            const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180)
            points.push(`${cx + outerR * Math.cos(outerAngle)},${cy + outerR * Math.sin(outerAngle)}`)
            points.push(`${cx + innerR * Math.cos(innerAngle)},${cy + innerR * Math.sin(innerAngle)}`)
          }
          return points.join(' ')
        })()}
        fill="white"
      />
      {/* Tricolor bars */}
      <rect x="0" y={rectH + gap} width={size} height={barH} rx={barH * 0.3} fill="#0E8A4F" />
      <rect x="0" y={rectH + gap + barH + gap} width={size} height={barH} rx={barH * 0.3} fill="#E2A000" />
      <rect x="0" y={rectH + gap + (barH + gap) * 2} width={size} height={barH} rx={barH * 0.3} fill="#D23A2C" />
    </svg>
  )
}
