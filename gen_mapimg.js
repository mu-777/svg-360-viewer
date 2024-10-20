class EquiToSphereMapper {
  constructor(inWidth, inHeight, hFovDeg) {
    this._hFov = (hFovDeg * Math.PI) / 180;
    this._inWidth = inWidth;
    this._inHeight = inHeight;
  }

  map(x_, y_, outWidth, outHeight) {
    const f = (outWidth * 0.5) / Math.tan(this._hFov * 0.5);
    const r = this._inHeight / Math.PI;

    const theta = Math.PI * 0.5 - Math.atan2(outHeight * 0.5 - y_, Math.sqrt((outWidth * 0.5 - x_) ** 2 + f ** 2));
    const y = r * theta;

    const phi = Math.PI * 0.5 - Math.atan2(outWidth * 0.5 - x_, f);
    const x = r * phi + this._inWidth / 4;
    return [x, y];
  }
}

function calcSrcImgBestResolution(outWidth, outHeight, outHFovDeg) {
  const outHFov = (outHFovDeg * Math.PI) / 180;
  const outVFov = Math.atan(0.5 * Math.tan(outHFov * 0.5)) * 2.0;
  const upperInHeight = Math.min((outWidth + 127 * 2) * Math.PI / outHFov, (outHeight + 127 * 2) * Math.PI / outVFov);
  const inHeight = Math.floor(upperInHeight * 0.1) * 10;
  return { srcWidth: inHeight * 2, srcHeight: inHeight };
}

// function genMapImg(outWidth, outHeight, offsetX, offsetY, mapper) {
//   const displacementMapCache = new Float32Array(outWidth * outHeight * 3);
//   let maxDiff = 0;

//   for (let y_ = 0; y_ < outHeight; y_++) {
//     for (let x_ = 0; x_ < outWidth; x_++) {
//       const [x, y] = mapper.map(x_, y_, outWidth, outHeight);
//       const diffX = (x - offsetX) - x_;
//       const diffY = (y - offsetY) - y_;

//       maxDiff = Math.max(Math.abs(diffX), Math.abs(diffY), maxDiff);

//       const idx = (y_ * outWidth + x_) * 3;
//       displacementMapCache[idx + 0] = diffX
//       displacementMapCache[idx + 1] = diffY;
//       displacementMapCache[idx + 2] = 0.0;
//     }
//   }

//   const scale = 2 * maxDiff || 1;
//   const displacementMap = new Uint8ClampedArray(outWidth * outHeight * 3);
//   for (let i = 0; i < displacementMap.length; i++) {
//     displacementMap[i] = (displacementMapCache[i]/ scale + 0.5) * 255;
//   }
//   return { displacementMap, scale };
// }


function genMapImg(outWidth, outHeight, offsetX, offsetY, mapper) {
  const mapImgLength = outWidth * outHeight;
  const diffXCache = new Float32Array(mapImgLength);
  const diffYCache = new Float32Array(mapImgLength);
  let maxDiff = 0;

  for (let y_ = 0; y_ < outHeight; y_++) {
    for (let x_ = 0; x_ < outWidth; x_++) {
      const [x, y] = mapper.map(x_, y_, outWidth, outHeight);
      const diffX = (x - offsetX) - x_;
      const diffY = (y - offsetY) - y_;

      maxDiff = Math.max(Math.abs(diffX), Math.abs(diffY), maxDiff);

      const idx = y_ * outWidth + x_;
      diffXCache[idx] = diffX
      diffYCache[idx] = diffY;
    }
  }

  const scale = 2 * maxDiff || 1;
  const displacementMap = new Uint8ClampedArray(mapImgLength * 4);
  for (let i = 0; i < mapImgLength; i++) {
    displacementMap[i*4 + 0] = (diffXCache[i] / scale + 0.5) * 255;
    displacementMap[i*4 + 1] = (diffYCache[i] / scale + 0.5) * 255;
    displacementMap[i*4 + 2] = 127;
    displacementMap[i*4 + 3] = 255;
  }
  return { displacementMap, scale };
}
