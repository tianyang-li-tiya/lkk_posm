import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarIcon,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Home,
  Image,
  Loader2,
  Maximize2,
  PenLine,
  Ruler,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSizePreset, getPosmLabel, posmCatalog, posmNames, validateSize } from "./domain/templateRules";
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
import logoImg from "./assets/logo.png";
import { getCurrentFeishuUser, type FeishuUser } from "./services/feishu";
import {
  campaigns,
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
type BreadcrumbItem = {
  label: string;
  path?: string;
};

type FormState = {
  campaign: string;
  posmName: string;
  width: string;
  height: string;
  remark: string;
};

const emptyForm: FormState = {
  campaign: "",
  posmName: "",
  width: "",
  height: "",
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
    getCurrentFeishuUser("requester").then(setUser);
  }, [route.name]);

  return (
    <main className="app-shell">
      <Header route={route} user={user} />
      {route.name !== "home" && route.name !== "tasks" && route.name !== "submit" && <Breadcrumb route={route} />}
      {route.name === "home" && <HomePage user={user} />}
      {route.name === "submit" && <SubmitPage user={user} />}
      {route.name === "tasks" && <MyPosmPage user={user} />}
    </main>
  );
}

function Header({
  route,
  user
}: {
  route: Route;
  user: FeishuUser | null;
}) {
  const active = route.name;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <button className="brand-mark" onClick={() => navigate("/")} aria-label="返回工作台">
        <img src={logoImg} alt="LKK" className="brand-logo" />
        <span>
          <strong>LKK POSM 生成器</strong>
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
          <span>{user?.name ?? "识别中"}</span>
        </button>
        {menuOpen && (
          <div className="user-popover" role="menu">
            <div className="user-popover-profile">
              <span className="identity-avatar">
                <UserRound size={16} />
              </span>
              <div>
                <strong>{user?.name ?? "识别中"}</strong>
                <small>{user?.email ?? ""}</small>
              </div>
            </div>
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
    <section className="home-layout-v2">
      <div className="hero-v2">
        <div className="hero-v2-dot-grid" aria-hidden="true" />
        <svg className="hero-v2-wave" aria-hidden="true" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M0,80 C300,110 500,50 700,80 C900,110 1100,50 1200,80 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.04)" />
        </svg>
        <div className="hero-v2-arc" aria-hidden="true" />
        <div className="hero-v2-content">
          <div className="hero-v2-copy">
            <p className="eyebrow">LEE KUM KEE</p>
            <h1>POSM 生成需求管理</h1>
            <p className="hero-v2-desc">提交单个或批量 POSM 需求，跟踪生成、Base 审核和交付通知状态。</p>
            <p className="hero-v2-desc">生成文件存放在飞书云盘，审核流转以飞书多维表格为准。</p>
          </div>
          <div className="hero-v2-illustration" aria-hidden="true">
            <div className="hero-illust-doc doc-back">
              <div className="doc-line" /><div className="doc-line" /><div className="doc-line short" />
            </div>
            <div className="hero-illust-doc doc-front">
              <div className="doc-corner" />
              <div className="doc-line" /><div className="doc-line" /><div className="doc-line short" /><div className="doc-line" />
            </div>
            <div className="hero-illust-badge">
              <CheckCircle2 size={22} />
            </div>
            <div className="hero-illust-sparkle">✦</div>
          </div>
        </div>
      </div>

      <div className="entry-grid-v2">
        <button className="entry-card-v2" onClick={() => navigate("/submit")}>
          <span className="entry-icon-v2 entry-icon-red"><Send size={20} /></span>
          <strong>提交需求</strong>
          <small>单个表单提交，或通过 Excel 模板批量提交。</small>
          <span className="entry-btn entry-btn-red">进入提交 <ChevronRight size={15} /></span>
        </button>
        <button className="entry-card-v2" onClick={() => navigate("/tasks")}>
          <span className="entry-icon-v2 entry-icon-gold"><ClipboardList size={20} /></span>
          <strong>我的 POSM</strong>
          <small>查看全部提交记录，并用状态筛选进行中、异常和已完成结果。</small>
          <span className="entry-btn entry-btn-gold">查看 POSM <ChevronRight size={15} /></span>
        </button>
      </div>
    </section>
  );
}



