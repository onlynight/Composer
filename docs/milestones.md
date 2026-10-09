# 里程碑与开发节点

> 本文档定义 Composer 共鸣的开发里程碑、时间线、交付标准和验收条件。
>
> **核心原则**：每个里程碑都是**独立可交付**的，任意时刻暂停都不算亏。

---

## 1. 总体时间线

```
M0  (3天)   项目脚手架
M1  (1周)   核心数据模型 + Command Pattern
M2  (1周)   文件系统 + 工程持久化
M3  (2周)   Piano Roll 完整编辑
M3.5(1周)   Timeline + Track List + Transport
M4  (2周)   FluidSynth 音频引擎
M5  (1周)   MCP Server（本地）
M5.5(2周)   ★ Agent Runtime（内建 Agent 核心）
M6   (1周)   ★ Chat UI + 模式切换
M7   (1周)   ★ Agent 与编辑器深度集成
M8   (2周)   效果器 + 混音
M9   (2周)   VST 支持（可选）
M10  (1周)   经济模型 + 用户账户 + 支付
M11  (1周)   发布 + 打包 + 分发

总计：约 18-19 周（4.5 个月）到 v1.0
```

### 关键节点

```
v0.1 Beta:  M6 完成 = 约 12-13 周
            功能：编辑器 + 音频 + 内建 Agent 基础版

v0.5:       M8 完成 = 约 15-16 周
            功能：完整编辑体验 + 效果器 + 混音

v1.0:       M11 完成 = 约 18-19 周
            功能：VST 支持 + 经济模型 + 正式发布
```

---

## 2. 里程碑详细任务

### M0：项目脚手架（3 天） ✅ 已完成

**交付物**：能启动的空壳应用

**任务清单**：
- [x] Electron + Vite + React + TypeScript 工程初始化
- [x] pnpm workspaces 配置（monorepo）
- [x] tsconfig 严格模式
- [x] ESLint + Prettier 配置
- [x] Vitest 单元测试框架
- [x] Playwright E2E 测试框架
- [x] electron-builder 配置（win/mac/linux）
- [x] GitHub Actions 基础 CI 工作流
- [x] .gitignore、README、LICENSE 等基础文件

**验收标准**：
- [x] `pnpm dev` 启动一个空白窗口（`concurrently` 并行起 Vite + Electron）
- [x] `pnpm test` 跑通示例测试（114/114 pass）
- [x] `pnpm build` 打包出可用 exe/dmg（`vite build` + `tsc -p electron` + `electron-builder`）
- [ ] GitHub Actions 能跑通 CI（配置就绪，需推送到远程仓库后验证）

**独立价值**：即使后面全砍，脚手架可复用于其他 Electron 项目。

---

### M1：核心数据模型 + Command Pattern（1 周） ✅ 已完成

**交付物**：`caa-core` 包，完整类型 + 逻辑 + Command Pattern

**任务清单**：
- [x] 实现 `shared/types.ts` 全部类型
- [x] 实现 `caa-core` 包：
  - [x] `project.ts`：项目 CRUD
  - [x] `track.ts`：轨道操作
  - [x] `note.ts`：音符操作（增删改查、冲突检测）
  - [x] `timeline.ts`：tick ↔ beat ↔ second 转换
  - [x] `scale.ts`：音阶/调式计算
  - [x] `chord.ts`：和弦解析、和弦匹配
  - [x] `command.ts`：Command Pattern
- [x] `caa-store` 包：Command Store + Broadcast Sync
- [x] `caa-midi-ir`：JSON Schema + 校验
- [x] 完整单元测试（覆盖率 > 80%）

**关键测试用例**（全部覆盖）：
- ✅ tick ↔ beat ↔ second 双向转换
- ✅ 音阶解析（C 大调、A 小调等）
- ✅ 和弦解析（C、G7、Am7、B°、CΔ 等 15+ 种）
- ✅ Command execute + undo 对称性
- ✅ 批量 Command 一步撤销

