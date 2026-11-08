// 合并连续输入，只计算最新参数；交互时限制更新频率，结束后细化一次。
export function scheduleGeometry(update, { interval = 50, settle = 180 } = {}) {
  let timer = 0, frame = 0, refinement = 0, last = -Infinity, interactive = false;
  const draw = () => {
    timer = 0;
    frame = requestAnimationFrame(() => {
      frame = 0;
      last = performance.now();
      update(interactive);
    });
  };
  const cancel = () => {
    clearTimeout(timer); cancelAnimationFrame(frame); clearTimeout(refinement);
    timer = frame = refinement = 0;
  };
  const finish = () => {
    cancel();
    interactive = false;
    draw();
  };
  return {
    request() {
      interactive = true;
      clearTimeout(refinement);
      refinement = setTimeout(finish, settle);
      if (!timer && !frame) timer = setTimeout(draw, Math.max(0, interval - (performance.now() - last)));
    },
    finish,
    cancel,
  };
}