function SubmitPage({ user }: { user: FeishuUser | null }) {
  const [mode, setMode] = useState<SubmitMode>("single");

  return (
    <section className="submit-page-v2">
      <div className="submit-banner-card">
        <div className="submit-banner-left">
          <div className="submit-banner-icon">
            <Send size={24} />
          </div>
          <div className="submit-banner-text">
            <h2>提交需求</h2>
            <p>{user ? (user.department ? `${user.name} · ${user.department}` : user.name) : "飞书用户识别中"}</p>
          </div>
        </div>
        <div className="submit-banner-tabs">
          <SegmentedControl
            value={mode}
            options={[
              { value: "single", label: "单个提交", icon: <PenLine size={15} /> },
              { value: "batch", label: "批量提交", icon: <FileSpreadsheet size={15} /> }
            ]}
            onChange={setMode}
          />
        </div>
        <div className="submit-banner-illustration">
          <div className="illustration-stack">
            <div className="illustration-photo photo-1"><Image size={20} /></div>
            <div className="illustration-photo photo-2"><Image size={16} /></div>
            <div className="illustration-photo photo-3"><Image size={14} /></div>
            <div className="illustration-camera"><Camera size={18} /></div>
          </div>
        </div>
      </div>

      <div className="submit-two-col">
        <div className="submit-main-col">
          <div className="submit-form-card">
            {mode === "single" ? <SingleSubmitForm user={user} /> : <BatchSubmit user={user} />}
          </div>
        </div>
        <aside className="submit-sidebar">
          <div className="submit-notice-card">
            <h3><ShieldCheck size={18} /> 提交须知</h3>
            <ul className="notice-list">
              <li>
                <span className="notice-icon"><Ruler size={16} /></span>
                <div>
                  <strong>尺寸信息</strong>
                  <p>请准确填写 POSM 的宽度和高度（单位：mm），以便我们更好地处理。</p>
                </div>
              </li>
              <li>
                <span className="notice-icon"><FileText size={16} /></span>
                <div>
                  <strong>文件格式</strong>
                  <p>仅支持批量上传Excel表单，单个文件大小不超过20MB。</p>
                </div>
              </li>
              <li>
                <span className="notice-icon"><FileCheck size={16} /></span>
                <div>
                  <strong>审核流程</strong>
                  <p>提交后我们会尽快审核，审核结果将在"我的 POSM"中查看。</p>
                </div>
              </li>
            </ul>
          </div>
        </aside>
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
      const preset = getSizePreset(value as string);
      setForm((current) => ({
        ...current,
        posmName: value as string,
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
        posmName: form.posmName,
        width,
        height,
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
        <ReadonlyField label="需求方" value={user ? (user.department ? `${user.name} / ${user.department}` : user.name) : "飞书用户识别中"} />
        <CustomSelect label="Campaign" value={form.campaign} onChange={(value) => update("campaign", value)} options={campaigns} placeholder="请选择 Campaign" />
        <PosmCascadeSelect
          value={form.posmName}
          onChange={(value) => update("posmName", value)}
        />
        <InputField label="宽度 mm" value={form.width} onChange={(value) => update("width", value)} inputMode="numeric" placeholder="输入宽度" />
        <InputField label="高度 mm" value={form.height} onChange={(value) => update("height", value)} inputMode="numeric" placeholder="输入高度" />
      </div>

      <TextAreaField label="备注" value={form.remark} onChange={(value) => update("remark", value)} placeholder="选填，不超过 500 字" />
      {touched && errors.length > 0 && <ValidationBox errors={errors} />}
      {sizeValidation?.valid && <ValidationBox errors={[]} message={`尺寸校验通过 · 比例 ${sizeValidation.ratio}:1`} />}
      {error && <p className="inline-error">{error}</p>}
      <button className="primary-action submit-btn" disabled={!user || busy} onClick={submit}>
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
                    <td>{getPosmLabel(row.posmName)}</td>
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
  const [posmTypeFilter, setPosmTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

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
    (posmTypeFilter === "all" || posmMatchesType(task.posmName, posmTypeFilter)) &&
    dateMatchesFilter(task.createdAt, dateFilter);
  const filtered = records.filter((record) => (record.kind === "batch" ? record.batch.items.some(taskFilter) : taskFilter(record.task)));
  const campaignOptions = Array.from(new Set(allTasks.map((task) => task.campaign)));

  return (
    <section className="posm-workspace">
      <div className="posm-titlebar-v2">
        <svg className="posm-titlebar-wave" aria-hidden="true" viewBox="0 0 1200 80" preserveAspectRatio="none">
          <path d="M0,40 C200,70 400,10 600,40 C800,70 1000,10 1200,40 L1200,80 L0,80 Z" fill="rgba(229,37,33,0.06)" />
          <path d="M0,55 C300,75 500,30 700,55 C900,75 1100,30 1200,55 L1200,80 L0,80 Z" fill="rgba(229,37,33,0.04)" />
        </svg>
        <div className="posm-titlebar-content">
          <div className="posm-titlebar-left">
            <SectionKicker icon={<ClipboardList size={16} />} title="我的 POSM" meta="单个直接展示，批量折叠按组查看" />
            <h1>POSM 任务台账</h1>
          </div>
          <div className="posm-titlebar-illust" aria-hidden="true">
            <div className="posm-illust-doc">
              <div className="doc-line" /><div className="doc-line" /><div className="doc-line short" />
            </div>
            <div className="posm-illust-badge">LKK</div>
            <div className="posm-illust-coin"><Send size={14} /></div>
          </div>
          <Button onClick={() => navigate("/submit")}>
            <Send size={16} />
            新建需求
          </Button>
        </div>
      </div>

      <div className="panel posm-main">
        <div className="posm-filterbar">
          <RecordFilters
            status={statusFilter}
            campaign={campaignFilter}
            posmType={posmTypeFilter}
            date={dateFilter}
            campaigns={campaignOptions}
            taskDates={allTasks.map((t) => t.createdAt)}
            onStatusChange={setStatusFilter}
            onCampaignChange={setCampaignFilter}
            onPosmTypeChange={setPosmTypeFilter}
            onDateChange={setDateFilter}
          />
        </div>
        <div className="posm-main-toolbar">
          <div>
            <strong>全部 POSM 记录</strong>
            <small>{loading ? "读取列表中" : `${filtered.length} 条记录，包含 ${allTasks.length} 条 POSM 明细`}</small>
          </div>
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


function recordMatchesFilter(status: TaskStatus, filter: RecordStatusFilter) {
  if (filter === "all") return true;
  if (filter === "active") return ["submitted", "generating", "reviewing", "manual_fixing", "approved"].includes(status);
  if (filter === "exception") return ["generation_failed", "notification_failed", "rejected"].includes(status);
  return status === filter;
}

function posmMatchesType(posmName: string, category: string): boolean {
  const cat = posmCatalog.find(c => c.category === category);
  if (!cat) return false;
  return cat.items.some(i => i.value === posmName);
}

function dateMatchesFilter(value: string, date: Date | undefined): boolean {
  if (!date) return true;
  const created = new Date(value);
  return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth() && created.getDate() === date.getDate();
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
          <Fact label="需求方" value={batch.requester.department ? `${batch.requester.name} / ${batch.requester.department}` : batch.requester.name} />
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
      <div className="progress-ring" style={{ background: `conic-gradient(#E02923 ${Math.round((batch.doneCount / Math.max(batch.totalCount, 1)) * 100)}%, #FFE0A0 0)` }}>
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
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {batch.items.map((item) => (
            <tr key={item.taskId}>
              <td><strong>{item.taskId}</strong><small>{item.campaign}</small></td>
              <td>{getPosmLabel(item.posmName)}</td>
              <td>{item.width} x {item.height} mm</td>
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
  posmType,
  date,
  campaigns: campaignOptions,
  taskDates,
  onStatusChange,
  onCampaignChange,
  onPosmTypeChange,
  onDateChange
}: {
  status: RecordStatusFilter;
  campaign: string;
  posmType: string;
  date: Date | undefined;
  campaigns: string[];
  taskDates: string[];
  onStatusChange: (value: RecordStatusFilter) => void;
  onCampaignChange: (value: string) => void;
  onPosmTypeChange: (value: string) => void;
  onDateChange: (value: Date | undefined) => void;
}) {
  const statusFilters: Array<[RecordStatusFilter, string]> = [
    ["all", "全部"],
    ["active", "进行中"],
    ["reviewing", "待审核"],
    ["notified", "已通知取用"],
    ["exception", "异常"]
  ];

  return (
    <div className="shadcn-filter-grid">
      <DatePickerFilter date={date} onDateChange={onDateChange} taskDates={taskDates} />
      <FilterSelect label="Campaign" value={campaign} onValueChange={onCampaignChange}>
        <SelectItem value="all">全部 Campaign</SelectItem>
        {campaignOptions.map((item) => (
          <SelectItem key={item} value={item}>{item}</SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label="状态" value={status} onValueChange={(value) => onStatusChange(value as RecordStatusFilter)}>
        {statusFilters.map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label="POSM 类型" value={posmType} onValueChange={onPosmTypeChange}>
        <SelectItem value="all">全部类型</SelectItem>
        {posmCatalog.map((cat) => (
          <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
        ))}
      </FilterSelect>
    </div>
  );
}

function parseChineseDate(input: string): Date | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (trimmed === "今天") return today;
  if (trimmed === "昨天") { const d = new Date(today); d.setDate(d.getDate() - 1); return d; }
  if (trimmed === "前天") { const d = new Date(today); d.setDate(d.getDate() - 2); return d; }
  if (trimmed === "明天") { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }
  if (trimmed === "后天") { const d = new Date(today); d.setDate(d.getDate() + 2); return d; }

  const daysAgo = trimmed.match(/^(\d+)\s*天前$/);
  if (daysAgo) { const d = new Date(today); d.setDate(d.getDate() - parseInt(daysAgo[1])); return d; }
  const daysLater = trimmed.match(/^(\d+)\s*天后$/);
  if (daysLater) { const d = new Date(today); d.setDate(d.getDate() + parseInt(daysLater[1])); return d; }

  const weeksAgo = trimmed.match(/^(\d+)\s*周前$/);
  if (weeksAgo) { const d = new Date(today); d.setDate(d.getDate() - parseInt(weeksAgo[1]) * 7); return d; }

  if (trimmed === "上周") { const d = new Date(today); d.setDate(d.getDate() - 7); return d; }
  if (trimmed === "上个月" || trimmed === "上月") { const d = new Date(today); d.setMonth(d.getMonth() - 1); return d; }
  if (trimmed === "本月初") { return new Date(today.getFullYear(), today.getMonth(), 1); }

  const monthDay = trimmed.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?$/);
  if (monthDay) return new Date(today.getFullYear(), parseInt(monthDay[1]) - 1, parseInt(monthDay[2]));

  const fullDate = trimmed.match(/^(\d{4})\s*[年/-]\s*(\d{1,2})\s*[月/-]\s*(\d{1,2})\s*[日号]?$/);
  if (fullDate) return new Date(parseInt(fullDate[1]), parseInt(fullDate[2]) - 1, parseInt(fullDate[3]));

  const slashDate = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (slashDate) return new Date(parseInt(slashDate[1]), parseInt(slashDate[2]) - 1, parseInt(slashDate[3]));

  return undefined;
}

function DatePickerFilter({ date, onDateChange, taskDates }: { date: Date | undefined; onDateChange: (d: Date | undefined) => void; taskDates: string[] }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(date ? format(date, "yyyy-MM-dd") : "");

  const datesWithData = taskDates.map((d) => {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  });

  return (
    <div className="filter-field">
      <label className="filter-label">提交时间</label>
      <div className="date-picker-input-group">
        <input
          className="date-picker-input"
          value={inputValue}
          placeholder="今天、3天前、6月1日..."
          onChange={(e) => {
            setInputValue(e.target.value);
            const parsed = parseChineseDate(e.target.value);
            if (parsed) {
              onDateChange(parsed);
            } else if (!e.target.value.trim()) {
              onDateChange(undefined);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="date-picker-icon-btn" aria-label="选择日期">
              <CalendarIcon size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="end" sideOffset={8}>
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              modifiers={{ hasData: datesWithData }}
              modifiersClassNames={{ hasData: "rdp-has-data" }}
              onSelect={(d) => {
                onDateChange(d);
                setInputValue(d ? format(d, "yyyy-MM-dd") : "");
                setOpen(false);
              }}
            />
            {date && (
              <button className="date-picker-clear" onClick={() => { onDateChange(undefined); setInputValue(""); setOpen(false); }}>
                清除筛选
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
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
        <SelectTrigger className={value === "all" ? "text-[#7A6A61]" : ""}>
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

  const BATCH_COLORS = ["#E02923", "#2563EB", "#16A34A", "#9333EA", "#EA580C", "#0891B2"];
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
        <TableCell className={isBatchChild ? "pl-8 text-[#3d2017]" : "font-semibold text-[#3d2017]"}>
          {isBatchChild && <span className="batch-indent-bar" />}
          <span className={isBatchChild ? "text-sm" : "block"}>{task.taskId}</span>
        </TableCell>
        <TableCell>
          <Badge variant={isBatchChild ? "batch" : "secondary"}>
            {isBatchChild ? "批量提交" : "单个提交"}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="block font-medium">{task.requester.name}</span>
          <span className="mt-1 block text-xs text-[#8a6e5a]">{task.requester.department}</span>
        </TableCell>
        <TableCell><StatusBadge status={task.status} /></TableCell>
        <TableCell className="font-medium">{task.campaign}</TableCell>
        <TableCell>
          <span className="line-clamp-2 font-medium">{getPosmLabel(task.posmName)}</span>
          {task.remark && <span className="mt-1 block truncate text-xs text-[#8a6e5a]">{task.remark}</span>}
        </TableCell>
        <TableCell>
          <span className="block">{task.width} x {task.height} mm</span>
          <span className="mt-1 block text-xs text-[#8a6e5a]">{task.ratio}:1</span>
        </TableCell>
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
    const isExpanded = expandedBatches[batch.batchId] ?? true;
    const filteredItems = batch.items.filter(taskFilter);
    const uniqueCampaigns = Array.from(new Set(filteredItems.map((i) => i.campaign))).join("、");
    const campaignDisplay = uniqueCampaigns.length > 24 ? uniqueCampaigns.slice(0, 24) + "…" : uniqueCampaigns;

    return (
      <>
        <TableRow key={batch.batchId} className="batch-summary-row cursor-pointer" onClick={() => toggleBatch(batch.batchId)}>
          <TableCell className="font-semibold text-[#3d2017]">
            <span className="flex items-center gap-1">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{batch.batchId}</span>
            </span>
            <span className="mt-1 block text-xs font-medium text-[#8a6e5a]">{filteredItems.length === batch.totalCount ? `${batch.totalCount} 条 POSM` : `${filteredItems.length}/${batch.totalCount} 条 POSM`}</span>
          </TableCell>
          <TableCell>
            <Badge variant="batch">批量提交</Badge>
          </TableCell>
          <TableCell>
            <span className="block font-medium">{batch.requester.name}</span>
            <span className="mt-1 block text-xs text-[#8a6e5a]">{batch.requester.department}</span>
          </TableCell>
          <TableCell>
            <span className="text-xs text-[#8a6e5a]">{isExpanded ? "" : "展开查看详情"}</span>
          </TableCell>
          <TableCell className="font-medium">
            <span className="block">{campaignDisplay}</span>
          </TableCell>
          <TableCell>
            <span className="text-xs text-[#8a6e5a]">{isExpanded ? "" : "展开查看详情"}</span>
          </TableCell>
          <TableCell>
            <span className="text-xs text-[#8a6e5a]">{isExpanded ? "" : "展开查看详情"}</span>
          </TableCell>
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
            <TableHead className="min-w-[168px] record-id-tip">记录 ID</TableHead>
            <TableHead className="min-w-[90px]">来源</TableHead>
            <TableHead className="min-w-[100px]">需求方</TableHead>
            <TableHead className="min-w-[120px]">状态</TableHead>
            <TableHead className="min-w-[150px]">Campaign</TableHead>
            <TableHead className="min-w-[210px]">POSM名称</TableHead>
            <TableHead className="min-w-[130px]">尺寸 / 比例</TableHead>
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
                <small>{getPosmLabel(task.posmName)} · {task.width} x {task.height} mm · {formatDateTime(task.createdAt)}</small>
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

function statusCategoryLabel(status: TaskStatus): string {
  if (status === "reviewing") return "待审核";
  if (status === "notified") return "已通知取用";
  if (status === "generation_failed" || status === "notification_failed" || status === "rejected") return "异常";
  return "进行中";
}

function statusCategoryKey(status: TaskStatus): string {
  if (status === "reviewing") return "reviewing";
  if (status === "notified") return "notified";
  if (status === "generation_failed" || status === "notification_failed" || status === "rejected") return "exception";
  return "active";
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-badge--${statusCategoryKey(status)}`}>{statusCategoryLabel(status)}</span>;
}

function InfoGrid({ task }: { task: PosmTask }) {
  return (
    <div className="info-grid">
      <Fact label="需求方" value={task.requester.department ? `${task.requester.name} / ${task.requester.department}` : task.requester.name} />
      <Fact label="Campaign" value={task.campaign} />
      <Fact label="POSM名称" value={getPosmLabel(task.posmName)} />
      <Fact label="尺寸" value={`${task.width} x ${task.height} mm`} />
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
        <small>{getPosmLabel(task.posmName)}</small>
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
      <div className="progress-ring" style={{ background: `conic-gradient(#E02923 ${statusProgress(task.status)}%, #FFE0A0 0)` }}>
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

function CustomSelect({ label, value, options, placeholder, onChange }: { label: string; value: string; options: string[]; placeholder: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef && !containerRef.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, containerRef]);

  return (
    <label className="field">
      <span>{label}</span>
      <div className="posm-cascade" ref={setContainerRef}>
        <button type="button" className="posm-cascade-trigger" onClick={() => setOpen(!open)}>
          <span className={value ? "posm-cascade-value" : "posm-cascade-placeholder"}>
            {value || placeholder}
          </span>
          <ChevronDown size={16} className={`posm-cascade-arrow ${open ? "rotate" : ""}`} />
        </button>
        {open && (
          <div className="posm-cascade-panel">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`posm-cascade-item ${value === opt ? "selected" : ""}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function PosmCascadeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef && !containerRef.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, containerRef]);

  const selectedLabel = value ? getPosmLabel(value) : "";

  return (
    <label className="field">
      <span>POSM名称</span>
      <div className="posm-cascade" ref={setContainerRef}>
        <button type="button" className="posm-cascade-trigger" onClick={() => setOpen(!open)}>
          <span className={value ? "posm-cascade-value" : "posm-cascade-placeholder"}>
            {value ? selectedLabel : "请选择 POSM名称"}
          </span>
          <ChevronDown size={16} className={`posm-cascade-arrow ${open ? "rotate" : ""}`} />
        </button>
        {open && (
          <div className="posm-cascade-panel">
            {posmCatalog.map((cat) => {
              const isExpanded = expanded === cat.category;
              return (
                <div key={cat.category} className={`posm-cascade-group ${isExpanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="posm-cascade-category"
                    onClick={() => setExpanded(isExpanded ? null : cat.category)}
                  >
                    <ChevronRight size={14} className={`posm-cascade-chevron ${isExpanded ? "rotate" : ""}`} />
                    <span>{cat.category}</span>
                    <span className="posm-cascade-count">{cat.items.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="posm-cascade-items">
                      {cat.items.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`posm-cascade-item ${value === item.value ? "selected" : ""}`}
                          onClick={() => { onChange(item.value); setOpen(false); }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </label>
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
