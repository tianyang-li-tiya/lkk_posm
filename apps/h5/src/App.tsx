import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Home,
  Loader2,
  LogOut,
  PenLine,
  Send,
  Settings,
  Upload,
  UserRound,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSizePreset, posmNames, validateSize, type PosmName } from "./domain/templateRules";
import {
  createBatchTasks,
  createTask,
  generateErrorReport,
  getBatch,
  getTask,
  listMyPosmRecords,
  validateBatchFile,
  validateBatchFileLevel
} from "./services/api";
import { downloadBatchTemplate } from "./services/excelTemplate";
import { getCurrentFeishuUser, type FeishuUser } from "./services/feishu";
import {
  campaigns,
  regions,
  statusLabel,
  statusProgress,
  type BatchValidationRow,
  type PosmBatch,
  type PosmRecord,
  type PosmTask,
  type TaskStatus
} from "./services/mockData";

type Route =
  | { name: "home" }
  | { name: "submit" }
  | { name: "tasks" }
  | { name: "batchDetail"; batchId: string }
  | { name: "taskDetail"; taskId: string };

type SubmitMode = "single" | "batch";
type RecordStatusFilter = "all" | "active" | "reviewing" | "manual_fixing" | "rejected" | "notified" | "exception";
type ProgressFilter = "all" | "lt50" | "50to80" | "gte80";
type TimeFilter = "all" | "today" | "7d" | "30d";
type BreadcrumbItem = {
  label: string;
  path?: string;
};

type FormState = {
  campaign: string;
  posmName: "" | PosmName;
  width: string;
  height: string;
  region: string;
  remark: string;
};

const emptyForm: FormState = {
  campaign: "",
  posmName: "",
  width: "",
  height: "",
  region: "",
  remark: ""
};

function parseRoute(): Route {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { name: "home" };
  if (segments[0] === "submit") return { name: "submit" };
  if (segments[0] === "history") return { name: "tasks" };
  if (segments[0] === "tasks") return { name: "tasks" };
  if (segments[0] === "review") return { name: "tasks" };
  return { name: "home" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [user, setUser] = useState<FeishuUser | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute());
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/review")) {
      window.history.replaceState({}, "", "/tasks");
      setRoute({ name: "tasks" });
    }
  }, [route.name]);

  useEffect(() => {
    if (signedOut) return;
    getCurrentFeishuUser("requester").then(setUser);
  }, [route.name, signedOut]);

  function logout() {
    setSignedOut(true);
    setUser(null);
    navigate("/");
  }

  function loginAgain() {
    setSignedOut(false);
  }

  return (
    <main className="app-shell">
      <Header route={route} user={user} signedOut={signedOut} onLogout={logout} onLogin={loginAgain} />
      {!signedOut && <Breadcrumb route={route} />}
      {signedOut ? (
        <SignedOutPage onLogin={loginAgain} />
      ) : (
        <>
          {route.name === "home" && <HomePage user={user} />}
          {route.name === "submit" && <SubmitPage user={user} />}
          {route.name === "tasks" && <MyPosmPage user={user} />}
        </>
      )}
    </main>
  );
}

