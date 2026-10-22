// Resize photos before storing them in the browser's limited local scrapbook.
export async function prepareScrapbookPhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, WebP or GIF image.');
  }
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');

  const url = URL.createObjectURL(file);
  const picture = new Image();
  try {
    await new Promise((resolve, reject) => {
      picture.onload = resolve;
      picture.onerror = () => reject(new Error('This image could not be opened. Try another photo.'));
      picture.src = url;
    });
    const scale = Math.min(1, 1000 / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the image.');
    context.fillStyle = '#fffdf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    let result;
    for (const quality of [0.82, 0.68, 0.52, 0.36]) {
      result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 350_000) return result;
    }
    throw new Error('This photo is too detailed to save here. Try a smaller image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
