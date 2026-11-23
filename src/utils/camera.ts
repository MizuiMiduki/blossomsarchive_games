// ARカメラ映像のアスペクト比補正（object-fit: cover描画）ユーティリティ
export function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  isMirrored: boolean = false
) {
  const vWidth = video.videoWidth || 640;
  const vHeight = video.videoHeight || 480;

  const videoAspect = vWidth / vHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let renderW = canvasWidth;
  let renderH = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > canvasAspect) {
    // 映像が横長 -> 左右を均等クロップして中央寄せ
    renderW = canvasHeight * videoAspect;
    offsetX = (canvasWidth - renderW) / 2;
  } else {
    // 映像が縦長 -> 上下を均等クロップして中央寄せ
    renderH = canvasWidth / videoAspect;
    offsetY = (canvasHeight - renderH) / 2;
  }

  ctx.save();
  if (isMirrored) {
    // インカメラ用ミラー反転
    ctx.translate(canvasWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, offsetX, offsetY, renderW, renderH);
  ctx.restore();
}
