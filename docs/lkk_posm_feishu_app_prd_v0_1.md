# LKK POSM 智能生成飞书应用 PRD

> 文档状态：v0.1 草稿
> 创建日期：2026-06-14
> 产品形态：嵌入飞书客户端的 H5 应用 + 后端生成服务 + 飞书机器人通知 + 飞书云盘交付
> 关键变更：本应用不是独立部署入口，而是嵌在飞书应用内使用。

## 0. 双方准备事项

### 0.1 LKK 业务侧需要做的事情

| 事项 | 负责人建议 | 说明 | 优先级 |
|---|---|---|---|
| 明确首批 POSM 类型 | LKK 业务 / James | 例如头卡、挂插条、侧板等；每个类型对应一套模板或生成规则 | P0 |
| 提供模板素材包 | James / 设计团队 | PSD/AI/SVG/PNG、背景图、主视觉元素、Logo、固定文案、水印等 | P0 |
| 提供每套模板的设计规则 | James / 设计团队 | 尺寸范围、比例范围、元素锚点、缩放规则、碰撞或溢出拒绝规则 | P0 |
| 确认字段清单 | LKK 业务 / PM | 用户提交时需要填哪些字段：Campaign、POSM 类型、宽、高、城市或大区、需求方等 | P0 |
| 指定评审人和通知对象 | LKK 业务 | 生成后先通知 James/设计评审，通过后再通知需求方 | P0 |
| 确认云盘目录规则 | LKK 业务 / IT | 例如 POSM生成/Event/Campaign/提交人/城市/任务ID | P0 |
| 确认下载权限策略 | LKK 业务 / IT | 用户是否只看最终包；评审 PNG 是否与最终文件隔离 | P0 |
| 确认多维表格管理字段 | LKK 业务 / IT | 明确多维表格中要统一管理的字段、视图、筛选条件和评审状态 | P0 |
| 确认 James review 操作方式 | LKK 业务 / James | 明确在多维表格中如何标记通过/不通过、是否需要填写备注和重传链接 | P0 |
| 确认上线范围 | LKK 业务 | MVP 哪些部门、人员可用，是否全员可见 | P0 |
| 确认模板后续维护机制 | LKK 业务 / 供应商 | 后续每新增一套模板按单独规则配置和报价 | P1 |

### 0.2 LKK IT 侧需要在飞书里设置的东西

| 设置项 | 说明 | 优先级 |
|---|---|---|
| 创建企业自建飞书应用 | 开启 H5 网页应用能力，作为 POSM 生成入口 | P0 |
| 配置 H5 可信域名 | 飞书 JSAPI 鉴权要求页面域名在可信域名内 | P0 |
| 配置应用可用范围 | 让目标用户能在飞书工作台访问应用，并能收到机器人消息 | P0 |
| 配置免登能力 | 支持通过飞书客户端获取当前登录用户身份 | P0 |
| 开启应用机器人能力 | 用于生成状态、评审提醒、取用通知、失败提醒 | P0 |
| 申请 OpenAPI 权限 | 至少包括 IM 发消息、Drive 上传/文件夹/权限、必要的用户身份读取权限 | P0 |
| 配置机器人入群和可见性 | 若需要给群发消息或给群/文件夹授权，机器人需加入对应群 | P0 |
| 配置云盘根目录或应用云空间 | 决定文件放在应用云空间还是业务指定云盘目录 | P0 |
| 配置云盘权限策略 | 协作者 view/edit/full_access，以及下载、复制、打印权限 security_entity | P0 |
| 创建或指定飞书多维表格 | 用于同步所有请求、生成结果、云盘链接、评审状态，作为业务方和 IT 侧统一管理台 | P0 |
| 配置多维表格权限和视图 | 业务方、IT、James、运营可按角色查看或编辑对应字段 | P0 |
| 提供多维表格 app_token/table_id | 后端需要写入记录、更新状态、读取 review 结果 | P0 |
| 提供回调公网地址配置 | 如需事件订阅、卡片交互、异步通知，需配置回调地址 | P1 |
| 确认企业安全策略 | 是否允许外链、组织外分享、下载、API 上传大文件 | P0 |
| 确认 FusionCLI/飞书 CLI 用户身份授权 | 用于创建 PRD 和后续项目文档；需明确目标空间和权限 | P0 |

