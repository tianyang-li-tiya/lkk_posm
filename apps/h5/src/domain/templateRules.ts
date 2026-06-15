export const posmNames = [
  "包柱: 80cm*200cm",
  "吊旗: 正反面 320mm*267mm",
  "地贴. 1200mm*450mm",
  "地堆围膜 100cm（宽）*80cm(高)",
  "割箱背板",
  "地堆尺寸延展围板1.5x0.8m(h)",
  "地堆尺寸延展围板侧板1x0.8m(h)",
  "地堆尺寸延展围板侧板1.5x0.8m(h)",
  "买赠立牌（A3）正面",
  "买赠立牌（A3）背面",
  "地堆简易版头卡 0.9m*0.6m"
] as const;

export type PosmName = (typeof posmNames)[number];

export type SizePreset = {
  width: number;
  height: number;
  source: "sheet-posm-name";
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  ratio: number | null;
};

const sizePresets: Partial<Record<PosmName, SizePreset>> = {
  "包柱: 80cm*200cm": { width: 800, height: 2000, source: "sheet-posm-name" },
  "吊旗: 正反面 320mm*267mm": { width: 320, height: 267, source: "sheet-posm-name" },
  "地贴. 1200mm*450mm": { width: 1200, height: 450, source: "sheet-posm-name" },
  "地堆围膜 100cm（宽）*80cm(高)": { width: 1000, height: 800, source: "sheet-posm-name" },
  "地堆尺寸延展围板1.5x0.8m(h)": { width: 1500, height: 800, source: "sheet-posm-name" },
  "地堆尺寸延展围板侧板1x0.8m(h)": { width: 1000, height: 800, source: "sheet-posm-name" },
  "地堆尺寸延展围板侧板1.5x0.8m(h)": { width: 1500, height: 800, source: "sheet-posm-name" },
  "买赠立牌（A3）正面": { width: 297, height: 420, source: "sheet-posm-name" },
  "买赠立牌（A3）背面": { width: 297, height: 420, source: "sheet-posm-name" },
  "地堆简易版头卡 0.9m*0.6m": { width: 900, height: 600, source: "sheet-posm-name" }
};

export function getSizePreset(posmName: string): SizePreset | undefined {
  return sizePresets[posmName as PosmName];
}

export function validateSize(posmName: string, width: number, height: number): ValidationResult {
  const errors: string[] = [];
  const ratio = width > 0 && height > 0 ? Number((width / height).toFixed(2)) : null;

  if (!Number.isFinite(width) || width <= 0) errors.push("宽度必须大于 0 mm");
  if (!Number.isFinite(height) || height <= 0) errors.push("高度必须大于 0 mm");

  const preset = getSizePreset(posmName);
  if (preset && Number.isFinite(width) && Number.isFinite(height)) {
    const widthDiff = Math.abs(width - preset.width);
    const heightDiff = Math.abs(height - preset.height);
    if (widthDiff > 2 || heightDiff > 2) {
      errors.push(`当前尺寸需与 POSM名称中的尺寸一致：${preset.width} x ${preset.height} mm`);
    }
  }

  return { valid: errors.length === 0, errors, ratio };
}
