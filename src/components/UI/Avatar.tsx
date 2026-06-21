import { useState } from 'react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  online?: boolean
}

function colorFromName(name?: string | null) {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-rose-500',
    'bg-orange-500', 'bg-amber-500', 'bg-teal-500', 'bg-cyan-500',
  ]
  if (!name) return colors[0]
  const i = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[i]
}

export function Avatar({ src, name, size = 40, online }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const initials = name
    ?.split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const showImage = src && !imgError

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={src}
          alt={name ?? ''}
          className="rounded-full object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center text-white font-semibold select-none ${colorFromName(name)}`}
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initials ?? '?'}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#1e1e2e] ${online ? 'bg-green-500' : 'bg-gray-500'}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  )
}