## 1. 背景与目标

LKK 当前 POSM 制作存在多类型、多尺寸、多城市或区域、多需求方并行的场景。业务希望通过 AI/规则引擎自动生成 POSM 物料，降低设计团队重复劳动，并通过飞书完成用户身份识别、状态通知、评审流转和云盘交付。

本次方案关键调整：应用需要嵌入飞书，而不是作为一个独立部署系统对外暴露。飞书承担入口、身份、通知、文件交付和部分协作能力；生成能力仍由后端服务承载。

一句话定义：

为 LKK 业务需求方和设计评审人提供一个嵌入飞书的 POSM 智能生成应用，用户在飞书内提交尺寸化需求，系统自动生成物料、提交设计评审，并将最终文件交付到飞书云盘。

## 2. 用户角色

| 角色 | 主要诉求 |
|---|---|
| 业务需求方 | 在飞书内提交 POSM 生成需求，及时知道是否成功，拿到最终文件夹链接 |
| James / 设计评审人 | 查看系统生成结果，判断是否可用；不通过时可人工修正并重传 |
| LKK IT 管理员 | 管理飞书应用、权限、机器人、云盘目录和安全策略 |
| 项目运营/PM | 查看任务状态、失败原因、模板使用情况和交付进度 |
| 供应商/实施团队 | 配置模板规则、维护生成引擎、处理异常任务 |

## 3. MVP 范围

### 3.1 In Scope

| 模块 | MVP 是否包含 |
|---|---|
| 飞书 H5 应用入口 | 是 |
| 飞书免登获取用户身份 | 是 |
| POSM 类型/模板选择 | 是 |
| 尺寸、比例、上下限校验 | 是 |
| 生成 PNG/SVG/最终交付包 | 是 |
| 上传飞书云盘并生成文件夹链接 | 是 |
| 机器人通知设计评审人 | 是 |
| 评审通过后通知需求方 | 是 |
| 基础状态记录 | 是 |
| 请求和生成结果同步到飞书多维表格 | 是 |
| James 在飞书 H5 应用页面完成 review | 是 |
| 多维表格作为业务方和 IT 侧台账与管理视图 | 是 |
| 模板启停和 range 配置 | 建议 P1，MVP 可先配置化 JSON 或后台维护 |
| 多维表格结构配置化 | P1，MVP 先接入一张默认表 |
| 用户可见完整日志中心 | P1 |
| 自动重新生成或回滚 | 不做，后续评估 |

### 3.2 Out of Scope

| 不做事项 | 说明 |
|---|---|
| 纯多维表格承载全流程 | 多维表格作为台账、管理视图和状态同步面，不作为复杂尺寸校验、生成主入口或 James 主 review 工作台 |
| 完全无人审核 | 当前生成质量无法保证 100%，必须保留 James/设计评审 |
| 用户反复修改同一需求并回滚 | MVP 提交后进入任务流，不做复杂版本回滚 |
| 自动处理所有下载权限异常 | API 能配置部分权限，但企业安全策略和文件夹权限仍需 IT 配合 |
| 所有模板一次性上线 | 建议按模板逐套验收上线 |

## 4. 核心业务流程

### 4.1 Happy Path

1. 用户在飞书工作台打开 POSM 生成应用。
2. 系统通过飞书免登识别用户身份。
3. 用户选择 Campaign、POSM 类型、模板、城市或大区，填写宽高等参数。
4. 前端根据模板规则校验尺寸、比例、上下限；校验失败时直接在 H5 页面提示，不创建任务、不写入多维表格、不上传云盘、不发送通知。
5. 校验通过后创建生成任务，并将请求记录同步到飞书多维表格，作为业务方和 IT 侧可见的台账记录。
6. 后端调用生成引擎输出 PNG 预览、SVG、最终交付包。
7. 系统将实际文件上传至飞书云盘任务目录，云盘承载原图、SVG、交付包以及后续 James 人工修正版。
8. 系统将 Base 记录更新为待审核，写入 POSM PNG 预览图链接、POSM SVG 云盘目录或文件链接、POSM 生成状态等轻量索引。
9. 系统每 3 小时收割待审核任务，通知 James 或 Studio Review 人员进入飞书 H5 应用 review 页面。
10. James 在应用页面查看预览图、云盘目录、生成参数和需求方信息。
11. 如果 James 通过，点击“确认通过并允许取用”；系统写回多维表格，将需求方是否可取用置为 true，并通知需求方取用。
12. 如果 James 不通过，需求方不收到通知；James 可自行在云盘目录中替换或补充文件，完成后回到应用页面显式确认放行。
13. 系统不通过云盘目录是否新增文件判断 James 是否完成，只认应用页面中的显式确认动作。
14. 通知成功后，任务状态更新为已通知取用。

