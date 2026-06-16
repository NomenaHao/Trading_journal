export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Fichier image requis.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire l\'image.'))
    reader.readAsDataURL(file)
  })
}

export function isDataUrlImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}