function Header({
  route,
  user,
  signedOut,
  onLogout,
  onLogin
}: {
  route: Route;
  user: FeishuUser | null;
  signedOut: boolean;
  onLogout: () => void;
  onLogin: () => void;
}) {
  const active = route.name;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <button className="brand-mark" onClick={() => navigate("/")} aria-label="返回工作台">
        <span className="brand-seal">LKK</span>
        <span>
          <strong>LKK POSM</strong>
        </span>
      </button>

      <nav className="route-tabs" aria-label="页面导航">
        <NavButton active={active === "home"} icon={<Home size={16} />} label="工作台" path="/" />
        <NavButton active={active === "submit"} icon={<Send size={16} />} label="提交" path="/submit" />
        <NavButton active={active === "tasks" || active === "taskDetail" || active === "batchDetail"} icon={<ClipboardList size={16} />} label="我的 POSM" path="/tasks" />
      </nav>

      <div className="user-menu">
        <button className="identity-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu">
          <span className="identity-avatar">
            <UserRound size={16} />
          </span>
          <span>{signedOut ? "未登录" : user?.name?.slice(0, 1) ?? "识别中"}</span>
          <Settings size={15} />
        </button>
        {menuOpen && (
          <div className="user-popover" role="menu">
            <div className="user-popover-profile">
              <span className="identity-avatar">
                <UserRound size={16} />
              </span>
              <div>
                <strong>{signedOut ? "未登录" : user?.name ?? "飞书身份识别中"}</strong>
                <small>{signedOut ? "身份已退出" : user ? `${user.department} · 需求方` : "等待飞书免登"}</small>
              </div>
            </div>
            {signedOut ? (
              <button className="popover-action" onClick={onLogin}>重新进入</button>
            ) : (
              <button className="popover-action danger" onClick={onLogout} disabled={!user}>
                <LogOut size={15} />
                退出登录
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function Breadcrumb({ route }: { route: Route }) {
  const crumbs = getBreadcrumb(route);

  return (
    <nav className="breadcrumb" aria-label="当前位置">
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const path = crumb.path;
          return (
            <li key={`${crumb.label}-${index}`} aria-current={isLast ? "page" : undefined}>
              {path && !isLast ? (
                <button onClick={() => navigate(path)}>{crumb.label}</button>
              ) : (
                <span>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getBreadcrumb(route: Route): BreadcrumbItem[] {
  const home: BreadcrumbItem = { label: "工作台", path: "/" };
  if (route.name === "submit") return [home, { label: "提交需求" }];
  if (route.name === "tasks") return [home, { label: "我的 POSM" }];
  if (route.name === "batchDetail") return [home, { label: "我的 POSM", path: "/tasks" }, { label: "批次详情" }, { label: route.batchId }];
  if (route.name === "taskDetail") return [home, { label: "我的 POSM", path: "/tasks" }, { label: "POSM 详情" }, { label: route.taskId }];
  return [{ label: "工作台" }];
}

function NavButton({ active, icon, label, path }: { active: boolean; icon: ReactNode; label: string; path: string }) {
  return (
    <button className={active ? "active" : ""} onClick={() => navigate(path)}>
      {icon}
      {label}
    </button>
  );
}

function HomePage({ user }: { user: FeishuUser | null }) {
  void user;
  return (
    <section className="home-layout">
      <div className="workbench-hero">
        <div className="hero-copy">
          <p className="eyebrow">LKK POSM</p>
          <h1>POSM 生成需求管理</h1>
          <p>提交单个或批量 POSM 需求，跟踪生成、Base 审核和交付通知状态。生成文件存放在飞书云盘，审核流转以飞书多维表格为准。</p>
        </div>
      </div>

      <div className="entry-grid">
        <EntryCard
          icon={<Send size={22} />}
          title="提交需求"
          desc="单个表单提交，或通过 Excel 模板批量提交。"
          action="进入提交"
          onClick={() => navigate("/submit")}
        />
        <EntryCard
          icon={<ClipboardList size={22} />}
          title="我的 POSM"
          desc="查看全部提交记录，并用状态筛选进行中、异常和已完成结果。"
          action="查看 POSM"
          onClick={() => navigate("/tasks")}
        />
      </div>
    </section>
  );
}

function SignedOutPage({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="signed-out-panel">
      <div className="panel solo-panel">
        <UserRound size={34} />
        <span>已退出当前飞书身份</span>
        <p>原型环境不会调用真实飞书退出接口；重新进入会恢复 mock 飞书免登身份。</p>
        <button className="primary-action fit" onClick={onLogin}>重新进入工作台</button>
      </div>
    </section>
  );
}

function EntryCard({ icon, title, desc, action, onClick }: { icon: ReactNode; title: string; desc: string; action: string; onClick: () => void }) {
  return (
    <button className="entry-card" onClick={onClick}>
      <span className="entry-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{desc}</small>
      <span className="entry-action">
        {action}
        <ChevronRight size={16} />
      </span>
    </button>
  );
}

function SubmitPage({ user }: { user: FeishuUser | null }) {
  const [mode, setMode] = useState<SubmitMode>("single");

  return (
    <section className="submit-page">
      <div className="panel form-panel">
        <SectionKicker icon={<Send size={16} />} title="提交需求" meta={user ? `${user.name} · ${user.department}` : "飞书用户识别中"} />
        <SegmentedControl
          value={mode}
          options={[
            { value: "single", label: "单个提交", icon: <PenLine size={15} /> },
            { value: "batch", label: "批量提交", icon: <FileSpreadsheet size={15} /> }
          ]}
          onChange={setMode}
        />
        {mode === "single" ? <SingleSubmitForm user={user} /> : <BatchSubmit user={user} />}
      </div>
    </section>
  );
}

function SingleSubmitForm({ user }: { user: FeishuUser | null }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const width = Number(form.width);
  const height = Number(form.height);
  const sizeValidation = form.posmName && form.width && form.height ? validateSize(form.posmName, width, height) : null;
  const errors = getSingleFormErrors(form, sizeValidation?.errors ?? []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === "posmName") {
      const preset = getSizePreset(value);
      setForm((current) => ({
        ...current,
        posmName: value as PosmName,
        width: preset ? String(preset.width) : "",
        height: preset ? String(preset.height) : ""
      }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setTouched(true);
    setError("");
    if (!user || errors.length) return;
    setBusy(true);
    try {
      const task = await createTask({
        campaign: form.campaign,
        posmName: form.posmName as PosmName,
        width,
        height,
        region: form.region,
        requester: user,
        remark: form.remark
      });
      void task;
      navigate("/tasks");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="submit-form">
      <div className="field-grid">
        <ReadonlyField label="需求方" value={user ? `${user.name} / ${user.department}` : "飞书用户识别中"} />
        <SelectField label="Campaign" value={form.campaign} onChange={(value) => update("campaign", value)} options={campaigns} placeholder="请选择 Campaign" />
        <SelectField
          label="POSM名称"
          value={form.posmName}
          onChange={(value) => update("posmName", value as PosmName)}
          options={[...posmNames]}
          placeholder="请选择 POSM名称"
        />
        <SelectField label="大区/城市/市场" value={form.region} onChange={(value) => update("region", value)} options={regions} placeholder="请选择大区/城市/市场" />
        <InputField label="宽度 mm" value={form.width} onChange={(value) => update("width", value)} inputMode="numeric" placeholder="输入宽度" />
        <InputField label="高度 mm" value={form.height} onChange={(value) => update("height", value)} inputMode="numeric" placeholder="输入高度" />
      </div>
      <TextAreaField label="备注" value={form.remark} onChange={(value) => update("remark", value)} placeholder="选填，不超过 500 字" />
      {touched && errors.length > 0 && <ValidationBox errors={errors} />}
      {sizeValidation?.valid && <ValidationBox errors={[]} message={`尺寸校验通过 · 比例 ${sizeValidation.ratio}:1`} />}
      {error && <p className="inline-error">{error}</p>}
      <button className="primary-action" disabled={!user || busy} onClick={submit}>
        {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
        提交需求
      </button>
    </div>
  );
}

function getSingleFormErrors(form: FormState, sizeErrors: string[]) {
  const errors: string[] = [];
  if (!form.campaign) errors.push("请选择 Campaign");
  if (!form.posmName) errors.push("请选择 POSM名称");
  if (!form.region) errors.push("请选择大区/城市/市场");
  if (!form.width) errors.push("请输入宽度");
  if (!form.height) errors.push("请输入高度");
  if (form.remark.length > 500) errors.push("备注不能超过 500 字");
  return [...errors, ...sizeErrors];
}

function BatchSubmit({ user }: { user: FeishuUser | null }) {
  const [rows, setRows] = useState<BatchValidationRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const validCount = rows.filter((row) => row.valid).length;
  const errorCount = rows.length - validCount;

  async function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setResult("");
    setFileError("");
    setRows([]);

    const fileLevelError = validateBatchFileLevel(file);
    if (fileLevelError) {
      setFileError(fileLevelError.message);
      return;
    }

    setBusy(true);
    const nextRows = await validateBatchFile(file);
    setRows(nextRows);
    setBusy(false);
  }

  async function submitBatch() {
    if (!user || validCount === 0) return;
    setBusy(true);
    const { batchId, tasks } = await createBatchTasks(rows, user);
    setResult(`${batchId} 已创建 ${tasks.length} 条任务`);
    setBusy(false);
    navigate("/tasks");
  }

  function downloadErrorReport() {
    const blob = generateErrorReport(rows);
    const url = URL.createObjectURL(blob);
    const baseName = fileName.replace(/\.xlsx$/i, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_错误报告.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="batch-panel">
      <div className="batch-toolbar">
        <button className="secondary-action" onClick={() => { downloadBatchTemplate(); setResult("已下载 Excel 模板：LKK_POSM_Batch_Template.xlsx"); setTimeout(() => setResult(""), 3000); }}>
          <Download size={17} />
          下载 Excel 模板
        </button>
        <label className="upload-button">
          <Upload size={17} />
          上传 Excel
          <input type="file" accept=".xlsx" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="upload-state">
        <FileSpreadsheet size={20} />
        <span>{fileName || "尚未上传文件"}</span>
      </div>
      {fileError && <ValidationBox errors={[fileError]} />}
      {busy && <LoadingPanel label="校验批量文件" compact />}
      {rows.length > 0 && (
        <>
          <div className="batch-summary">
            <strong>{validCount}</strong>
            <span>行可提交</span>
            <strong>{errorCount}</strong>
            <span>行需修正</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行号</th>
                  <th>Campaign</th>
                  <th>POSM名称</th>
                  <th>大区</th>
                  <th>尺寸</th>
                  <th>备注</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.campaign}</td>
                    <td>{row.posmName}</td>
                    <td>{row.region}</td>
                    <td>{row.width} x {row.height} mm</td>
                    <td className="cell-remark">{row.remark ? (row.remark.length > 20 ? row.remark.slice(0, 20) + "…" : row.remark) : "-"}</td>
                    <td className={row.valid ? "cell-ok" : "cell-error"}>{row.valid ? "通过" : row.errors.join("；")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="batch-actions">
            <button className="primary-action" disabled={!user || busy || validCount === 0} onClick={submitBatch}>
              只提交通过行（{validCount} 条）
            </button>
            {errorCount > 0 && (
              <button className="secondary-action" onClick={downloadErrorReport}>
                <Download size={17} />
                下载错误报告
              </button>
            )}
          </div>
        </>
      )}
      {result && <p className="result-note">{result}</p>}
    </div>
  );
}

function MyPosmPage({ user }: { user: FeishuUser | null }) {
  const [records, setRecords] = useState<PosmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RecordStatusFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listMyPosmRecords(user).then((items) => {
      setRecords(items);
      setLoading(false);
    });
  }, [user]);

  const allTasks = records.flatMap((record) => (record.kind === "batch" ? record.batch.items : [record.task]));
  const taskFilter = (task: PosmTask) =>
    recordMatchesFilter(task.status, statusFilter) &&
    (campaignFilter === "all" || task.campaign === campaignFilter) &&
    progressMatchesFilter(statusProgress(task.status), progressFilter) &&
    timeMatchesFilter(task.createdAt, timeFilter);
  const filtered = records.filter((record) => (record.kind === "batch" ? record.batch.items.some(taskFilter) : taskFilter(record.task)));
  const stats = getRecordStats(allTasks);
  const campaignOptions = Array.from(new Set(allTasks.map((task) => task.campaign)));

  return (
    <section className="posm-workspace">
      <div className="posm-titlebar">
        <div>
          <SectionKicker icon={<ClipboardList size={16} />} title="我的 POSM" meta="单个直接展示，批量折叠按组查看" />
          <h1>POSM 任务台账</h1>
        </div>
        <Button onClick={() => navigate("/submit")}>
          <Send size={16} />
          新建需求
        </Button>
      </div>

      <div className="panel posm-main">
        <div className="posm-summary" aria-label="POSM 状态摘要">
          <span>全部 {stats.all}</span>
          <span>进行中 {stats.active}</span>
          <span>待审核 {stats.reviewing}</span>
          <span>异常 {stats.exception}</span>
          <span>已通知 {stats.notified}</span>
        </div>
        <div className="posm-filterbar">
          <RecordFilters
            status={statusFilter}
            campaign={campaignFilter}
            progress={progressFilter}
            time={timeFilter}
            campaigns={campaignOptions}
            onStatusChange={setStatusFilter}
            onCampaignChange={setCampaignFilter}
            onProgressChange={setProgressFilter}
            onTimeChange={setTimeFilter}
          />
        </div>
        <div className="posm-main-toolbar">
          <div>
            <strong>全部 POSM 记录</strong>
            <small>{loading ? "读取列表中" : `${filtered.length} 条记录，包含 ${allTasks.length} 条 POSM 明细`}</small>
          </div>
          <small className="toolbar-note">批量记录可展开查看明细，右侧跳转飞书云盘</small>
        </div>
        {loading ? (
          <LoadingPanel label="读取列表" compact />
        ) : records.length === 0 ? (
          <EmptyState title="暂无 POSM 记录" />
        ) : (
          <PosmRecordTable records={filtered} taskFilter={taskFilter} />
        )}
      </div>
    </section>
  );
}

function getRecordStats(tasks: PosmTask[]) {
  return tasks.reduce(
    (stats, record) => {
      stats.all += 1;
      if (recordMatchesFilter(record.status, "active")) stats.active += 1;
      if (record.status === "reviewing") stats.reviewing += 1;
      if (record.status === "manual_fixing") stats.manualFixing += 1;
      if (recordMatchesFilter(record.status, "exception")) stats.exception += 1;
      if (record.status === "notified") stats.notified += 1;
      return stats;
    },
    { all: 0, active: 0, reviewing: 0, manualFixing: 0, exception: 0, notified: 0 }
  );
}

function recordMatchesFilter(status: TaskStatus, filter: RecordStatusFilter) {
  if (filter === "all") return true;
  if (filter === "active") return ["submitted", "generating", "reviewing", "manual_fixing", "approved"].includes(status);
  if (filter === "exception") return ["generation_failed", "notification_failed", "rejected"].includes(status);
  return status === filter;
}

function progressMatchesFilter(progress: number, filter: ProgressFilter) {
  if (filter === "all") return true;
  if (filter === "lt50") return progress < 50;
  if (filter === "50to80") return progress >= 50 && progress < 80;
  return progress >= 80;
}

function timeMatchesFilter(value: string, filter: TimeFilter) {
  if (filter === "all") return true;
  const createdAt = new Date(value).getTime();
  const now = Date.now();
  if (Number.isNaN(createdAt)) return false;
  if (filter === "today") {
    const created = new Date(value);
    const today = new Date();
    return created.getFullYear() === today.getFullYear() && created.getMonth() === today.getMonth() && created.getDate() === today.getDate();
  }
  const days = filter === "7d" ? 7 : 30;
  return now - createdAt <= days * 24 * 60 * 60 * 1000;
}

function TaskDetailPage({ taskId }: { taskId: string }) {
  const { task, loading } = useTask(taskId);
  if (loading) return <LoadingPanel label="读取任务详情" />;
  if (!task) return <EmptyPanel title="任务未找到" actionLabel="返回工作台" onAction={() => navigate("/")} />;

  return (
    <section className="detail-page">
      <div className="panel detail-panel">
        <SectionKicker icon={<Clock3 size={16} />} title="任务详情" meta={task.taskId} />
        <StatusHero task={task} />
        <InfoGrid task={task} />
        <ResultBlock task={task} />
        <div className="action-row detail-actions">
          <button className="secondary-action" onClick={() => navigate("/tasks")}>返回列表</button>
          {task.notifiedRequester && task.svgUrl && (
            <a className="primary-action fit" href={task.svgUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              打开取用链接
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function BatchDetailPage({ batchId }: { batchId: string }) {
  const { batch, loading } = useBatch(batchId);
  if (loading) return <LoadingPanel label="读取批次详情" />;
  if (!batch) return <EmptyPanel title="批次未找到" actionLabel="返回我的 POSM" onAction={() => navigate("/tasks")} />;

  return (
    <section className="detail-page">
      <div className="panel detail-panel">
        <SectionKicker icon={<FileSpreadsheet size={16} />} title="批量提交详情" meta={batch.batchId} />
        <BatchStatusHero batch={batch} />
        <div className="info-grid">
          <Fact label="需求方" value={`${batch.requester.name} / ${batch.requester.department}`} />
          <Fact label="明细数量" value={`${batch.totalCount} 条`} />
          <Fact label="已通知取用" value={`${batch.doneCount} 条`} />
          <Fact label="异常/拒绝" value={`${batch.failedCount} 条`} />
        </div>
        <BatchItemsTable batch={batch} />
        <div className="action-row detail-actions">
          <button className="secondary-action" onClick={() => navigate("/tasks")}>返回我的 POSM</button>
        </div>
      </div>
    </section>
  );
}

function useTask(taskId: string) {
  const [task, setTask] = useState<PosmTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getTask(taskId).then((result) => {
      if (!mounted) return;
      setTask(result);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [taskId]);

  return { task, loading, setTask };
}

function useBatch(batchId: string) {
  const [batch, setBatch] = useState<PosmBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getBatch(batchId).then((result) => {
      if (!mounted) return;
      setBatch(result);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [batchId]);

  return { batch, loading };
}

function BatchStatusHero({ batch }: { batch: PosmBatch }) {
  return (
    <div className={`status-hero status-${batch.status}`}>
      <div>
        <StatusPill status={batch.status} />
        <h1>{batch.batchId}</h1>
        <p>批次下每条 POSM 独立同步 Base 审核状态和通知取用</p>
      </div>
      <div className="progress-ring" style={{ background: `conic-gradient(#D71920 ${Math.round((batch.doneCount / Math.max(batch.totalCount, 1)) * 100)}%, #F1E5DE 0)` }}>
        <span>{batch.doneCount}/{batch.totalCount}</span>
      </div>
    </div>
  );
}

function BatchItemsTable({ batch }: { batch: PosmBatch }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>明细任务</th>
            <th>POSM名称</th>
            <th>尺寸</th>
            <th>区域</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {batch.items.map((item) => (
            <tr key={item.taskId}>
              <td><strong>{item.taskId}</strong><small>{item.campaign}</small></td>
              <td>{item.posmName}</td>
              <td>{item.width} x {item.height} mm</td>
              <td>{item.region}</td>
              <td><StatusPill status={item.status} /></td>
              <td>
                <button className="text-action" onClick={() => navigate(`/tasks/${item.taskId}`)}>
                  查看
                  <ChevronRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordFilters({
  status,
  campaign,
  progress,
  time,
  campaigns: campaignOptions,
  onStatusChange,
  onCampaignChange,
  onProgressChange,
  onTimeChange
}: {
  status: RecordStatusFilter;
  campaign: string;
  progress: ProgressFilter;
  time: TimeFilter;
  campaigns: string[];
  onStatusChange: (value: RecordStatusFilter) => void;
  onCampaignChange: (value: string) => void;
  onProgressChange: (value: ProgressFilter) => void;
  onTimeChange: (value: TimeFilter) => void;
}) {
  const statusFilters: Array<[RecordStatusFilter, string]> = [
    ["all", "全部"],
    ["active", "进行中"],
    ["reviewing", "待 Base 审核"],
    ["manual_fixing", "人工修正中"],
    ["rejected", "审核拒绝"],
    ["notified", "已通知取用"],
    ["exception", "异常"]
  ];
  const progressFilters: Array<[ProgressFilter, string]> = [
    ["all", "全部进度"],
    ["lt50", "低于 50%"],
    ["50to80", "50%-80%"],
    ["gte80", "80% 以上"]
  ];
  const timeFilters: Array<[TimeFilter, string]> = [
    ["all", "全部时间"],
    ["today", "今天提交"],
    ["7d", "近 7 天"],
    ["30d", "近 30 天"]
  ];

  return (
    <div className="shadcn-filter-grid">
      <FilterSelect label="提交时间" value={time} onValueChange={(value) => onTimeChange(value as TimeFilter)}>
        {timeFilters.map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label="Campaign" value={campaign} onValueChange={onCampaignChange}>
        <SelectItem value="all">全部 Campaign</SelectItem>
        {campaignOptions.map((item) => (
          <SelectItem key={item} value={item}>{item}</SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label="POSM 状态" value={status} onValueChange={(value) => onStatusChange(value as RecordStatusFilter)}>
        {statusFilters.map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label="进度" value={progress} onValueChange={(value) => onProgressChange(value as ProgressFilter)}>
        {progressFilters.map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </FilterSelect>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  children
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="shadcn-filter-field">
      <span>{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  );
}

function PosmRecordTable({
  records,
  taskFilter
}: {
  records: PosmRecord[];
  taskFilter: (task: PosmTask) => boolean;
}) {
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const BATCH_COLORS = ["#D71920", "#2563EB", "#16A34A", "#9333EA", "#EA580C", "#0891B2"];
  const batchColorMap = new Map<string, string>();
  let colorIdx = 0;
  for (const record of records) {
    if (record.kind === "batch" && !batchColorMap.has(record.batch.batchId)) {
      batchColorMap.set(record.batch.batchId, BATCH_COLORS[colorIdx % BATCH_COLORS.length]);
      colorIdx++;
    }
  }

  if (!records.length) return <EmptyState title="没有符合条件的 POSM 记录" />;

  function toggleBatch(batchId: string) {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
  }

  function renderTaskRow(task: PosmTask, key: string, isBatchChild = false, batchColor?: string) {
    return (
      <TableRow key={key} className={isBatchChild ? "batch-child-row" : ""} style={isBatchChild ? { "--batch-color": batchColor } as React.CSSProperties : undefined}>
        <TableCell className={isBatchChild ? "pl-8 text-[#2b1916]" : "font-semibold text-[#2b1916]"}>
          {isBatchChild && <span className="batch-indent-bar" />}
          <span className={isBatchChild ? "text-sm" : "block"}>{task.taskId}</span>
        </TableCell>
        <TableCell>
          <Badge variant={isBatchChild ? "warning" : "secondary"}>
            {isBatchChild ? "批量提交" : "单个提交"}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="block font-medium">{task.requester.name}</span>
          <span className="mt-1 block text-xs text-[#786a62]">{task.requester.department}</span>
        </TableCell>
        <TableCell className="font-medium">{task.campaign}</TableCell>
        <TableCell><StatusBadge status={task.status} /></TableCell>
        <TableCell>
          <div className="grid min-w-[120px] gap-1">
            <div className="flex items-center justify-between text-xs text-[#786a62]">
              <span>{statusProgress(task.status)}%</span>
            </div>
            <Progress value={statusProgress(task.status)} />
          </div>
        </TableCell>
        <TableCell>
          <span className="line-clamp-2 font-medium">{task.posmName}</span>
          {task.remark && <span className="mt-1 block truncate text-xs text-[#786a62]">{task.remark}</span>}
        </TableCell>
        <TableCell>
          <span className="block">{task.width} x {task.height} mm</span>
          <span className="mt-1 block text-xs text-[#786a62]">{task.ratio}:1</span>
        </TableCell>
        <TableCell>{task.region}</TableCell>
        <TableCell><Badge variant="success">已确认</Badge></TableCell>
        <TableCell>{formatDateTime(task.createdAt)}</TableCell>
        <TableCell>{formatDateTime(task.updatedAt)}</TableCell>
        <TableCell className="feishu-jump-cell">
          <div className="feishu-jump-actions">
            {task.cloudFolderUrl && (
              <Button size="sm" asChild>
                <a href={task.cloudFolderUrl} target="_blank" rel="noreferrer">
                  <FolderOpen size={14} />
                  飞书网盘
                </a>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  function renderBatchRow(record: Extract<PosmRecord, { kind: "batch" }>) {
    const { batch } = record;
    const isExpanded = expandedBatches[batch.batchId] ?? false;
    const filteredItems = batch.items.filter(taskFilter);
    const uniqueCampaigns = Array.from(new Set(filteredItems.map((i) => i.campaign))).join("、");
    const campaignDisplay = uniqueCampaigns.length > 24 ? uniqueCampaigns.slice(0, 24) + "…" : uniqueCampaigns;

    return (
      <>
        <TableRow key={batch.batchId} className="batch-summary-row cursor-pointer" onClick={() => toggleBatch(batch.batchId)}>
          <TableCell className="font-semibold text-[#2b1916]">
            <span className="flex items-center gap-1">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{batch.batchId}</span>
            </span>
            <span className="mt-1 block text-xs font-medium text-[#786a62]">{filteredItems.length === batch.totalCount ? `${batch.totalCount} 条 POSM` : `${filteredItems.length}/${batch.totalCount} 条 POSM`}</span>
          </TableCell>
          <TableCell>
            <Badge variant="warning">批量提交</Badge>
          </TableCell>
          <TableCell>
            <span className="block font-medium">{batch.requester.name}</span>
            <span className="mt-1 block text-xs text-[#786a62]">{batch.requester.department}</span>
          </TableCell>
          <TableCell className="font-medium">
            <span className="block">{campaignDisplay}</span>
          </TableCell>
          <TableCell><StatusBadge status={batch.status} /></TableCell>
          <TableCell>
            <div className="grid min-w-[120px] gap-1">
              <div className="flex items-center justify-between text-xs text-[#786a62]">
                <span>{Math.round((batch.doneCount / Math.max(batch.totalCount, 1)) * 100)}%</span>
              </div>
              <Progress value={Math.round((batch.doneCount / Math.max(batch.totalCount, 1)) * 100)} />
            </div>
          </TableCell>
          <TableCell>
            <span className="text-xs text-[#786a62]">{isExpanded ? "" : "点击展开查看详情"}</span>
          </TableCell>
          <TableCell>
            <span className="text-xs text-[#786a62]">{isExpanded ? "" : "点击展开查看详情"}</span>
          </TableCell>
          <TableCell>-</TableCell>
          <TableCell>-</TableCell>
          <TableCell>{formatDateTime(batch.createdAt)}</TableCell>
          <TableCell>{formatDateTime(batch.updatedAt)}</TableCell>
          <TableCell className="feishu-jump-cell" onClick={(e) => e.stopPropagation()}>
            <div className="feishu-jump-actions">
              {batch.items[0]?.cloudFolderUrl && (
                <Button size="sm" asChild>
                  <a href={batch.items[0].cloudFolderUrl} target="_blank" rel="noreferrer">
                    <FolderOpen size={14} />
                    飞书网盘
                  </a>
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && filteredItems.map((task) => renderTaskRow(task, `${batch.batchId}-${task.taskId}`, true, batchColorMap.get(batch.batchId)))}
      </>
    );
  }

  return (
    <div className="posm-data-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[168px]">记录 ID</TableHead>
            <TableHead className="min-w-[96px]">来源</TableHead>
            <TableHead className="min-w-[130px]">需求方</TableHead>
            <TableHead className="min-w-[150px]">Campaign</TableHead>
            <TableHead className="min-w-[120px]">状态</TableHead>
            <TableHead className="min-w-[150px]">进度</TableHead>
            <TableHead className="min-w-[210px]">POSM名称</TableHead>
            <TableHead className="min-w-[130px]">尺寸 / 比例</TableHead>
            <TableHead className="min-w-[92px]">区域</TableHead>
            <TableHead className="min-w-[100px]">确认生成</TableHead>
            <TableHead className="min-w-[150px]">提交时间</TableHead>
            <TableHead className="min-w-[170px]">更新时间</TableHead>
            <TableHead className="feishu-jump-header min-w-[160px] text-center">飞书跳转</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            if (record.kind === "batch") return renderBatchRow(record);
            return renderTaskRow(record.task, record.task.taskId);
          })}
        </TableBody>
      </Table>
      <div className="posm-card-list">
        {records.map((record) => {
          const isBatch = record.kind === "batch";
          const task = isBatch ? record.batch.items[0] : record.task;
          return (
          <article className="posm-record-card" key={isBatch ? record.batch.batchId : task.taskId}>
            <span>
              <strong>{isBatch ? record.batch.batchId : task.taskId}</strong>
              <small>{isBatch ? `批量提交 · ${record.batch.totalCount} 条 POSM` : "单个提交"}</small>
            </span>
            <StatusBadge status={task.status} />
            <span>
              <b>{task.campaign}</b>
              <small>{task.posmName} · {task.width} x {task.height} mm · {formatDateTime(task.createdAt)}</small>
            </span>
            <div className="posm-card-actions">
              {task.cloudFolderUrl && (
                <Button size="sm" asChild>
                  <a href={task.cloudFolderUrl} target="_blank" rel="noreferrer">
                    <FolderOpen size={14} />
                    飞书网盘
                  </a>
                </Button>
              )}
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}


function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const variant =
    status === "notified" || status === "approved"
      ? "success"
      : status === "reviewing" || status === "manual_fixing"
        ? "warning"
        : status === "generation_failed" || status === "notification_failed" || status === "rejected"
          ? "danger"
          : "secondary";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function InfoGrid({ task }: { task: PosmTask }) {
  return (
    <div className="info-grid">
      <Fact label="需求方" value={`${task.requester.name} / ${task.requester.department}`} />
      <Fact label="Campaign" value={task.campaign} />
      <Fact label="POSM名称" value={task.posmName} />
      <Fact label="尺寸" value={`${task.width} x ${task.height} mm`} />
      <Fact label="大区/城市/市场" value={task.region} />
      <Fact label="Base 审核人" value={task.reviewer} />
      <Fact label="Base 记录" value={task.baseRecordId} />
    </div>
  );
}

function ResultBlock({ task }: { task: PosmTask }) {
  const hasResult = Boolean(task.pngPreviewUrl && task.cloudFolderUrl);
  if (!hasResult) {
    return (
      <div className="empty-preview compact-empty">
        <Clock3 size={30} />
        <strong>尚未生成结果</strong>
        <p>生成完成后才会展示 PNG 预览和云盘目录。</p>
      </div>
    );
  }

  return (
    <div className="result-block">
      <div className="generated-preview" aria-label="生成后 POSM 预览">
        <span>PNG Preview</span>
        <strong>{task.campaign}</strong>
        <small>{task.posmName} · {task.region}</small>
      </div>
      <div className="result-links">
        <a href={task.cloudFolderUrl} target="_blank" rel="noreferrer">
          <FolderOpen size={17} />
          飞书云盘目录
          <ExternalLink size={15} />
        </a>
        <a href={task.svgUrl} target="_blank" rel="noreferrer">
          <FileSpreadsheet size={17} />
          POSM SVG / 交付链接
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}

function StatusHero({ task }: { task: PosmTask }) {
  return (
    <div className={`status-hero status-${task.status}`}>
      <div>
        <StatusPill status={task.status} />
        <h1>{task.taskId}</h1>
        <p>{task.notifiedRequester ? "已通知需求方取用" : "James 在飞书多维表格中通过云盘链接审核，Base 放行前不会通知需求方"}</p>
      </div>
      <div className="progress-ring" style={{ background: `conic-gradient(#D71920 ${statusProgress(task.status)}%, #F1E5DE 0)` }}>
        <span>{statusProgress(task.status)}%</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  return <span className={`status-pill status-${status}`}>{statusLabel(status)}</span>;
}

function FlowStrip({ active }: { active: "submit" | "generate" | "review" | "notify" }) {
  const steps = [
    { key: "submit", label: "提交" },
    { key: "generate", label: "生成" },
    { key: "review", label: "Base 审核" },
    { key: "notify", label: "取用" }
  ] as const;
  return (
    <div className="flow-strip">
      {steps.map((step) => (
        <span key={step.key} className={active === step.key ? "active" : ""}>{step.label}</span>
      ))}
    </div>
  );
}

function ListPageFrame({
  icon,
  title,
  meta,
  loading,
  emptyTitle,
  actions,
  children
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  loading: boolean;
  emptyTitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel list-panel">
      <div className="list-header">
        <SectionKicker icon={icon} title={title} meta={meta} />
        {actions}
      </div>
      {loading ? <LoadingPanel label="读取列表" compact /> : children}
      {!loading && <span className="sr-only">{emptyTitle}</span>}
    </section>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string; icon: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option.value} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}>
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SectionKicker({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return (
    <div className="section-kicker">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{meta}</p>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  optionLabels,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  optionLabels?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{optionLabels?.[option] ?? option}</option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, value, placeholder, type = "text", inputMode, onChange }: { label: string; value: string; placeholder?: string; type?: string; inputMode?: "numeric"; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} inputMode={inputMode} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} rows={4} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field readonly-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function ValidationBox({ errors, message }: { errors: string[]; message?: string }) {
  return (
    <div className={errors.length ? "validation-box error" : "validation-box ok"}>
      {errors.length ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{errors.length ? errors.join("；") : message}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function LoadingPanel({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={compact ? "loading-inline" : "solo-panel"}>
      <Loader2 className="spin" size={compact ? 18 : 26} />
      <span>{label}</span>
    </div>
  );
}

function EmptyPanel({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="solo-panel">
      <AlertTriangle size={28} />
      <span>{title}</span>
      <button className="primary-action fit" onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <ClipboardList size={28} />
      <span>{title}</span>
    </div>
  );
}