### 4.2 异常路径

| 场景 | 系统处理 |
|---|---|
| 尺寸超出模板范围 | H5 前端直接提示允许范围；不创建任务、不写 Base、不上传云盘、不通知 |
| 比例不符合规则 | H5 前端直接提示当前比例和允许比例；不创建任务、不写 Base、不上传云盘、不通知 |
| 生成失败 | 状态标记失败，通知运营/实施，不通知需求方取用 |
| 上传云盘失败 | 重试；仍失败则通知运维处理 |
| 同步多维表格失败 | 记录失败并重试；仍失败则通知运营/实施处理，避免任务脱离统一管理台 |
| 评审不通过 | 应用页面中标记拒绝或人工修正中；需求方是否可取用保持 false，不通知需求方 |
| 云盘目录内多文件或多版本 | 系统不得通过目录文件变化推断 James 已完成，必须等待 James 在应用页面显式确认 |
| James 人工修正后未确认 | 即使云盘目录已有新文件，也保持审核中或人工修正中，不通知需求方 |
| 用户无飞书权限 | 提示联系 LKK IT 开通应用可用范围 |
| 机器人通知失败 | 记录失败并重试；超过阈值转人工通知 |

## 5. 功能需求

### 5.1 飞书 H5 应用入口

| 项 | 需求 |
|---|---|
| 入口 | 飞书工作台应用入口 |
| 登录 | 使用飞书免登，不要求用户输入邮箱或密码 |
| 用户身份 | 获取 open_id / user_id / 姓名 / 部门等必要信息 |
| 设备 | 优先 PC 飞书客户端；移动端可访问但不作为主要设计目标 |
| 权限 | 仅应用可用范围内用户可访问 |

### 5.2 需求提交表单

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Campaign / Event | 下拉 | 是 | 用于目录归档 |
| POSM 类型 | 下拉 | 是 | 决定模板规则 |
| 模板 | 下拉 | 是 | 仅展示已上架模板 |
| 宽度 | 数字 | 是 | 单位需确认，建议 mm |
| 高度 | 数字 | 是 | 单位需确认，建议 mm |
| 城市/大区 | 下拉 | 待确认 | 建议优先大区，避免城市穷举维护成本过高 |
| 需求方 | 默认当前用户 | 是 | 可支持代提交，但需记录实际提交人 |
| 备注 | 文本 | 否 | 给评审人的补充说明 |

关键决策：MVP 不建议让用户在多维表格里直接填尺寸并触发生成。尺寸、比例、模板联动、错误提示都应放在 H5 应用中完成。

### 5.3 模板规则校验

每套模板需要配置：

| 配置项 | 示例 |
|---|---|
| 模板 ID | header-card-001 |
| 模板名称 | 头卡 |
| 是否上架 | on/off |
| 最小宽高 | min_width, min_height |
| 最大宽高 | max_width, max_height |
| 基准比例 | base_ratio |
| 允许比例偏差 | +/-15% |
| 输出格式 | PNG/SVG/ZIP |
| 生成规则版本 | v1 |
| 评审人 | James 或评审组 |

校验失败必须明确告诉用户原因，不允许进入生成。

### 5.4 生成任务

