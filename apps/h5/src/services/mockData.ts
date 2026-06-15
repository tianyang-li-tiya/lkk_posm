import { type PosmName } from "../domain/templateRules";
import { getMockRequesterUser, type FeishuUser } from "./feishu";

export type TaskStatus =
  | "submitted"
  | "generating"
  | "generation_failed"
  | "reviewing"
  | "rejected"
  | "manual_fixing"
  | "approved"
  | "notification_failed"
  | "notified"
  | "cancelled";

export type SubmissionType = "single" | "batch";

export type TraceEventType =
  | "SUBMITTED"
  | "BATCH_VALIDATED"
  | "TASK_CREATED"
  | "GENERATION_STARTED"
  | "GENERATION_SUCCEEDED"
  | "GENERATION_FAILED"
  | "DRIVE_UPLOADED"
  | "BASE_SYNCED"
  | "REVIEW_REQUESTED"
  | "REVIEW_REJECTED"
  | "MANUAL_FIX_STARTED"
  | "MANUAL_FIX_CONFIRMED"
  | "RELEASE_APPROVED"
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_FAILED";

export type TraceEvent = {
  id: string;
  eventType: TraceEventType;
  actor: string;
  actorRole: "需求方" | "James" | "IT" | "系统";
  timestamp: string;
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  comment: string;
  artifactLink?: string;
  source: "H5" | "backend" | "scheduler" | "Base" | "Drive" | "bot";
  visibility: "需求方可见" | "仅 James 与 IT 可见";
};

export type PosmTask = {
  taskId: string;
  batchId?: string;
  submissionType: SubmissionType;
  campaign: string;
  posmName: PosmName;
  width: number;
  height: number;
  region: string;
  requester: FeishuUser;
  remark: string;
  status: TaskStatus;
  baseRecordId: string;
  pngPreviewUrl?: string;
  cloudFolderUrl?: string;
  svgUrl?: string;
  reviewer: string;
  ratio: number;
  createdAt: string;
  updatedAt: string;
  releaseAllowed: boolean;
  baseReleaseChecked: boolean;
  notifiedRequester: boolean;
  reviewComment?: string;
  errorMessage?: string;
  trace: TraceEvent[];
};

export type PosmBatch = {
  batchId: string;
  requester: FeishuUser;
  createdAt: string;
  updatedAt: string;
  totalCount: number;
  doneCount: number;
  failedCount: number;
  status: TaskStatus;
  items: PosmTask[];
};

export type PosmRecord =
  | { kind: "task"; id: string; status: TaskStatus; updatedAt: string; task: PosmTask }
  | { kind: "batch"; id: string; status: TaskStatus; updatedAt: string; batch: PosmBatch };

export type CreateTaskInput = {
  campaign: string;
  posmName: PosmName;
  width: number;
  height: number;
  region: string;
  requester: FeishuUser;
  remark: string;
  submissionType?: SubmissionType;
  batchId?: string;
};

export type BatchValidationRow = {
  rowNumber: number;
  campaign: string;
  posmName: PosmName;
  region: string;
  width: number;
  height: number;
  remark: string;
  valid: boolean;
  errors: string[];
};

export const campaigns = ["2026 酱料陈列升级", "夏季火锅主题", "KA 门店端架", "新品铺市"];
export const regions = ["华东大区", "华南大区", "华北大区", "西南大区"];

const requester = getMockRequesterUser();

export const taskStore = new Map<string, PosmTask>();
export const batchStore = new Map<string, PosmBatch>();

export function makeTaskId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `POSM-${stamp}-${suffix}`;
}

export function makeBatchId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `BATCH-${stamp}-${suffix}`;
}

export function makeMockLinks(taskId: string) {
  return {
    baseRecordId: `rec_${taskId.slice(-4).toLowerCase()}`,
    pngPreviewUrl: `https://tezign.feishu.cn/file/${taskId}-preview-png`,
    cloudFolderUrl: `https://tezign.feishu.cn/drive/folder/${taskId}`,
    svgUrl: `https://tezign.feishu.cn/file/${taskId}-final-svg`
  };
}