**验收标准**：
- [x] `caa-core` 独立发布，Node.js 用户也能用（纯 TS，无 Electron 依赖）
- [x] 单元测试 100% 通过（114/114）
- [x] Schema 能通过 JSON Schema 校验器（schema.json + 轻量校验器，7 种错误路径）
- [x] Command 的 execute + undo 完全对称（command.test.ts 覆盖 add/remove/update/batch 4 类）

**度量**：114 tests / 10 files / 总覆盖率 88.71%（caa-core 87.62%，caa-store 94.16%，caa-agent 100%，caa-midi-ir 86.76%）。

**独立价值**：纯逻辑包，可脱离 Electron 独立使用，未来做 CLI/云服务都能复用。

---

### M2：文件系统 + 工程持久化（1 周）

**交付物**：能创建、保存、加载工程文件

**任务清单**：
- [ ] `electron/storage/project.ts` 实现：
  - [ ] `saveProject(project, path)` → 写入 `.resproj`
  - [ ] `loadProject(path)` → 加载 + schema 校验
  - [ ] `createNewProject(name)` → 创建模板工程
  - [ ] `autosave()` → 每 30 秒自动保存（防抖 5 秒）
- [ ] 文件对话框集成（`dialog.showOpenDialog`）
- [ ] 最近项目列表
- [ ] 版本迁移机制（老版本工程自动升级 schema）
- [ ] 工程自动恢复（杀进程重启后恢复）

**测试**：
- [ ] 集成测试：保存→加载→比对一致
- [ ] 边界测试：损坏文件、缺失字段、旧版本
- [ ] 性能测试：1000 音符工程 < 100ms 加载

**验收标准**：
- [ ] 手动创建/打开工程文件正常
- [ ] 杀进程重启后自动恢复
- [ ] 老版本工程能被识别并提示升级

**独立价值**：文件层稳定，可以并行开始 UI 和音频层开发。

---

### M3：Piano Roll 完整编辑（2 周）

**交付物**：能手动编辑音符的编辑器

**任务清单**：

**Phase 1（1 周）：核心交互**
- [ ] Canvas 渲染音符
- [ ] 拖拽创建音符
- [ ] 移动音符
- [ ] 调整音符长度（拖右边缘）
- [ ] 删除音符（Delete 键）
- [ ] 键盘快捷操作

**Phase 2（3 天）：高级交互**
- [ ] 多选（框选、Shift+点击、Ctrl+A）
- [ ] 复制/粘贴/剪切
- [ ] 拖拽对齐网格（Shift+拖动）
- [ ] 网格量化（1/16、1/32、1/2 等）
- [ ] 音阶高亮（非音阶白键变灰）
- [ ] 缩放（鼠标滚轮）
- [ ] 平移（Space 拖动或中键拖动）

**Phase 3（2 天）：状态管理 + Undo**
- [ ] Command Pattern 集成到 UI
- [ ] Zustand store 完整实现
- [ ] Undo/redo 完整栈（100 步）
- [ ] 撤销动画（音符淡出/淡入）

**验收标准**：
- [ ] 用户能拖出至少 16 个音符，保存、重新打开一致
- [ ] Undo/redo 100 步无内存泄漏
- [ ] 60fps 渲染（1000 音符场景）
- [ ] 键盘快捷键完整工作

**独立价值**：这是一个可交付的"简易钢琴卷帘"工具，即使音频引擎没做完，产品也已有 20% 价值。

---

### M3.5：Timeline + Track List + Transport（1 周）

**交付物**：完整的编辑视图

**任务清单**：
- [ ] **Timeline 组件**：
  - [ ] 小节刻度
  - [ ] 播放头
  - [ ] 循环标记（Loop Start/End）
  - [ ] 标记点（Bookmark）
- [ ] **Track List 组件**：
  - [ ] 添加/删除/重命名轨道
  - [ ] 音量/声像滑块
  - [ ] 静音/独奏按钮
  - [ ] 拖拽调整顺序
  - [ ] 轨道图标（乐器图标）
- [ ] **Transport 组件**：
  - [ ] Play/Stop/Pause
  - [ ] 录制模式（预留）
  - [ ] 节拍器开关
  - [ ] 位置跳转（跳到小节 X）
  - [ ] BPM 显示与修改