| 项 | 需求 |
|---|---|
| 任务创建 | 提交成功后生成唯一 task_id |
| 任务状态 | submitted / validating / generating / uploaded / reviewing / approved / rejected / failed / completed |
| 输出物 | PNG 预览、SVG、最终交付包 |
| 文件命名 | 建议包含 task_id、模板名、尺寸、提交人 |
| 幂等 | 同一 task_id 重试不得生成重复混乱文件夹 |
| 并发 | 需限制并发生成，避免云盘和生成引擎压力过大 |

### 5.5 飞书云盘交付

目录建议：

```text
POSM生成/
  Campaign或Event/
    需求方/
      城市或大区/
        task_id_模板_尺寸/
          final/
          review/
```

文件隔离建议：

| 目录 | 内容 | 谁使用 |
|---|---|---|
| review | PNG 预览、评审辅助文件 | James/设计评审 |
| final | SVG、可交付包、最终文件 | 需求方 |

关键决策：预览 PNG 不一定应暴露给终端用户，避免用户误取未评审文件。终端用户只拿 final folder 链接。

关键修订：飞书云盘承载文件本体，多维表格只承载轻量索引、预览图链接、云盘链接和状态。一个任务目录下允许存在多张图片、多个源文件和多个版本；系统不得通过目录变化判断 James 是否已经完成修正或确认可交付。

### 5.6 飞书机器人通知

| 触发点 | 接收人 | 内容 |
|---|---|---|
| 提交成功 | 需求方 | 已提交，等待生成 |
| 校验失败 | 不发机器人通知 | H5 页面直接提示失败原因和修改建议 |
| 生成完成待评审 | James/评审人 | 应用 review 页面链接、预览图、任务信息、云盘目录链接 |
| James 显式确认可取用 | 需求方 | final 文件夹或云盘文件链接 |
| 评审不通过 | James/运营 | 进入人工修正；不通知需求方 |
| 系统失败 | 运营/实施 | 错误类型、task_id、重试状态 |

机器人必须使用应用机器人，不建议用自定义机器人，因为本项目需要单聊、卡片、按钮、用户身份和可能的群管理能力。

### 5.7 飞书多维表格台账与状态同步

飞书多维表格是业务方和 IT 侧共同可见的轻量台账、管理视图和状态同步面，用于承载请求记录、生成结果索引、云盘链接、预览图链接、状态流转和最终可取用门禁。James 的主 review 操作界面在飞书 H5 应用页面中，不在多维表格中完成。

MVP 默认接入一张指定多维表格；后续多维表格应支持配置化，以适配不同 Campaign、不同业务团队或不同表结构。

| 能力 | 需求 |
|---|---|
| 请求同步 | 用户提交并通过校验后，系统在多维表格中创建一条任务记录 |
| 结果同步 | 生成完成后，系统回写 POSM PNG 预览链接、POSM SVG 云盘链接、生成状态、错误信息等 |
| Review 接入 | James 在 H5 应用页面完成 review，系统将 review 结果和可取用状态同步回多维表格 |
| 通知门禁 | 只有需求方是否可取用为 true，且需求方与 POSM SVG 链接非空，系统才通知需求方 |
| 统一管理 | 业务方和 IT 侧通过多维表格查看任务、状态、文件链接和异常 |
| 存储边界 | 多维表格不保存大文件本体，仅保存轻量索引、预览图链接、云盘链接和状态 |
| 配置化 | 后续支持配置多维表格 app_token、table_id、字段映射、视图规则和状态枚举 |

MVP 使用现有多维表格字段，不新增字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| 需求方 | 人员 | 最终通知对象，默认等于提交人 |
| 是否确认开始生成 | 复选框 | 生成任务触发门禁 |
| POSM 类型 / Campaign 类型 | 单选 | 生成入参 |
| POSM 高（mm）（限制最大/小） / POSM 宽（mm）（限制） / 比例（自动算+限制） | 文本 | 生成入参和前端校验依据 |
| POSM PNG | URL 文本 | review 和管理用预览图链接 |
| POSM SVG | URL 文本 | 最终云盘目录或文件链接 |
| Studio Review | 人员 | James / 设计评审人 |
| POSM 生成状态 | 单选 | 展示完整流程状态，建议扩展为：待开始、生成中、生成失败、待审核、审核拒绝、人工修正中、已通过、已通知取用 |
| 需求方是否可取用 | 复选框 | 最终放行门禁；为 true 且 POSM SVG 非空时才通知需求方 |

