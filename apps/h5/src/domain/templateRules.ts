export type PosmItem = {
  label: string;
  value: string;
  width: number;
  height: number;
};

export type PosmCategory = {
  category: string;
  items: PosmItem[];
};

export const posmCatalog: PosmCategory[] = [
  {
    category: "KV",
    items: [
      { label: "KV-单人版 160×90mm", value: "KV-单人版", width: 160, height: 90 },
      { label: "KV-双人版 160×90mm", value: "KV-双人版", width: 160, height: 90 },
    ]
  },
  {
    category: "端架",
    items: [
      { label: "端架头卡 1200×450mm", value: "端架头卡", width: 1200, height: 450 },
      { label: "端架侧板 500×1800mm", value: "端架侧板", width: 500, height: 1800 },
      { label: "端架货架插条 300×40mm", value: "端架货架插条", width: 300, height: 40 },
    ]
  },
  {
    category: "包柱",
    items: [
      { label: "包柱 800×2000mm", value: "包柱", width: 800, height: 2000 },
    ]
  },
  {
    category: "地贴",
    items: [
      { label: "地铁地贴 1200×450mm", value: "地铁地贴", width: 1200, height: 450 },
    ]
  },
  {
    category: "地堆",
    items: [
      { label: "地堆 1 1000×800mm", value: "地堆1", width: 1000, height: 800 },
      { label: "地堆 2 1000×800mm", value: "地堆2", width: 1000, height: 800 },
    ]
  },
];

export const posmNames = posmCatalog.flatMap(c => c.items.map(i => i.value));
export const posmLabels = posmCatalog.flatMap(c => c.items.map(i => i.label));

export function getPosmValueByLabel(label: string): string | undefined {
  for (const cat of posmCatalog) {
    const item = cat.items.find(i => i.label === label);
    if (item) return item.value;
  }
  return undefined;
}
export type PosmName = string;

export type SizePreset = {
  width: number;
  height: number;
  source: "sheet-posm-name";
};

export function getSizePreset(posmName: string): SizePreset | undefined {
  for (const cat of posmCatalog) {
    const item = cat.items.find(i => i.value === posmName);
    if (item) return { width: item.width, height: item.height, source: "sheet-posm-name" };
  }
  return undefined;
}

export function getPosmLabel(posmName: string): string {
  for (const cat of posmCatalog) {
    const item = cat.items.find(i => i.value === posmName);
    if (item) return item.label;
  }
  return posmName;
}

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  ratio: number | null;
};

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