- [ ] **布局**：
  - [ ] 拖拽分栏（Resizable Panels）
  - [ ] 面板显示/隐藏
  - [ ] 布局持久化

**验收标准**：
- [ ] 用户可以完整看到一个"编辑器"的样貌
- [ ] Transport 控制能工作（M4 前静音模拟）
- [ ] Timeline 显示正确的播放头位置
- [ ] Track List 支持增删改

**独立价值**：产品从"钢琴卷帘"变成"音乐软件"的雏形。

---

### M4：FluidSynth 音频引擎（2 周）

**交付物**：能听到声音！

**任务清单**：
- [ ] **Audio Render Process**：
  - [ ] 独立 Node 子进程（`child_process.fork`）
  - [ ] 加载 `node-fluidsynth` 或 `synthwave` 绑定
  - [ ] 加载 FluidR3_GM.sf2 音源
  - [ ] FluidSynth 配置：采样率 44100，缓冲区 2048
  - [ ] 音轨数 = 项目轨道数 × 2（预留）
- [ ] **IPC 通道**：
  - [ ] `audio:play` / `audio:stop` / `audio:preview_range`
  - [ ] `audio:on_tick` 事件回传（用于播放头同步）
- [ ] **Web Audio 实时预览**：
  - [ ] Renderer 端 Web Audio 播放低延迟音频
  - [ ] 用于 Piano Roll 编辑时的即时反馈
- [ ] **Transport 集成**：
  - [ ] 播放/停止/暂停同步到音频引擎
  - [ ] 播放头实时同步
  - [ ] 循环播放
- [ ] **离线渲染**：
  - [ ] 导出 WAV（44100Hz, 16-bit, stereo）
  - [ ] 批量渲染（不阻塞 UI）

**关键决策**：
```
编辑时（拖音符）→ Web Audio 快速预览（延迟 < 5ms）
导出时（渲染音频）→ FluidSynth 离线渲染（音质最高）
```

**验收标准**：
- [ ] 拖动音符有声音反馈
- [ ] 播放整首工程音准/时值正确
- [ ] 内存占用 < 200MB（不含 SoundFont）
- [ ] 渲染 4 分钟音频 < 30 秒
- [ ] 音频进程崩溃主进程不退出

**独立价值**：产品第一次有"音乐感"，可以给朋友演示获得真实反馈。

---

### M5：MCP Server（本地）（1 周）

**交付物**：Agent 能通过 MCP 操作编辑器（不含 LLM）

**任务清单**：
- [ ] **MCP Server 实现**：
  - [ ] 基于 `@modelcontextprotocol/sdk`
  - [ ] 本地 HTTP 端口（动态分配）
  - [ ] Streamable HTTP 传输
- [ ] **工具注册表**：
  - [ ] 15 个核心工具全部实现
  - [ ] 参数校验（JSON Schema）
  - [ ] 错误处理统一格式
- [ ] **权限分级**：
  - [ ] silent/notify/confirm/strong 四级
  - [ ] 权限弹窗（M6 阶段完善 UI）
- [ ] **测试**：
  - [ ] 单元测试：每个工具正常调用
  - [ ] 集成测试：MCP Client 连接调用
  - [ ] 边界测试：非法参数、权限不足

**验收标准**：
- [ ] 用 MCP Inspector 能列出所有工具
- [ ] 手动调用工具能修改工程
- [ ] 权限检查生效
- [ ] 所有工具测试通过

**独立价值**：MCP Server 是产品的"API 层"，Agent 只是消费者之一。MCP Server 本身可以独立使用（比如外部 Agent 连接）。

---

### M5.5：Agent Runtime（内建 Agent 核心）（2 周）★ 新增

**交付物**：Agent Runtime 完整实现，能对话、能调用工具

**任务清单**：

**Task 1（3 天）：LLM Client 抽象层**
- [ ] `LLMClient` 接口定义
- [ ] `AnthropicClient` 实现
- [ ] `OpenAIClient` 实现（支持 OpenAI 兼容端点）
- [ ] 流式响应处理
- [ ] 错误处理和重试
- [ ] 客户端工厂函数

