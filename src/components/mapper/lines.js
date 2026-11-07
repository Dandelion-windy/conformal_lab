// 曲线族的配色（叠加层上 CPU 绘制的网格线）：fam 0（竖线/射线）冷色渐变，fam 1（横线/圆）暖色渐变
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const FAM = [[[79, 195, 247], [150, 110, 255]], [[255, 213, 79], [255, 82, 140]]];
export function lineColor(L) {
  if (L.axis) return '#ffffff';
  const [a, b] = FAM[L.fam];
  return rgb(mix(a, b, Math.min(1, Math.max(0, L.t))));
}