export function makeTrace(event: Omit<TraceEvent, "id" | "timestamp">, timestamp = new Date().toISOString()): TraceEvent {
  return {
    ...event,
    id: `${event.eventType}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp
  };
}

export function statusLabel(status: TaskStatus) {
  const map: Record<TaskStatus, string> = {
    submitted: "已提交",
    generating: "生成中",
    generation_failed: "生成失败",
    reviewing: "待 Base 审核",
    rejected: "审核拒绝",
    manual_fixing: "人工修正中",
    approved: "已通过",
    notification_failed: "通知失败",
    notified: "已通知取用",
    cancelled: "已取消"
  };
  return map[status];
}

export function statusProgress(status: TaskStatus) {
  const order: TaskStatus[] = ["submitted", "generating", "reviewing", "manual_fixing", "approved", "notified"];
  if (status === "generation_failed" || status === "rejected" || status === "cancelled") return 45;
  if (status === "notification_failed") return 86;
  const index = order.includes(status) ? order.indexOf(status) : 0;
  return Math.round(((index + 1) / order.length) * 100);
}

export function isTerminalStatus(status: TaskStatus) {
  return status === "notified" || status === "cancelled";
}

export function aggregateBatchStatus(items: PosmTask[]): TaskStatus {
  if (items.length === 0) return "submitted";
  if (items.some((item) => item.status === "generation_failed" || item.status === "notification_failed" || item.status === "rejected")) {
    return "notification_failed";
  }
  if (items.some((item) => item.status === "manual_fixing")) return "manual_fixing";
  if (items.some((item) => item.status === "reviewing")) return "reviewing";
  if (items.every((item) => item.status === "notified")) return "notified";
  if (items.some((item) => item.status === "generating")) return "generating";
  if (items.some((item) => item.status === "approved")) return "approved";
  return "submitted";
}

export function upsertBatch(batchId: string) {
  const items = Array.from(taskStore.values()).filter((task) => task.batchId === batchId).sort((a, b) => a.taskId.localeCompare(b.taskId));
  if (!items.length) return undefined;
  const timestamps = items.map((item) => new Date(item.updatedAt).getTime());
  const status = aggregateBatchStatus(items);
  const batch: PosmBatch = {
    batchId,
    requester: items[0].requester,
    createdAt: new Date(Math.min(...timestamps)).toISOString(),
    updatedAt: new Date(Math.max(...timestamps)).toISOString(),
    totalCount: items.length,
    doneCount: items.filter((item) => item.status === "notified").length,
    failedCount: items.filter((item) => item.status === "generation_failed" || item.status === "notification_failed" || item.status === "rejected").length,
    status,
    items
  };
  batchStore.set(batchId, batch);
  return batch;
}

function seedTask(partial: Omit<CreateTaskInput, "requester"> & {
  taskId: string;
  status: TaskStatus;
  requester?: FeishuUser;
  reviewComment?: string;
  notifiedRequester?: boolean;
  createdAt?: string;
  updatedAt?: string;
}) {
  const links = makeMockLinks(partial.taskId);
  const now = partial.createdAt ?? new Date().toISOString();
  const updatedAt = partial.updatedAt ?? now;
  const releaseAllowed = partial.status === "approved" || partial.status === "notified";
  const task: PosmTask = {
    ...partial,
    requester: partial.requester ?? requester,
    submissionType: partial.submissionType ?? "single",
    reviewer: "James Liu",
    ratio: Number((partial.width / partial.height).toFixed(2)),
    createdAt: now,
    updatedAt,
    releaseAllowed,
    baseReleaseChecked: releaseAllowed,
    notifiedRequester: partial.notifiedRequester ?? partial.status === "notified",
    baseRecordId: links.baseRecordId,
    pngPreviewUrl: partial.status === "generating" ? undefined : links.pngPreviewUrl,
    cloudFolderUrl: partial.status === "generating" ? undefined : links.cloudFolderUrl,
    svgUrl: partial.status === "generating" ? undefined : links.svgUrl,
    trace: [
      makeTrace({
        eventType: "SUBMITTED",
        actor: requester.name,
        actorRole: "需求方",
        toStatus: "submitted",
        comment: "需求方在应用页面提交需求。",
        source: "H5",
        visibility: "需求方可见"
      }, now),
      makeTrace({
        eventType: "GENERATION_SUCCEEDED",
        actor: "系统",
        actorRole: "系统",
        fromStatus: "generating",
        toStatus: partial.status === "generating" ? "generating" : "reviewing",
        comment: partial.status === "generating" ? "生成任务正在处理中。" : "已生成预览图并同步云盘与 Base，James 将从 Base 里的 Drive 链接进入审核。",
        artifactLink: partial.status === "generating" ? undefined : links.cloudFolderUrl,
        source: "backend",
        visibility: "需求方可见"
      }, updatedAt)
    ]
  };
  taskStore.set(task.taskId, task);
  if (task.batchId) upsertBatch(task.batchId);
}

seedTask({
  taskId: "POSM-20260614-0831",
  submissionType: "single",
  campaign: "2026 酱料陈列升级",
  posmName: "包柱: 80cm*200cm",
  width: 800,
  height: 2000,
  region: "华东大区",
  remark: "门店端架使用，需保留品牌红和促销价签位。",
  status: "reviewing",
  createdAt: "2026-06-14T08:31:00+08:00",
  updatedAt: "2026-06-14T11:20:00+08:00"
});

seedTask({
  taskId: "POSM-20260613-2194",
  batchId: "BATCH-20260613-128",
  submissionType: "batch",
  campaign: "夏季火锅主题",
  posmName: "吊旗: 正反面 320mm*267mm",
  width: 320,
  height: 267,
  region: "华南大区",
  remark: "批量上传第 2 行。",
  status: "manual_fixing",
  reviewComment: "门店售价露出不够清晰，需人工替换一版。",
  createdAt: "2026-06-13T10:12:00+08:00",
  updatedAt: "2026-06-14T15:40:00+08:00"
});

seedTask({
  taskId: "POSM-20260613-7821",
  batchId: "BATCH-20260613-128",
  submissionType: "batch",
  campaign: "夏季火锅主题",
  posmName: "地贴. 1200mm*450mm",
  width: 1200,
  height: 450,
  region: "华南大区",
  remark: "批量上传第 4 行。",
  status: "reviewing",
  createdAt: "2026-06-13T10:12:00+08:00",
  updatedAt: "2026-06-13T17:30:00+08:00"
});

seedTask({
  taskId: "POSM-20260610-6672",
  submissionType: "single",
  campaign: "KA 门店端架",
  posmName: "地堆简易版头卡 0.9m*0.6m",
  width: 900,
  height: 600,
  region: "华北大区",
  remark: "已完成并通知门店团队。",
  status: "notified",
  notifiedRequester: true,
  createdAt: "2026-06-10T09:15:00+08:00",
  updatedAt: "2026-06-11T16:05:00+08:00"
});