**Task 2（2 天）：Tool 适配器**
- [ ] Anthropic Tool Use 格式适配
- [ ] OpenAI Function Calling 格式适配
- [ ] 统一工具调用协议
- [ ] 消息格式转换

**Task 3（3 天）：上下文管理**
- [ ] 项目状态摘要
- [ ] 长对话压缩
- [ ] Token 估算
- [ ] 预算控制

**Task 4（3 天）：Agent Runtime 主类**
- [ ] 消息循环
- [ ] 工具调用处理
- [ ] 事件流（yield）
- [ ] 错误恢复
- [ ] 状态管理（idle/thinking/tool_call）

**Task 5（2 天）：System Prompt 设计**
- [ ] Composer 模式 prompt
- [ ] Arranger 模式 prompt
- [ ] Collaborator 模式 prompt
- [ ] Critic 模式 prompt
- [ ] Teacher 模式 prompt
- [ ] Fixer 模式 prompt

**Task 6（2 天）：Guardrails**
- [ ] 权限检查
- [ ] Token 预算
- [ ] 内容安全（Prompt Injection 检测）

**Task 7（2 天）：Agent Memory**
- [ ] 会话记忆
- [ ] 用户偏好（观察用户操作）
- [ ] 长期记忆（跨项目）

**验收标准**：
- [ ] 用真实 Claude API 能完成对话
- [ ] 工具调用正常（MCP 工具全部）
- [ ] Prompt Injection 检测生效
- [ ] Token 预算控制生效
- [ ] 单元测试覆盖率 > 70%

**独立价值**：Agent 核心就位，可以接任何 UI 使用。

---

### M6：Chat UI + 模式切换（1 周）★ 新增

**交付物**：用户能看到和使用 Agent

**任务清单**：
- [ ] **Chat 面板组件**：
  - [ ] 消息列表（流式显示）
  - [ ] 工具调用卡片
  - [ ] 建议卡片（接受/修改/忽略）
  - [ ] 模式切换 UI（下拉菜单）
  - [ ] 权限弹窗（Modal）
  - [ ] Token 用量显示
- [ ] **消息气泡**：
  - [ ] 用户消息
  - [ ] Agent 文本消息（Markdown 渲染）
  - [ ] 工具调用状态
  - [ ] 错误提示
- [ ] **输入框**：
  - [ ] 多行文本输入
  - [ ] 附加选中内容按钮
  - [ ] 发送按钮
  - [ ] 语音输入（预留）
- [ ] **状态指示**：
  - [ ] Agent 思考中（动画）
  - [ ] 工具调用中（进度）
  - [ ] 等待用户确认（高亮）

**验收标准**：
- [ ] 用户能与 Agent 对话
- [ ] 工具调用可视化清晰
- [ ] 建议卡片能交互
- [ ] 模式切换工作
- [ ] 权限弹窗工作

**独立价值**：产品第一次有"AI 助手"的体验。

---

### M7：Agent 与编辑器深度集成（1 周）★ 新增

**交付物**：Agent 感知编辑器、操作可视化

**任务清单**：
- [ ] **Editor Bridge**：
  - [ ] 编辑器状态订阅（用户操作 → Agent）
  - [ ] Agent 操作通知编辑器（Agent → 编辑器高亮）
  - [ ] 选中上下文附加到对话
- [ ] **Piano Roll 高亮**：
  - [ ] Agent 生成的音符用青色/虚线显示
  - [ ] Agent 编辑中显示动画
  - [ ] 完成后变成实线
- [ ] **主动建议**：
  - [ ] 检测到用户卡壳 → Agent 主动询问
  - [ ] 用户长时间不动 → Agent 给建议
- [ ] **会话记忆持久化**：
  - [ ] 保存到工程文件
  - [ ] 跨会话记忆
  - [ ] 用户偏好学习
- [ ] **Agent 操作撤销**：
  - [ ] "撤销 Agent 的所有改动"按钮
  - [ ] 批量撤销 Agent 生成的内容