权限建议：

| 角色 | 多维表格权限 |
|---|---|
| 业务方 | 可阅读任务状态、预览和最终链接；不建议编辑流程字段 |
| IT 侧 | 可管理表结构、字段、视图和权限 |
| James/评审人 | 主要在 H5 应用页面 review；可查看 Base 管理视图，必要时查看或校验文件链接 |
| 系统应用 | 可通过 API 创建记录、更新状态、写入预览和云盘链接、读取放行门禁 |

## 6. 非功能需求

| 类型 | 要求 |
|---|---|
| 安全 | 最小权限原则；文件权限按角色控制 |
| 性能 | 表单提交 P95 <= 3s；生成耗时按模板复杂度另行定义 |
| 可用性 | 生成失败可重试；通知失败可补偿 |
| 可追溯 | 每个任务记录提交人、参数、模板版本、输出文件、评审人、状态 |
| 可维护 | 模板规则可配置，不应硬编码在生成逻辑里 |
| 兼容性 | SVG/PNG 在 Mac/Windows 渲染差异需专项验证 |
| 容量 | 需评估单次批量生成 3000 张、单包 30MB、总量 200GB 的极端场景 |

## 7. 数据与权限

### 7.1 数据记录

| 数据 | 用途 |
|---|---|
| 用户 open_id/user_id | 通知、权限、任务归属 |
| 提交参数 | 复现生成结果 |
| 模板版本 | 问题追踪 |
| 输出文件 token/link | 云盘交付 |
| 多维表格记录 ID | 同步回写和 review 状态读取 |
| 评审状态 | 流程推进 |
| 错误日志 | 运维排查 |

### 7.2 权限原则

- 用户只能看到自己提交或被授权查看的任务。
- James/评审人可查看 review 文件和任务评审信息。
- 需求方只收到 final 文件夹链接。
- Drive 协作者权限角色只有 view/edit/full_access；下载能力需结合云文档权限设置中的“谁可以复制、打印、下载”策略配置。
- 若文件放在个人云盘目录，需要 LKK IT 配合将应用/机器人加入对应群或目录权限中。

## 8. 验收标准

| 模块 | 验收标准 |
|---|---|
| 免登 | 飞书内打开应用后，无需账号密码即可识别当前用户 |
| 表单校验 | 超出尺寸/比例的输入 100% 被拦截并提示原因 |
| 生成任务 | 合法输入可创建 task_id 并进入生成队列 |
| 云盘上传 | 成功生成的任务 100% 有可访问 folder 链接 |
| 多维表格同步 | 通过校验的任务 100% 在多维表格中创建记录；生成结果、预览图链接、云盘链接和状态可回写 |
| 应用页面 Review | James 可在 H5 应用页面查看预览图、云盘目录、生成参数和需求方，并执行通过、拒绝、人工修正后放行 |
| 显式确认门禁 | James 未在应用页面显式确认前，即使云盘目录有文件变化，也不得通知需求方 |
| 可取用门禁 | 只有需求方是否可取用为 true 且 POSM SVG 非空时，才能通知需求方 |
| 评审通知 | 生成完成后评审人收到机器人卡片，卡片入口指向应用 review 页面 |
| 用户通知 | James 显式确认可取用后，需求方收到 final 链接 |
| 权限 | 未授权用户无法访问非本人或非授权文件 |
| 日志 | 任一 task_id 可追溯提交、生成、上传、通知、评审状态 |

## 9. 里程碑建议

| 阶段 | 范围 | 目标 |
|---|---|---|
| P0 方案确认 | 字段、模板、飞书权限、云盘策略、多维表格字段和 review 状态 | 可报价、可排期 |
| MVP 开发 | H5 提交、免登、校验、生成、上传、多维表格同步、review 门禁、通知 | 完成端到端闭环 |
| MVP 验收 | 1-2 套模板真实跑通 | 小范围试点 |
| P1 增强 | 模板配置后台、任务列表、评审看板 | 降低运营成本 |
| P2 扩展 | 多模板批量、更多自动化评审、数据看板 | 规模化使用 |

