import ExcelJS from "exceljs";
import { getSizePreset, posmNames } from "../domain/templateRules";
import { campaigns, regions } from "./mockData";

const HEADERS = [
  "行号",
  "Campaign",
  "POSM名称",
  "大区/城市/市场",
  "宽度 mm",
  "高度 mm",
  "备注"
];

const SAMPLE_ROW = [
  1,
  "2026 酱料陈列升级",
  "吊旗: 正反面 320mm*267mm",
  "华东大区",
  320,
  267,
  "KA 陈列用，需突出促销价格信息，配合端架使用。"
];

export async function downloadBatchTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LKK POSM";
  wb.created = new Date();

  const refWs = wb.addWorksheet("参考数据");
  refWs.state = "veryHidden";
  refWs.getCell(1, 1).value = "POSM名称";
  refWs.getCell(1, 2).value = "宽度";
  refWs.getCell(1, 3).value = "高度";
  posmNames.forEach((name, i) => {
    const row = i + 2;
    refWs.getCell(row, 1).value = name;
    const preset = getSizePreset(name);
    refWs.getCell(row, 2).value = preset?.width ?? "";
    refWs.getCell(row, 3).value = preset?.height ?? "";
  });

  const ws = wb.addWorksheet("批量提交", {
    properties: { defaultColWidth: 22 }
  });

  ws.columns = [
    { width: 8 },
    { width: 24 },
    { width: 32 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 40 }
  ];

  const headerRow = ws.addRow(HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD9D9D9" } }
    };
    cell.alignment = { vertical: "middle" };
  });

  const sampleRow = ws.addRow(SAMPLE_ROW);
  sampleRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
  });

  const refRange = `'参考数据'!$A$2:$C$${posmNames.length + 1}`;

  for (let row = 3; row <= 502; row++) {
    ws.getCell(row, 1).value = { formula: `IF(B${row}="","",ROW()-1)` } as ExcelJS.CellFormulaValue;
    ws.getCell(row, 1).font = { color: { argb: "FF999999" } };
    ws.getCell(row, 1).alignment = { horizontal: "center" };

    ws.getCell(row, 5).value = { formula: `IF(C${row}="","",IFERROR(VLOOKUP(C${row},${refRange},2,FALSE),""))` } as ExcelJS.CellFormulaValue;
    ws.getCell(row, 6).value = { formula: `IF(C${row}="","",IFERROR(VLOOKUP(C${row},${refRange},3,FALSE),""))` } as ExcelJS.CellFormulaValue;
  }

  const campaignList = `"${campaigns.join(",")}"`;
  const posmList = `"${[...posmNames].join(",")}"`;
  const regionList = `"${regions.join(",")}"`;

  for (let row = 2; row <= 502; row++) {
    ws.getCell(row, 2).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [campaignList],
      showErrorMessage: true,
      errorTitle: "无效值",
      error: "请从下拉列表中选择 Campaign"
    };

    ws.getCell(row, 3).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [posmList],
      showErrorMessage: true,
      errorTitle: "无效值",
      error: "请从下拉列表中选择 POSM 名称"
    };

    ws.getCell(row, 4).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [regionList],
      showErrorMessage: true,
      errorTitle: "无效值",
      error: "请从下拉列表中选择大区/城市/市场"
    };

    ws.getCell(row, 5).dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "格式错误",
      error: "宽度必须为正数"
    };

    ws.getCell(row, 6).dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "格式错误",
      error: "高度必须为正数"
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "LKK_POSM_Batch_Template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