**验收标准**：
- [ ] Agent 编辑时 Piano Roll 有视觉反馈
- [ ] 选中音符附加到对话，Agent 能感知
- [ ] 主动建议触发时机合理
- [ ] 会话记忆跨会话保留
- [ ] "撤销 Agent 所有改动"能一步撤销

**独立价值**：**MVP 完成**——产品核心功能闭环，可以对用户收费内测。

---

### M8：效果器 + 混音（2 周）

**交付物**：音质上一个档次

**任务清单**：
- [ ] **效果器引擎**：
  - [ ] 基于 JUCE 或 `dsp.js`
  - [ ] 6 个效果器：
    - [ ] EQ（3 段）
    - [ ] Compressor
    - [ ] Reverb
    - [ ] Delay
    - [ ] Chorus
    - [ ] Distortion
  - [ ] 每个效果器参数可视化
- [ ] **混音台 UI**：
  - [ ] 音量、声像旋钮
  - [ ] 静音/独奏
  - [ ] 效果器链可视化
  - [ ] Master 总线
- [ ] **渲染管线**：
  - [ ] 每轨道独立效果链 → 总线 → 主效果链 → 输出
  - [ ] 支持并行渲染（Web Worker）
  - [ ] 效果器参数自动化（Timeline 上画包络）

**关键效果器参数**（Agent 可以调）：
```typescript
// EQ
{ type: 'eq', low: { freq, gain }, mid: { freq, gain, q }, high: { freq, gain } }
// Compressor
{ type: 'compressor', threshold: -12, ratio: 4, attack: 10, release: 100 }
// Reverb
{ type: 'reverb', decay: 2.5, preDelay: 20, wet: 0.3 }
```

**验收标准**：
- [ ] 每个效果器参数可视化拖拽
- [ ] 实时预览无延迟
- [ ] 导出音频与预览一致
- [ ] 效果器链能保存到工程

**独立价值**：产品从"能响"变成"好听"，是用户愿意付费的转折点。

---

### M9：VST/插件支持 + 音源扩展（2 周，可选）

**交付物**：用户能用自己的音源

**任务清单**：
- [ ] **JUCE Plugin Host 集成**：
  - [ ] 桥接子进程加载 VST3 插件
  - [ ] 沙箱化（插件崩溃不影响主进程）
- [ ] **音源库管理**：
  - [ ] 内置免费音源（FluidR3、General User GS、Harmoniums）
  - [ ] 用户自定义 SoundFont 导入
  - [ ] 音源授权检查
- [ ] **插件 UI 集成**：
  - [ ] 如果插件有编辑器，嵌入
  - [ ] 否则显示参数面板
- [ ] **VST 参数映射**：
  - [ ] 插件参数暴露到 MCP 工具

**验收标准**：
- [ ] 用户能加载至少一个第三方 VST 插件
- [ ] 插件崩溃主程序不退出
- [ ] 内存开销可接受（< 500MB）
- [ ] 音源授权检查生效

**独立价值**：这一步是"专业用户"的门槛。如果目标用户是爱好者，可以推迟到 v1.0。

---

### M10：经济模型 + 用户账户 + 支付（1 周）★ 新增

**交付物**：完整的商业模型

**任务清单**：
- [ ] **用户账户系统**：
  - [ ] 注册/登录（邮箱 + OAuth）
  - [ ] 会话管理
  - [ ] 隐私设置
- [ ] **Token 额度系统**：
  - [ ] 免费额度分配
  - [ ] Token 消耗统计
  - [ ] 用量展示
- [ ] **支付集成**：
  - [ ] Stripe 集成
  - [ ] 订阅管理（月付/年付）
  - [ ] 发票生成
- [ ] **BYOK（Bring Your Own Key）**：
  - [ ] API Key 加密存储
  - [ ] 用户自定义预算
  - [ ] 用量通知
- [ ] **团队/企业功能（预留）**：
  - [ ] 团队工作区（占位）
  - [ ] SSO（占位）

**验收标准**：
- [ ] 用户能注册、登录
- [ ] 免费额度分配正常
- [ ] 支付能成功
- [ ] BYOK 密钥加密存储
- [ ] 隐私政策合规