## 10. 风险与待确认项

> 待确认：首批上线模板数量，以及每套模板的详细设计规则是否能按期提供。

> 待确认：文件最终放在应用云空间还是 LKK 指定业务云盘目录。两者权限和管理方式不同。

> 待确认：MVP 使用哪一张飞书多维表格作为统一管理台，以及 app_token、table_id、字段清单、字段权限由谁维护。

> 待确认：James 在 H5 应用页面中的 review 操作枚举、按钮文案和权限，例如通过、拒绝、人工修正中、确认可取用。

> 待确认：LKK 企业飞书是否允许应用配置下载权限、组织内链接分享、机器人单聊和群聊通知。

> 待确认：城市字段是否改为大区字段，避免城市枚举维护成本过高。

> 待确认：FusionCLI/飞书 CLI 创建 PRD 的目标飞书空间或文件夹，以及是否已具备用户身份授权。

> 待确认：7 月上线范围是完整 MVP，还是只要求 1-2 套模板端到端试点。

## 11. 已拍板的建议

> 决策 1：主入口和 James review 均采用飞书 H5 应用，多维表格作为台账、管理视图和状态同步面。
> 理由：尺寸、比例、模板联动、错误提示、用户身份识别、多文件目录查看、人工修正后的显式确认，都更适合在 H5 应用中完成；请求记录、生成结果索引、云盘链接和流程状态则沉淀到多维表格，方便业务方和 IT 侧统一查看和管理。

> 决策 2：生成结果先进入设计评审，再通知需求方取用。
> 理由：当前算法无法保证 100% 视觉正确，必须保留 James/设计团队的人审节点；且必须以 James 在 H5 应用页面中的显式确认和多维表格中的需求方是否可取用字段作为通知门禁，避免未审核或未完成修正的物料直接流向业务用户。

## 12. 官方能力依据

<span text-color="blue">本次补充：以下为本 PRD 依赖的飞书开放平台开发文档链接，供 LKK IT、研发和实施团队核对权限、接入方式与接口边界。</span>

