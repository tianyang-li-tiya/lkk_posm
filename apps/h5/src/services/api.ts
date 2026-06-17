import ExcelJS from "exceljs";
import { getPosmValueByLabel, posmLabels, validateNumericField, validateOptionField, validateSize } from "../domain/templateRules";
import type { FeishuUser } from "./feishu";
import {
  campaigns,
  makeBatchId,
  makeMockLinks,
  makeTaskId,
  makeTrace,
  batchStore,
  taskStore,
  upsertBatch,
  type BatchValidationRow,
  type CreateTaskInput,
  type PosmBatch,
  type PosmRecord,
  type PosmTask,
  type TaskStatus
} from "./mockData";

export type SingleSubmitInput = Omit<CreateTaskInput, "submissionType" | "batchId">;

const latency = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

function buildTask(input: CreateTaskInput, status: TaskStatus = "reviewing"): PosmTask {
  const validation = validateSize(input.posmName, input.width, input.height);

  if (!validation.valid || validation.ratio === null) {
    throw new Error(validation.errors.join("；"));
  }

  const taskId = makeTaskId();
  const links = makeMockLinks(taskId);
  const now = new Date().toISOString();
  const task: PosmTask = {
    ...input,
    taskId,
    submissionType: input.submissionType ?? "single",
    status,
    reviewer: "James Liu",
    ratio: validation.ratio,
    createdAt: now,
    updatedAt: now,
    releaseAllowed: false,
    baseReleaseChecked: false,
    notifiedRequester: false,
    ...links,
    trace: [
      makeTrace({
        eventType: input.submissionType === "batch" ? "BATCH_VALIDATED" : "SUBMITTED",
        actor: input.requester.name,
        actorRole: "需求方",
        toStatus: "submitted",
        comment: input.submissionType === "batch" ? "批量文件校验通过，创建任务。" : "需求方在应用页面提交需求。",
        source: "H5",
        visibility: "需求方可见"
      }, now),
      makeTrace({
        eventType: "GENERATION_STARTED",
        actor: "系统",
        actorRole: "系统",
        fromStatus: "submitted",
        toStatus: "generating",
        comment: "系统开始生成 POSM。",
        source: "backend",
        visibility: "需求方可见"
      }, now),
      makeTrace({
        eventType: "GENERATION_SUCCEEDED",
        actor: "系统",
        actorRole: "系统",
        fromStatus: "generating",
        toStatus: "reviewing",
        comment: "生成完成，已上传云盘，并将预览图、最终链接和云盘目录同步到 Base。",
        artifactLink: links.cloudFolderUrl,
        source: "backend",
        visibility: "需求方可见"
      }, now),
      makeTrace({
        eventType: "REVIEW_REQUESTED",
        actor: "系统",
        actorRole: "系统",
        fromStatus: "generating",
        toStatus: "reviewing",
        comment: "任务进入飞书多维表格审核队列；James 从 Base 记录里的 Drive 链接进入云盘查看和处理。",
        source: "Base",
        visibility: "仅 James 与 IT 可见"
      }, now)
    ]
  };

  return task;
}

export async function createTask(input: SingleSubmitInput): Promise<PosmTask> {
  await latency();
  const task = buildTask({ ...input, submissionType: "single" });
  taskStore.set(task.taskId, task);
  return task;
}

export type BatchFileError = { type: "file"; message: string };

const MAX_FILE_SIZE_MB = 10;
const MAX_ROW_COUNT = 500;
const EXPECTED_HEADERS = ["需求方", "Campaign", "POSM名称", "大区/城市/市场", "宽度 mm", "高度 mm", "备注"];

export function validateBatchFileLevel(file: File): BatchFileError | null {
  if (!file.name.endsWith(".xlsx")) return { type: "file", message: "仅支持 .xlsx 格式" };
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return { type: "file", message: `文件大小超过 ${MAX_FILE_SIZE_MB} MB 限制` };
  return null;
}

function validateBatchRow(row: { campaign: string; posmLabel: string; width: string; height: string; remark: string }): string[] {
  const errors: string[] = [];
  errors.push(...validateOptionField(row.campaign, campaigns, "Campaign"));
  errors.push(...validateOptionField(row.posmLabel, posmLabels, "POSM 名称"));
  errors.push(...validateNumericField(row.width, "宽度"));
  errors.push(...validateNumericField(row.height, "高度"));
  if (errors.length === 0) {
    const posmValue = getPosmValueByLabel(row.posmLabel) ?? row.posmLabel;
    const sizeResult = validateSize(posmValue, Number(row.width), Number(row.height));
    errors.push(...sizeResult.errors);
  }
  if (row.remark && row.remark.length > 500) errors.push("备注超过 500 字");
  return errors;
}