**独立价值**：产品能商业化，可以正式收费。

---

### M11：发布 + 打包 + 分发（1 周）

**交付物**：可发布的完整产品

**任务清单**：
- [ ] **打包**：
  - [ ] electron-builder 三平台配置（win32 / mac / linux）
  - [ ] 代码签名（macOS 用 Developer ID，Windows 用 Authenticode）
  - [ ] AppImage（Linux）
- [ ] **自动更新**：
  - [ ] `electron-updater` 集成
  - [ ] 更新源（GitHub Releases 或自建）
  - [ ] 增量更新
- [ ] **遥测（可选）**：
  - [ ] 匿名崩溃报告（Sentry）
  - [ ] 版本使用统计
  - [ ] 用户反馈收集
- [ ] **文档**：
  - [ ] 用户手册（README + docs/）
  - [ ] 开发文档（架构、贡献指南、MCP 工具说明）
  - [ ] CHANGELOG
  - [ ] TRADEMARK
- [ ] **发布流程**：
  - [ ] CI/CD（GitHub Actions）
  - [ ] 版本号语义化
  - [ ] 发布说明（Release Notes）

**验收标准**：
- [ ] 三平台安装包都能正常启动
- [ ] 自动更新从 v0.9 → v1.0 正常
- [ ] 签名证书有效（macOS Gatekeeper 不拦截）
- [ ] 官网能下载
- [ ] 崩溃报告能收到

**独立价值**：产品正式商业化。

---

## 3. 里程碑依赖关系

```
M0 → M1 → M2 → M3 → M3.5 → M4 → M5 → M5.5 → M6 → M7 [MVP]
                                                          │
                                                          ├─→ M8
                                                          ├─→ M9 (可选)
                                                          ├─→ M10
                                                          └─→ M11 [v1.0]
```

**关键路径**：M0 → M1 → M2 → M3 → M4 → M5 → M5.5 → M6 → M7 = **约 12-13 周**到 MVP

**可并行的分支**：
- M8 可与 M9 并行
- M5.5 完成后 M6 和 M10 可以并行
- M7 完成后可并行做 UI 优化和音频质量优化

---

## 4. MVP 定义

**v0.1 Beta 必须包含**（M7 完成时）：

### 编辑器
- ✅ 项目创建/保存/加载
- ✅ Piano Roll 完整编辑（增删改移动复制粘贴）
- ✅ Timeline + Track List + Transport
- ✅ Undo/redo（Command Pattern）
- ✅ FluidSynth 音频播放
- ✅ MIDI 键盘录制（可选但推荐）

### Agent
- ✅ MCP Server 核心 15 个工具
- ✅ Agent Runtime（LLM Client + Tool 集成）
- ✅ Chat UI + 模式切换（至少 Composer + Collaborator）
- ✅ Agent 与编辑器深度集成（选中上下文和 Agent 操作可视化）
- ✅ 人类操作和 Agent 操作在 UI 上视觉可区分
- ✅ 撤销 Agent 的整批操作（一步撤销）
- ✅ 权限分级（silent/notify/confirm/strong）
- ✅ 用户偏好学习（基础）

### 时间线
**约 12-13 周**（从 M0 开始）

### 商业模型
- ✅ 免费额度（300K tokens）
- ✅ BYOK 支持
- ✅ 支付集成（Stripe）

---

## 5. 版本发布计划

### v0.1.0 Beta（MVP，12-13 周）

**功能**：编辑器 + 音频 + 内建 Agent 基础版

**目标用户**：
- 音乐爱好者想尝试 AI 作曲
- 独立开发者验证产品价值

**分发**：GitHub Releases + 官网下载

**定价**：免费（试用额度）+ Pro $15/月

### v0.5.0（M8 完成，15-16 周）

**新增**：
- 效果器 + 混音
- 自动化
- 更多 Agent 模式（Critic、Teacher）

**目标用户**：
- 内容创作者需要 BGM
- 音乐初学者学习创作

**分发**：同上

### v0.9.0（M9+M10 完成，18 周）

**新增**：
- VST 支持
- 完整经济模型
- 用户账户系统

