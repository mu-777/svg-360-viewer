import os
import abc
import numpy as np


class IMapper(metaclass=abc.ABCMeta):
  @abc.abstractmethod
  def map(self, x_: float, y_: float, out_width: int, out_height: int) -> tuple[float, float]:
    raise NotImplementedError()


# # IMapper Sample 1
# class TransparentMapper(IMapper):
#   def __init__(self) -> None:
#     pass

#   def map(self, x_: float, y_: float, out_width: int, out_height: int) -> tuple[float, float]:
#     return x_, y_


# # IMapper Sample 2
# class CenterZoomMapper(IMapper):
#   def __init__(self, in_width: int, in_height: int) -> None:
#     self._in_width = in_width
#     self._in_height = in_height

#   def map(self, x_: float, y_: float, out_width: int, out_height: int) -> tuple[float, float]:
#     x = (x_ / out_width) * (self._in_width / 2) + self._in_width / 4
#     y = (y_ / out_height) * (self._in_height / 2) + self._in_height / 4
#     return x, y


class EquiToSphereMapper(IMapper):
  def __init__(self, in_width: int, in_height: int, h_fov_deg: int) -> None:
    self._h_fov = np.deg2rad(h_fov_deg)
    self._in_width = in_width
    self._in_height = in_height

  def map(self, x_: float, y_: float, out_width: int, out_height: int) -> tuple[float, float]:
    f = out_width * 0.5 / np.tan(self._h_fov * 0.5)
    r = self._in_height / np.pi

    theta = np.pi * 0.5 - np.atan2(out_height * 0.5 - y_, np.sqrt((out_width * 0.5 - x_)**2 + f**2))
    y = r * theta

    phi = np.pi * 0.5 - np.atan2(out_width * 0.5 - x_, f)
    x = r * phi + self._in_width / 4
    return x, y


def gen_mapimg(out_width: int, out_height: int,
               offset_x: int, offset_y: int,  # offset = (in_w/h - out_w/h)//2
               mapper: IMapper) -> tuple[np.ndarray, float]:
  displacement_map = np.zeros((out_height, out_width, 3), dtype=np.float32)
  max_diff = 0
  for y_ in range(out_height):
    for x_ in range(out_width):
      x, y = mapper.map(x_, y_, out_width, out_height)

      diff_x, diff_y = (x - offset_x) - x_, (y - offset_y) - y_

      max_diff = max(abs(diff_x), abs(diff_y), max_diff)

      displacement_map[y_, x_, 0] = diff_x
      displacement_map[y_, x_, 1] = diff_y
      displacement_map[y_, x_, 2] = 0.0

  scale = 2 * max_diff if max_diff != 0 else 1
  return ((displacement_map[:, :, :] / scale + 0.5) * 255).astype(np.uint8), scale


def check_srcimg_resolution(in_width, out_width, out_height, out_hfov_deg) -> bool:
  in_height = in_width // 2
  out_hfov = np.deg2rad(out_hfov_deg)
  out_vfov = np.atan(0.5 * np.tan(out_hfov / 2)) * 2

  upper_in_height = min((out_width + 127 * 2) * np.pi / out_hfov, (out_height + 127 * 2) * np.pi / out_vfov)
  if (in_height > upper_in_height):
    print(
        f"Src image should be up to {upper_in_height*2:.1f}x{upper_in_height:.1f} for {out_width}x{out_height} dst image")
    return False
  return True


