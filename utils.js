const isValidImageUrl = (url) => {
  try {
    new URL(url);
  } catch (_) {
    alert(`Invalid URL: ${url}`)
    return false;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // if (img.naturalWidth != img.naturalHeight * 2) {
      //   alert(`Invalid Resolution: ${img.naturalWidth}x${img.naturalHeight} (An equirectangular image MUST be 2:1`)
      //   resolve(false);
      // }
      resolve(true);
    };
    img.onerror = () => {
      alert(`Unloadable Image: ${url}`)
      resolve(false)
    };
    img.src = url;
  });
}