**目标用户**：
- 半专业音乐人
- 音乐教育工作者

### v1.0.0（M11 完成，18-19 周）

**功能完整**：所有 M0-M11 内容

**目标用户**：所有音乐创作者

**分发**：
- 官网下载
- Microsoft Store
- Mac App Store
- Snapcraft

---

## 6. 测试策略

### 6.1 单元测试（Vitest）
覆盖 `caa-core` 和 `caa-midi-ir`，目标 80%+ 覆盖率。
每次提交必跑，CI 门禁。

### 6.2 集成测试（Vitest + Electron Mock）
- 文件系统读写
- Audio Render Process 通信
- MCP Server 工具调用
- Agent Runtime 与 LLM 集成（用 mock）
- 关键路径：创建工程 → Agent 写音符 → 渲染音频

### 6.3 E2E 测试（Playwright）
- 用户完整工作流
- Agent 通过 MCP 生成音乐的端到端场景
- 用户手动编辑的端到端场景

### 6.4 音频回归测试（自建工具）
- 参考工程（golden files）
- 每次改动后渲染，比对波形（允许 1% 差异）
- 保证音质不因代码改动退化

### 6.5 Prompt 测试（真实 LLM）
- 关键 prompt 用真实 LLM 测试
- 每月或每次大改时跑
- 成本考虑：只在 CI 中跑关键测试

### 6.6 手工测试
- MIDI 键盘接入测试
- 长时运行稳定性（4 小时不崩溃）
- 极端场景（10000 音符工程）
- 跨平台测试（win/mac/linux）

---

## 7. 关键风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| FluidSynth Node 绑定不稳定 | 中 | 高 | 备选：`synthwave`、JUCE 命令行桥 |
| SoundFont 音源授权问题 | 中 | 中 | 只用 CC0 音源（FluidR3_GM），逐个审查 |
| MCP 协议演进 | 高 | 中 | 基于 `@modelcontextprotocol/sdk` 官方包 |
| Electron 内存膨胀 | 高 | 中 | 音频独立进程；渲染器内存监控 |
| 代码签名证书成本 | 低 | 低 | 先不签名发布测试版 |
| Agent 生成质量差 | 高 | 中 | 迭代 prompt 和工具设计；不是引擎问题 |
| LLM API 价格波动 | 中 | 高 | 多模型支持，BYOK |
| 用户 API Key 泄露 | 低 | 高 | Electron safeStorage 加密存储 |
| Prompt Injection 攻击 | 中 | 高 | 输入过滤 + 权限分级 |
| UI 编辑体验不如专业 DAW | 高 | 中 | 聚焦核心场景，不追求功能全 |
| Agent 和人类冲突处理复杂 | 中 | 高 | Command Pattern 抽象 + 严格的锁机制 |

---

## 8. 开发环境搭建

```bash
# 前置要求
- Node.js 20+
- pnpm 8+
- CMake（用于编译 FluidSynth 绑定）
- Git 2.30+

# 安装
pnpm install
pnpm build:native    # 编译 node-fluidsynth 绑定
pnpm dev             # 启动开发环境

# 开发命令
pnpm test            # 单元测试
pnpm test:e2e        # E2E 测试
pnpm lint            # 代码检查
pnpm build           # 生产构建
pnpm package         # 打包安装程序
```

---

## 9. 团队配置建议

### MVP 阶段（12-13 周）
- **1 个全栈工程师**：负责所有代码
- **1 个音乐顾问**（可选）：验证音乐创作体验
- **1 个设计师**（可选）：UI/UX 设计

### v1.0 阶段
- **2 个工程师**：一个后端+音频，一个前端+Agent
- **1 个音乐顾问**：验证创作质量
- **1 个设计师**：完整 UI/UX
- **1 个 DevOps**（可选）：CI/CD、发布

---

## 10. 参考

- [Electron 官方文档](https://www.electronjs.org/docs)
- [FluidSynth 官方](http://www.musescore.org/fluidsynth/)
- [MCP 官方](https://modelcontextprotocol.io/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [electron-builder 文档](https://www.electron.build/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