def gen_mapimg_multisteps(out_width: int, out_height: int,
                          offset_x: int, offset_y: int,  # offset = (in_w/h - out_w/h)//2
                          mapper: IMapper) -> tuple[list[np.ndarray], float]:
  scale = 255
  max_diff = 0
  mapped_cache = np.zeros((out_height, out_width, 2), dtype=np.float32)
  for yn in range(out_height):
    for xn in range(out_width):
      x0, y0 = mapper.map(xn, yn, out_width, out_height)
      x0, y0 = x0 - offset_x, y0 - offset_y
      max_diff = max(abs(x0 - xn), abs(y0 - yn), max_diff)
      mapped_cache[yn, xn, 0] = x0
      mapped_cache[yn, xn, 1] = y0

  n = int(max_diff // 127 + 1)
  print(max_diff, n, scale)

  displacement_maps = [127 * np.ones((out_height, out_width, 3), dtype=np.uint8) for _ in range(n)]

  for yn in range(out_height):
    for xn in range(out_width):
      x0, y0 = mapped_cache[yn, xn, 0], mapped_cache[yn, xn, 1]
      diff_x, diff_y = x0 - xn, y0 - yn
      ax, ay = abs(diff_x) // 127, abs(diff_y) // 127
      bx, by = abs(diff_x) % 127, abs(diff_y) % 127
      sign_x, sign_y = np.sign(diff_x), np.sign(diff_y)
      x_cache, y_cache = [x0], [y0]
      for i in range(n):
        r = 0.5 + (sign_x * 0.5 if i < ax else sign_x * bx / 255 if i == ax else 0.0)
        g = 0.5 + (sign_y * 0.5 if i < ay else sign_y * by / 255 if i == ay else 0.0)
        x = int(x_cache[i] - sign_x * (127 if i < ax else bx) if i <= ax else x_cache[i])
        y = int(y_cache[i] - sign_y * (127 if i < ay else by) if i <= ay else y_cache[i])
        x_cache.append(x)
        y_cache.append(y)

        # print(xn, yn, x0, y0, diff_x, diff_y, ax, ay, bx, by, i, x, y, r, g)

        displacement_maps[i][y, x, 0] = r * 255
        displacement_maps[i][y, x, 1] = g * 255
        displacement_maps[i][y, x, 2] = 127

  return displacement_maps, scale


# ----------------------------------------------
if __name__ == "__main__":
  import argparse
  from PIL import Image

  DEFAULT_OUTDIR = os.getcwd()

  parser = argparse.ArgumentParser(description='')
  parser.add_argument('src_width', type=int, help='Width[px] of Src image. src_height must be half of the src_width')
  parser.add_argument('dst_width', type=int, help='Width[px] of Dst image')
  parser.add_argument('dst_height', type=int, help='Height[px] of Dst image')
  parser.add_argument('dst_hfov', type=int, help='Horizontal FoV[deg] of Dst image')
  parser.add_argument('-o', '--out_dir', default=DEFAULT_OUTDIR, help=f'Output directory(default: {DEFAULT_OUTDIR})')
  parser.add_argument('--multisteps', action='store_true', help='Enable to generate maps for multiple step filter')
  parser.add_argument('-f', '--force', action='store_true', help='Force to generate map without resolution check')

  args = parser.parse_args()
  is_multisteps: bool = args.multisteps
  is_force: bool = args.force

  out_dir: str = args.out_dir
  if not os.path.exists(out_dir):
    os.makedirs(out_dir)

  src_width: int = args.src_width
  src_height: int = src_width // 2
  dst_width: int = args.dst_width
  dst_height: int = args.dst_height
  dst_hfov_deg: float = args.dst_hfov
  offset_x: int = (src_width - dst_width) // 2
  offset_y: int = (src_height - dst_height) // 2
  equi2sphere = EquiToSphereMapper(src_width, src_height, dst_hfov_deg)

  if not is_force:
    if not check_srcimg_resolution(src_width, dst_width, dst_height, dst_hfov_deg):
      print('Failed check_srcimg_resolution. Add "--force" option to force run')
      exit(1)

  def gen_suffix(scale) -> str:
    return f"scale={scale:.3f}_src={src_width}x{src_height}_dst={dst_width}x{dst_height}_hfov={dst_hfov_deg}"

  if is_multisteps:
    out_dir = os.path.join(out_dir, f'stepmap_{src_width}to{dst_width}')
    os.makedirs(out_dir, exist_ok=True)
    mapimgs, scale = gen_mapimg_multisteps(dst_width, dst_height, offset_x, offset_y, equi2sphere)
    n = len(mapimgs)
    for idx, img in enumerate(mapimgs):
      Image.fromarray(img, mode='RGB').save(os.path.join(out_dir, f'map_{idx+1}-{n}_{gen_suffix(scale)}.png'))
    print(f"Done, see: {out_dir}")
  else:
    mapimg, scale = gen_mapimg(dst_width, dst_height, offset_x, offset_y, equi2sphere)
    filepath = os.path.join(out_dir, f'map_{gen_suffix(scale)}.png')
    Image.fromarray(mapimg, mode='RGB').save(filepath)
    print(f"Done, see: {filepath}")
