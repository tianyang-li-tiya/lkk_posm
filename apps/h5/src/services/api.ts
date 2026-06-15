import { validateSize } from "../domain/templateRules";
import type { FeishuUser } from "./feishu";
import {
  makeBatchId,
  makeMockLinks,
  makeTaskId,
  makeTrace,
  regions,
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

export async function validateBatchFile(file: File): Promise<BatchValidationRow[]> {
  await latency(260);
  if (!file.name.endsWith(".xlsx")) {
    return [
      {
        rowNumber: 1,
        campaign: "-",
        posmName: "包柱: 80cm*200cm",
        region: "-",
        width: 0,
        height: 0,
        valid: false,
        errors: ["请上传 .xlsx 格式的 Excel 模板"]
      }
    ];
  }

  return [
    {
      rowNumber: 2,
      campaign: "夏季火锅主题",
      posmName: "吊旗: 正反面 320mm*267mm",
      region: regions[1],
      width: 320,
      height: 267,
      valid: true,
      errors: []
    },
    {
      rowNumber: 3,
      campaign: "新品铺市",
      posmName: "包柱: 80cm*200cm",
      region: regions[2],
      width: 380,
      height: 400,
      valid: false,
      errors: ["当前尺寸需与 POSM名称中的尺寸一致"]
    },
    {
      rowNumber: 4,
      campaign: "KA 门店端架",
      posmName: "地堆简易版头卡 0.9m*0.6m",
      region: regions[0],
      width: 900,
      height: 600,
      valid: true,
      errors: []
    }
  ];
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
      region: row.region,
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