| <span text-color="blue">能力域</span> | <span text-color="blue">开发文档</span> | <span text-color="blue">与本项目的关系</span> |
|---|---|---|
| <span text-color="blue">飞书 H5 网页应用</span> | <span text-color="blue">[网页应用概述](https://open.feishu.cn/document/client-docs/h5/introduction)</span> | <span text-color="blue">用于将 POSM 生成入口嵌入飞书客户端，而不是作为独立站点暴露。</span> |
| <span text-color="blue">H5 JSAPI 鉴权</span> | <span text-color="blue">[鉴权调用 JSAPI](https://open.feishu.cn/document/uYjL24iN/uEzM4YjLxMDO24SMzgjN)</span> | <span text-color="blue">用于 H5 页面调用飞书客户端能力前的 config 鉴权。</span> |
| <span text-color="blue">飞书免登</span> | <span text-color="blue">[配置应用免登流程](https://open.feishu.cn/document/uYjL24iN/uMTMuMTMuMTM/development-guide/step-3)</span> | <span text-color="blue">用于识别当前飞书用户，避免邮箱或账号密码登录。</span> |
| <span text-color="blue">飞书机器人</span> | <span text-color="blue">[机器人概述](https://open.feishu.cn/document/client-docs/bot-v3/bot-overview)</span> | <span text-color="blue">用于状态通知、评审提醒、失败提醒和取用通知。</span> |
| <span text-color="blue">发送机器人消息</span> | <span text-color="blue">[发送消息 API](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create)</span> | <span text-color="blue">用于向 James、业务取用方、运营或 IT 发送文本、卡片和链接消息。</span> |
| <span text-color="blue">云空间 / Drive</span> | <span text-color="blue">[云空间概述](https://open.feishu.cn/document/server-docs/docs/drive-v1/introduction)</span> | <span text-color="blue">用于理解飞书云盘中文件、文件夹、节点、上传下载和容量限制。</span> |
| <span text-color="blue">云空间文件</span> | <span text-color="blue">[文件概述](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/file/file-overview)</span> | <span text-color="blue">用于上传生成文件、获取文件 token、下载文件和管理文件。</span> |
| <span text-color="blue">云空间文件夹</span> | <span text-color="blue">[文件夹概述](https://open.feishu.cn/document/ukTMukTMukTM/ugTNzUjL4UzM14CO1MTN/folder-overview)</span> | <span text-color="blue">用于创建或定位 POSM 生成结果的交付目录。</span> |
| <span text-color="blue">协作者权限</span> | <span text-color="blue">[增加协作者权限](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/permission-member/create)</span> | <span text-color="blue">用于给用户、群组或应用配置云文档/云盘资源访问权限。</span> |
| <span text-color="blue">云文档权限设置</span> | <span text-color="blue">[更新云文档权限设置](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/permission-public/patch)</span> | <span text-color="blue">用于控制谁可以复制、打印、下载，以及链接分享策略。</span> |
| <span text-color="blue">云空间 FAQ</span> | <span text-color="blue">[云空间常见问题](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/faq)</span> | <span text-color="blue">用于确认应用访问个人云盘文件夹、下载权限和上传限制等问题。</span> |

<span text-color="blue">本次补充：多维表格是本项目的轻量台账、管理视图和状态同步面，以下开发文档用于支持任务记录创建、生成结果回写、可取用门禁读取、字段/视图配置和权限管理。</span>

| <span text-color="blue">多维表格能力</span> | <span text-color="blue">开发文档</span> | <span text-color="blue">与本项目的关系</span> |
|---|---|---|
| <span text-color="blue">多维表格总览</span> | <span text-color="blue">[多维表格概述](https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/bitable-overview)</span> | <span text-color="blue">确认多维表格资源模型、app_token、table_id、view_id、record_id、field_id、容量限制和接入流程。</span> |
| <span text-color="blue">快速接入</span> | <span text-color="blue">[快速接入多维表格](https://open.feishu.cn/document/home/quick-access-to-base/preparation)</span> | <span text-color="blue">用于研发快速完成 Base OpenAPI 接入准备。</span> |
| <span text-color="blue">多维表格 App</span> | <span text-color="blue">[创建多维表格](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/create) / [获取多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/get)</span> | <span text-color="blue">用于创建或读取项目使用的 Base，确认 app_token 和基本配置。</span> |
| <span text-color="blue">数据表 Table</span> | <span text-color="blue">[列出数据表](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table/list) / [新增数据表](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table/create)</span> | <span text-color="blue">用于定位或创建承载任务记录的数据表。</span> |
| <span text-color="blue">字段 Field</span> | <span text-color="blue">[列出字段](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-field/list) / [新增字段](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-field/create) / [字段编辑指南](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-field/guide)</span> | <span text-color="blue">用于确认和维护现有字段：需求方、POSM PNG、POSM SVG、Studio Review、POSM 生成状态、需求方是否可取用等。</span> |
| <span text-color="blue">记录 Record</span> | <span text-color="blue">[新增记录](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/create) / [更新记录](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/update) / [查询记录](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/search)</span> | <span text-color="blue">用于创建请求记录、回写生成结果、更新预览图/云盘链接，并读取需求方是否可取用门禁。</span> |
| <span text-color="blue">视图 View</span> | <span text-color="blue">[列出视图](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-view/list) / [新增视图](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-view/create) / [更新视图](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-view/patch)</span> | <span text-color="blue">用于配置业务方、IT、James 不同管理视图。</span> |
| <span text-color="blue">高级权限</span> | <span text-color="blue">[高级权限概述](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/advanced-permission-guide) / [列出自定义权限](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/list)</span> | <span text-color="blue">用于控制业务方、IT、James、系统应用在多维表格中的查看和编辑范围。</span> |
| <span text-color="blue">自动化流程</span> | <span text-color="blue">[列出自动化流程](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-workflow/list)</span> | <span text-color="blue">用于后续评估是否用 Base 自动化辅助状态流转或提醒。</span> |

| 能力 | 结论 |
|---|---|
| 飞书 H5 网页应用 | 支持 H5 方式开发，运行在飞书客户端内，可调用 JSAPI，适合作为本项目入口 |
| 飞书免登 | 可通过飞书客户端和服务端配合获取当前用户身份，避免邮箱账号登录 |
| 飞书应用机器人 | 支持单聊、群聊、卡片消息和服务端 API，适合承载状态通知与评审提醒 |
| 飞书云盘 Drive | 支持建文件夹、上传文件、下载文件、移动/删除和权限配置，适合交付最终文件 |
| 云盘权限 | 协作者角色为 view/edit/full_access，下载能力需通过安全设置控制 |

### <span text-color="blue">12.x 飞书能力边界与需自研项</span>

<span text-color="blue">结论：当前需求没有发现“飞书开放能力完全无法接入”的硬阻塞；但以下能力不是飞书原生业务能力，飞书只提供 H5 容器、文件、消息、多维表格等底层 API，需要由 LKK H5 应用、后端服务、AI/渲染服务和 IT 配置共同实现。</span>

| <span text-color="blue">需求项</span> | <span text-color="blue">官方能力依据 / 边界</span> | <span text-color="blue">方案处理</span> |
|---|---|---|
| <span text-color="blue">POSM 图片生成、SVG/交付包生成</span> | <span text-color="blue">[飞书 H5 网页应用](https://open.feishu.cn/document/client-docs/h5/introduction)支持在飞书客户端内承载网页应用和 JSAPI；[飞书云盘](https://open.feishu.cn/document/server-docs/docs/drive-v1/introduction)支持文件/文件夹/上传下载。飞书不提供 POSM 设计生成、模板渲染或 AI 出图引擎。</span> | <span text-color="blue">需自研生成服务、模板规则、渲染/导出服务；飞书只作为入口、身份、存储和通知载体。</span> |
| <span text-color="blue">尺寸/比例/模板业务校验</span> | <span text-color="blue">H5 能承载交互页面，但官方能力不包含 LKK POSM 尺寸、比例、Campaign/POSM 类型联动等业务规则。</span> | <span text-color="blue">前端即时校验 + 后端二次校验；失败只在 H5 页面提示，不写 Base、不上传云盘、不发通知。</span> |
| <span text-color="blue">判断 James 是否已完成多文件目录修正</span> | <span text-color="blue">[云空间概述](https://open.feishu.cn/document/server-docs/docs/drive-v1/introduction)说明 Drive 有文件、文件夹、版本和事件能力，但目录新增/替换文件不能表达“业务审核已完成”。</span> | <span text-color="blue">系统不得通过云盘目录变化自动判断完成；只认 James 在 H5 应用页面点击“确认通过并允许取用”。</span> |
| <span text-color="blue">多维表格承载长期大规模流程数据</span> | <span text-color="blue">[查询记录 API](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/search)单次最多查询 500 行并分页，文档错误码包含记录数量超限、请求超时、数据量过大和并发编辑导致阻塞等边界。</span> | <span text-color="blue">Base 只做轻量台账、管理视图和状态同步，不存大文件；历史数据按 Campaign/月度归档或拆表，后端保留任务主数据。</span> |
| <span text-color="blue">每 3 小时批量扫描、失败重试、补偿提醒</span> | <span text-color="blue">飞书提供 Base 查询和 IM 消息发送 API，但不替业务系统实现定时调度、幂等、重试、失败补偿和状态机。</span> | <span text-color="blue">需由 LKK 后端 Worker/Scheduler 实现扫描待审核任务、分页读取、频控、重试和操作日志。</span> |
| <span text-color="blue">通知一定触达指定业务方</span> | <span text-color="blue">[发送消息 API](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/create)要求开启机器人能力，接收人需在机器人可用范围内；同一用户/群有频控，消息体也有大小限制。</span> | <span text-color="blue">LKK IT 需配置机器人可用范围、权限和群组；系统需记录通知失败并支持重试或人工兜底。</span> |
| <span text-color="blue">云盘交付权限完全由应用自行决定</span> | <span text-color="blue">Drive 支持协作者权限和公开权限设置，但下载、分享、复制、外部访问等仍受企业安全策略、文件归属和管理员配置影响。</span> | <span text-color="blue">LKK IT 需确认交付根目录、协作者策略、下载/复制/分享策略；PRD 中保留为上线前权限确认项。</span> |