export async function validateBatchFile(file: File): Promise<BatchValidationRow[]> {
  const fileError = validateBatchFileLevel(file);
  if (fileError) {
    return [{ rowNumber: 1, campaign: "-", posmName: "-", width: 0, height: 0, remark: "", valid: false, errors: [fileError.message] }];
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  const ws = wb.getWorksheet("批量提交") ?? wb.worksheets[0];
  if (!ws) {
    return [{ rowNumber: 1, campaign: "-", posmName: "-", width: 0, height: 0, remark: "", valid: false, errors: ["未找到有效工作表"] }];
  }

  const rowCount = ws.rowCount;
  if (rowCount < 2) {
    return [{ rowNumber: 1, campaign: "-", posmName: "-", width: 0, height: 0, remark: "", valid: false, errors: ["文件中无数据行"] }];
  }

  const results: BatchValidationRow[] = [];

  for (let rowIdx = 2; rowIdx <= rowCount; rowIdx++) {
    const row = ws.getRow(rowIdx);
    const cellVal = (col: number) => {
      const cell = row.getCell(col);
      if (cell.value === null || cell.value === undefined) return "";
      if (typeof cell.value === "object") {
        if ("result" in cell.value) return String(cell.value.result ?? "");
        if ("formula" in cell.value) return "";
        return "";
      }
      return String(cell.value);
    };

    const campaignVal = cellVal(2).trim();
    const posmNameVal = cellVal(3).trim();
    const widthVal = cellVal(4).trim();
    const heightVal = cellVal(5).trim();
    const remarkVal = cellVal(6).trim();

    const isEmpty = !campaignVal && !posmNameVal && !widthVal && !heightVal && !remarkVal;
    if (isEmpty) continue;

    if (results.length >= MAX_ROW_COUNT) {
      return [{ rowNumber: 1, campaign: "-", posmName: "-", width: 0, height: 0, remark: "", valid: false, errors: [`数据行数超过 ${MAX_ROW_COUNT} 行限制`] }];
    }

    const errors = validateBatchRow({
      campaign: campaignVal,
      posmLabel: posmNameVal,
      width: widthVal,
      height: heightVal,
      remark: remarkVal
    });

    const resolvedPosmName = getPosmValueByLabel(posmNameVal) ?? posmNameVal;

    results.push({
      rowNumber: rowIdx,
      campaign: campaignVal || "-",
      posmName: (resolvedPosmName || "-") as BatchValidationRow["posmName"],
      width: Number(widthVal) || 0,
      height: Number(heightVal) || 0,
      remark: remarkVal,
      valid: errors.length === 0,
      errors
    });
  }

  if (results.length === 0) {
    return [{ rowNumber: 1, campaign: "-", posmName: "-", width: 0, height: 0, remark: "", valid: false, errors: ["文件中无有效数据行（全部为空行）"] }];
  }

  return results;
}

export function generateErrorReport(rows: BatchValidationRow[]): Blob {
  const errorRows = rows.filter((r) => !r.valid);
  const csvLines = ["行号,Campaign,POSM名称,宽度 mm,高度 mm,备注,错误原因"];
  errorRows.forEach((row, i) => {
    const remark = row.remark.replace(/"/g, '""');
    const errors = row.errors.join("；").replace(/"/g, '""');
    csvLines.push(`${i + 1},"${row.campaign}","${row.posmName}",${row.width},${row.height},"${remark}","${errors}"`);
  });
  return new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
}

export async function createBatchTasks(rows: BatchValidationRow[], requester: FeishuUser): Promise<{ batchId: string; batch: PosmBatch; tasks: PosmTask[] }> {
  await latency(260);
  const batchId = makeBatchId();
  const validRows = rows.filter((row) => row.valid);
  const tasks = validRows.map((row) => {
    const task = buildTask({
      batchId,
      submissionType: "batch",
      campaign: row.campaign,
      posmName: row.posmName,
      width: row.width,
      height: row.height,
      requester,
      remark: `批量上传第 ${row.rowNumber} 行`
    });
    taskStore.set(task.taskId, task);
    return task;
  });
  const batch = upsertBatch(batchId);
  return { batchId, batch: batch!, tasks };
}

export async function getTask(taskId: string): Promise<PosmTask | null> {
  await latency(90);
  return taskStore.get(taskId) ?? null;
}

export async function getBatch(batchId: string): Promise<PosmBatch | null> {
  await latency(90);
  return upsertBatch(batchId) ?? batchStore.get(batchId) ?? null;
}

export async function listMyPosmRecords(user: FeishuUser): Promise<PosmRecord[]> {
  await latency(120);
  const singleTasks: PosmRecord[] = Array.from(taskStore.values())
    .filter((task) => task.requester.openId === user.openId && !task.batchId)
    .map((task) => ({ kind: "task", id: task.taskId, status: task.status, updatedAt: task.updatedAt, task }));
  const batches: PosmRecord[] = [];
  for (const batchId of batchStore.keys()) {
    const batch = upsertBatch(batchId);
    if (batch && batch.requester.openId === user.openId) {
      batches.push({ kind: "batch", id: batch.batchId, status: batch.status, updatedAt: batch.updatedAt, batch });
    }
  }
  return [...singleTasks, ...batches].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function listMyPosmTasks(user: FeishuUser): Promise<PosmTask[]> {
  await latency(120);
  return Array.from(taskStore.values())
    .filter((task) => task.requester.openId === user.openId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
