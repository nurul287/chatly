interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  online?: boolean
}

export function Avatar({ src, name, size = 40, online }: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name ?? ''}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center text-white font-semibold bg-indigo-500"
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
