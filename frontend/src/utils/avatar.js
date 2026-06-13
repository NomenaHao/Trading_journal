export const DICEBEAR_AVATAR_STYLE = 'https://api.dicebear.com/10.x/lorelei-neutral/svg'

export function getDiceBearAvatarUrl(seed) {
  const value = encodeURIComponent(String(seed || 'default'))
  return `${DICEBEAR_AVATAR_STYLE}?seed=${value}`
}

export function getUserAvatarUrl(user) {
  if (!user) return getDiceBearAvatarUrl('default')
  if (user.avatar) {
    const version = user.avatarUpdatedAt || ''
    return version ? `${user.avatar}?v=${version}` : user.avatar
  }
  return getDiceBearAvatarUrl(user.username || user.id || user.name)
}
