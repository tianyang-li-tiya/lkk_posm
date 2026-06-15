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

const RATIO_TOLERANCE = 0.15;

export function validateSize(posmName: string, width: number, height: number): ValidationResult {
  const errors: string[] = [];
  const ratio = width > 0 && height > 0 ? Number((width / height).toFixed(2)) : null;

  if (!Number.isFinite(width) || width <= 0) errors.push("宽度必须大于 0 mm");
  if (!Number.isFinite(height) || height <= 0) errors.push("高度必须大于 0 mm");

  const preset = getSizePreset(posmName);
  if (preset && ratio !== null) {
    const baseRatio = Number((preset.width / preset.height).toFixed(2));
    const lowerBound = baseRatio * (1 - RATIO_TOLERANCE);
    const upperBound = baseRatio * (1 + RATIO_TOLERANCE);
    if (ratio < lowerBound || ratio > upperBound) {
      errors.push(`宽高比超出允许范围（基准 ${baseRatio}:1，允许 ±15%，当前 ${ratio}:1）`);
    }
  }

  return { valid: errors.length === 0, errors, ratio };
}

export function validateNumericField(value: string, fieldName: string): string[] {
  const errors: string[] = [];
  if (!value || value.trim() === "") {
    errors.push(`${fieldName}不能为空`);
    return errors;
  }
  if (!/^\d+(\.\d)?$/.test(value.trim())) {
    errors.push(`${fieldName}格式错误`);
    return errors;
  }
  const num = Number(value);
  if (num <= 0) errors.push(`${fieldName}必须为正数`);
  return errors;
}

export function validateOptionField(value: string, validOptions: readonly string[], fieldName: string): string[] {
  if (!value || value.trim() === "") return [`请选择${fieldName}`];
  if (!validOptions.includes(value.trim())) return [`${fieldName}值无效，请从下拉选择`];
  return [];
}
