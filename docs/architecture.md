# 系统架构

> 本文档描述 Composer 共鸣的整体架构、三层职责划分、目录结构和关键组件交互。

---

## 1. 设计原则

1. **单一真相源**：所有编辑（人/Agent/系统）都通过 Command 队列进入统一状态层
2. **职责分离**：UI、编排、音频渲染三层各司其职
3. **MCP 优先**：Agent 通过标准 MCP 协议操作编辑器，与工具实现解耦
4. **进程隔离**：音频渲染独立进程，防止阻塞主线程和音频崩溃波及主进程
5. **纯 TS 核心**：核心业务逻辑不依赖 Electron，可脱离应用独立测试和复用
6. **开源友好**：所有关键模块可替换，避免单一供应商锁定

---

## 2. 总体架构

```
┌───────────────────────────────────────────────────────────────────┐
│                        Application Shell                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Renderer Process                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │ │
│  │  │  Editor UI   │  │  Chat Panel  │  │  Agent Runtime    │ │ │
│  │  │              │  │              │  │                   │ │ │
│  │  │ Piano Roll   │◄─┤ 消息列表     │  │ - LLM Client      │ │ │
│  │  │ Timeline     │  │ 工具调用     │◄─┤ - Tool Registry   │ │ │
│  │  │ Track List   │  │ 权限弹窗     │  │ - Context Mgr     │ │ │
│  │  │ Mixer        │  │ 建议卡片     │  │ - Memory          │ │ │
│  │  │ Transport    │  │              │  │ - Guardrails      │ │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────┘ │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │   Project Store (Zustand + Command Pattern)            │ │ │
│  │  │   - undo/redo 栈                                       │ │ │
│  │  │   - BroadcastChannel 同步                              │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          ▲                                        │
│                          │ HTTP/WS / IPC                          │
│                          │                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Main Process                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │ │
│  │  │ MCP Server   │  │ Audio Bridge │  │ Storage / Config  │ │ │
│  │  │ (本地 HTTP)  │  │              │  │                   │ │ │
│  │  │              │  │ 进程间通信    │  │ 工程文件 IO        │ │ │
│  │  │ Tool 实现    │  │              │  │ 用户配置           │ │ │
│  │  │ 状态查询     │  │              │  │ API Key 加密       │ │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Audio Render Process                      │ │
│  │  (独立 Node 子进程)                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │ │
│  │  │ FluidSynth   │  │ Offline      │  │ Effect Chain      │ │ │
│  │  │ (实时播放)   │  │ Render       │  │ (未来 JUCE)       │ │ │
│  │  │              │  │ (导出)        │  │                   │ │ │
│  │  └──────────────┘  └──────────────┘  └───────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    Network / External                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Anthropic │  │ OpenAI   │  │Local Model│  │Custom    │         │
│  │Claude    │  │ GPT-4/5  │  │(llama.cpp)│  │Endpoint  │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. 三层职责划分

### 3.1 Renderer Process（渲染进程）

**职责**：
- UI 呈现和用户交互
- 状态管理（Zustand + Command Pattern）
- Agent Runtime（LLM 调用、Tool 分发、上下文管理）
- 低延迟实时预览（Web Audio）

**关键组件**：
- **Editor UI**：Piano Roll、Timeline、Track List、Mixer、Transport
- **Chat Panel**：Agent 对话界面、建议卡片、权限弹窗
- **Agent Runtime**：多模型 LLM 客户端、Tool 适配器、Guardrails
- **Project Store**：单一真相源，Command 队列，Undo/redo

**为什么 Agent Runtime 放在 Renderer**：
- Chat UI 需要流式响应，Renderer 处理延迟最低
- Tool 调用可以直接访问 Zustand store，无需跨进程 IPC
- LLM API 请求本身不敏感，API Key 存放在 Main Process 更安全

### 3.2 Main Process（主进程）

**职责**：
- MCP Server（本地 HTTP，暴露 Tool 接口）
- 工程文件持久化（`.caaproj`）
- 用户配置管理（模型选择、API Key 加密存储）
- 音频进程管理（fork / spawn / kill）
- 进程间通信桥接

**关键组件**：
- **MCP Server**：基于 `@modelcontextprotocol/sdk`，本地 HTTP 端口
- **Storage**：工程文件读写、版本迁移、自动保存
- **Settings Store**：`safeStorage` 加密 API Key
- **Audio Bridge**：管理 Audio Render Process 生命周期

### 3.3 Audio Render Process（音频渲染进程）

**职责**：
- 实时音频播放（低延迟）
- 离线音频渲染（导出 WAV/MP3）
- 音源加载（SoundFont）
- 效果器链（未来）

**关键组件**：
- **FluidSynth Bridge**：`node-fluidsynth` 或 `synthwave` 绑定
- **Offline Renderer**：批量导出
- **Effect Chain**：JUCE 或 dsp.js 集成（M6 阶段）

**为什么独立进程**：
- FluidSynth 是阻塞式 C 库，Node 绑定默认阻塞事件循环
- 崩溃隔离：音频崩溃不牵连 UI
- 独立升级：可替换为不同音频引擎

---

## 4. 项目目录结构

```
resonance/
├── README.md                    # 项目根 README（含命名哲学）
├── LICENSE                      # Apache-2.0
├── TRADEMARK.md                 # 商标说明（后续补充）
├── CONTRIBUTING.md              # 贡献指南
├── CHANGELOG.md                 # 变更记录
├── .gitignore
│
├── docs/                        # 设计文档
│   ├── architecture.md          # 本文档
│   ├── tech-stack.md            # 技术选型
│   ├── data-model.md            # 数据模型
│   ├── mcp-tools.md             # MCP 工具
│   ├── agent-design.md          # Agent 设计
│   ├── human-agent-collab.md    # 人机协作
│   └── milestones.md            # 里程碑
│
├── packages/                    # monorepo 包（pnpm workspaces）
│   │
│   ├── caa-core/                # 纯 TS 核心逻辑
│   │   ├── src/
│   │   │   ├── project.ts       # 项目数据结构与操作
│   │   │   ├── track.ts         # 轨道操作
│   │   │   ├── note.ts          # 音符操作
│   │   │   ├── timeline.ts      # tick ↔ beat ↔ second 转换
│   │   │   ├── scale.ts         # 音阶计算
│   │   │   ├── chord.ts         # 和弦解析与匹配
│   │   │   ├── command.ts       # Command Pattern
│   │   │   └── constants.ts     # 常量（如 TICKS_PER_BEAT = 480）
│   │   ├── tests/               # 单元测试（Vitest）
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── caa-store/               # 状态管理
│   │   ├── src/
│   │   │   ├── project-store.ts
│   │   │   ├── command-store.ts # Undo/redo 栈
│   │   │   └── broadcast-sync.ts
│   │   └── tests/
│   │
│   ├── caa-agent/               # Agent Runtime
│   │   ├── src/
│   │   │   ├── runtime.ts       # 主运行时
│   │   │   ├── llm-client/
│   │   │   │   ├── base.ts      # 抽象接口
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── local.ts
│   │   │   │   └── custom.ts
│   │   │   ├── tool-adapter/
│   │   │   │   ├── anthropic.ts # Anthropic Tool Use 格式
│   │   │   │   └── openai.ts    # OpenAI Function Calling 格式
│   │   │   ├── prompt/
│   │   │   │   ├── composer.md  # 作曲家模式
│   │   │   │   ├── arranger.md  # 编曲家模式
│   │   │   │   ├── critic.md    # 审听员模式
│   │   │   │   └── teacher.md   # 教学模式
│   │   │   ├── context/
│   │   │   │   ├── manager.ts
│   │   │   │   └── summarizer.ts
│   │   │   ├── memory/
│   │   │   │   ├── user-prefs.ts
│   │   │   │   └── session.ts
│   │   │   └── guardrails/
│   │   │       ├── permission.ts
│   │   │       ├── budget.ts
│   │   │       └── safety.ts
│   │   └── tests/
│   │
│   └── caa-midi-ir/             # MIDI IR schema 与校验
│       ├── src/
│       │   ├── schema.json
│       │   └── validator.ts
│       └── tests/
│
├── shared/                      # 前后端共用
│   ├── types.ts                 # 核心 TypeScript 类型
│   ├── midi.ts                  # MIDI 工具函数
│   └── constants.ts             # 共享常量
│
├── electron/                    # Electron 主进程代码
│   ├── main.ts                  # 入口
│   ├── config.ts                # 环境配置
│   ├── ipc/
│   │   ├── handlers.ts          # IPC 处理器
│   │   └── channels.ts          # IPC 通道定义
│   ├── server/
│   │   ├── http.ts              # 本地 HTTP server
│   │   ├── ws.ts                # WebSocket server
│   │   └── mcp/
│   │       ├── server.ts        # MCP Server 实例
│   │       └── tools/
│   │           ├── project.ts   # project 类工具
│   │           ├── track.ts     # track 类工具
│   │           ├── note.ts      # note 类工具
│   │           ├── audio.ts     # audio 类工具
│   │           └── transport.ts # transport 类工具
│   ├── audio/
│   │   ├── engine.ts            # Audio Render Process 入口
│   │   ├── fluidsynth.ts        # FluidSynth 绑定封装
│   │   ├── renderer.ts          # 离线渲染
│   │   └── bridge.ts            # 主进程与音频进程通信
│   ├── storage/
│   │   ├── project.ts           # 工程文件读写
│   │   └── settings.ts          # 用户设置
│   └── updater/                 # 自动更新
│       └── index.ts
│
├── src/                         # Renderer 前端代码
│   ├── main.tsx                 # React 入口
│   ├── app/
│   │   ├── App.tsx              # 根组件
│   │   ├── router.tsx           # 路由（如需）
│   │   └── store.ts             # Zustand store 初始化
│   ├── components/
│   │   ├── piano-roll/          # Piano Roll 编辑器
│   │   │   ├── PianoRoll.tsx
│   │   │   ├── Note.tsx
│   │   │   ├── Keyboard.tsx
│   │   │   ├── Grid.tsx
│   │   │   ├── Selection.tsx
│   │   │   ├── AgentOverlay.tsx # Agent 编辑高亮层
│   │   │   └── index.ts
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── LoopMarker.tsx
│   │   ├── track-list/
│   │   │   └── TrackList.tsx
│   │   ├── mixer/
│   │   │   ├── Mixer.tsx
│   │   │   └── ChannelStrip.tsx
│   │   ├── transport/
│   │   │   └── Transport.tsx
│   │   ├── ai-chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ToolCallCard.tsx
│   │   │   ├── SuggestionCard.tsx
│   │   │   └── PermissionDialog.tsx
│   │   ├── layout/
│   │   │   ├── ResizablePanel.tsx
│   │   │   └── DockingLayout.tsx
│   │   └── ui/                  # 通用 UI 组件
│   │       ├── Button.tsx
│   │       ├── Slider.tsx
│   │       ├── Knob.tsx
│   │       └── Tooltip.tsx
│   ├── hooks/
│   │   ├── use-midi.ts
│   │   ├── use-audio.ts
│   │   ├── use-mcp-client.ts
│   │   ├── use-agent.ts
│   │   └── use-commands.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css        # 主题变量
│   │   └── dark.css
│   └── assets/
│       └── icons/
│
├── soundfonts/                  # 内置音源
│   ├── FluidR3_GM.sf2           # CC0 通用音源
│   └── README.md                # 音源许可说明
│
├── scripts/
│   ├── dev.ts                   # 开发启动脚本
│   ├── build.ts                 # 生产构建
│   ├── test.ts                  # 测试启动
│   └── package.ts               # electron-builder 打包
│
├── tests/
│   ├── e2e/                     # Playwright E2E
│   └── integration/             # 集成测试
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # CI 工作流
│   │   └── release.yml          # 发布工作流
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── electron-builder.yml         # 打包配置
├── package.json                 # 根 package
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── .eslintrc.cjs
```

---

## 5. 关键组件交互

### 5.1 用户编辑 → 状态更新 → Agent 感知

```
用户拖音符（Piano Roll）
   │
   ▼
dispatch(Command { type: 'note.update', source: 'human' })
   │
   ▼
Command Store 执行命令
   │
   ├──── 更新 Project State
   ├──── BroadcastChannel 通知所有订阅者
   │         ├──── Audio Render Process（实时音频更新）
   │         └──── Agent Context（供 Agent 感知）
   └──── UI 组件自动 re-render（Zustand 订阅）
```

### 5.2 Agent 工具调用 → 编辑器更新

```
用户输入"加一段钢琴伴奏"
   │
   ▼
Agent Runtime 调用 LLM
   │
   ▼
LLM 返回 tool_call: create_track + write_progression
   │
   ▼
Agent Runtime 检查权限
   │
   ├──── 权限 OK → 通过 MCP HTTP 调用 Main Process
   │                    │
   │                    ▼
   │              Main Process 执行 Tool
   │                    │
   │                    ▼
   │              dispatch(Command { type: 'track.add', source: 'agent' })
   │                    │
   │                    ▼
   │              回到状态更新流程（同 5.1）
   │
   └──── 权限询问 → Chat UI 显示 PermissionDialog
                  │
                  ▼
              用户点击"接受" → 回到权限 OK 分支
```

### 5.3 实时预览 vs 离线渲染

```
用户编辑音符（拖拽中）
   │
   ▼
Renderer 使用 Web Audio 快速预览（延迟 < 5ms）
   │
   ▼
用户按下"播放"
   │
   ▼
Main Process 通知 Audio Render Process
   │
   ▼
FluidSynth 使用完整 SoundFont 渲染（音质最高）
   │
   ▼
音频流通过 IPC 传回 Renderer 播放

导出时：
   │
   ▼
直接调用 Audio Render Process 的 Offline Render
   │
   ▼
FluidSynth 渲染整首 → 写入 WAV/MP3 文件
```

---

## 6. 关键设计决策

### 6.1 为什么用 Command Pattern

**问题**：人、Agent、系统都可能修改工程状态，如何保证一致性？

**方案**：所有修改都封装成 `Command`，通过统一的 Store 队列执行。

**收益**：
- Undo/redo 天然是 Command 栈操作
- Agent 批量操作可以打包成一个 Command（撤销时一步撤销）
- 状态变更可追踪、可序列化、可重放
- 冲突检测可以基于 Command 的 `affectedNotes` 集合

### 6.2 为什么音频独立进程

**问题**：FluidSynth 是阻塞式 C 库，Node 绑定阻塞事件循环。

**方案**：独立 Node 子进程（`child_process.fork`），通过 IPC 通信。

**收益**：
- 主进程不阻塞，UI 响应流畅
- 音频崩溃隔离
- 可独立替换（未来切 JUCE 只需替换这个进程）

### 6.3 为什么 Agent Runtime 在 Renderer 而非 Main

**问题**：LLM 调用可以在任何进程，放哪更合理？

**方案**：放在 Renderer。

**理由**：
- Chat UI 需要流式响应，Renderer 处理延迟最低
- Tool 调用可以直接访问 Zustand store，避免 IPC 开销
- LLM API Key 敏感数据存放在 Main Process（安全）
- Agent 与编辑器状态天然在同一进程，双向感知无缝

### 6.4 为什么用 MCP 协议

**问题**：Agent 通过什么协议调用工具？

**方案**：MCP（Model Context Protocol）标准协议。

**理由**：
- **工具发现**：Agent 自读工具描述，不需要硬编码提示词
- **参数校验**：schema 层挡掉非法操作
- **跨 Agent 复用**：MCP Server 可被 Claude、ChatGPT、Cursor 等共用
- **可解释**：每次工具调用有清晰日志，方便调试
- **生态对齐**：主流 AI 工具都在采用 MCP，不落后于生态

### 6.5 为什么核心逻辑纯 TS

**问题**：`caa-core` 是否可以依赖 Electron API？

**方案**：完全纯 TS，不依赖任何平台 API。

**理由**：
- 单元测试方便（不需要 mock Electron）
- 未来可脱离 Electron 独立发布（CLI、Web 版）
- 更容易被其他项目复用（比如 MCP Server 单独部署）

---

## 7. 数据流全景

```
┌──────────────────────────────────────────────────────────────┐
│                     数据流方向                                │
│                                                              │
│  用户输入 ──► UI 组件 ──► Command Store                       │
│                                          │                   │
│                                          ▼                   │
│  用户输入 ──► Chat Panel ──► Agent Runtime ──► LLM           │
│                                          │                   │
│                                          ▼                   │
│  LLM 返回 tool_call ──► Agent Runtime ──► MCP HTTP          │
│                                          │                   │
│                                          ▼                   │
│                          Main Process Tool 实现              │
│                                          │                   │
│                                          ▼                   │
│                          Command Store ◄──────────┘          │
│                                    │                         │
│                                    ▼                         │
│                          Project State (单一真相源)           │
│                                    │                         │
│                    ┌───────────────┼───────────────┐         │
│                    ▼               ▼               ▼         │
│              UI 自动更新      Audio Process    Agent Context  │
│                    │               │               │         │
│                    ▼               ▼               ▼         │
│              Piano Roll 高亮   音频更新       Agent 感知      │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. 依赖关系

### 8.1 包依赖（内部）

```
caa-core           (无依赖，纯 TS)
    ▲
    │
caa-midi-ir        (依赖 caa-core 的类型)
    ▲
    │
caa-store          (依赖 caa-core)
    ▲
    │
caa-agent          (依赖 caa-core，通过 MCP 客户端与 MCP Server 通信)
    ▲
    │
Renderer           (依赖 caa-core, caa-store, caa-agent)
    │
Main Process       (依赖 caa-core, caa-midi-ir)
    │
Audio Render       (依赖 caa-core, caa-midi-ir)
```

### 8.2 外部依赖（主要）

| 依赖 | 版本 | 用途 | 许可 |
|---|---|---|---|
| Electron | 30+ | 桌面壳 | MIT |
| React | 18+ | UI 框架 | MIT |
| Vite | 5+ | 构建工具 | MIT |
| Zustand | 4+ | 状态管理 | MIT |
| TypeScript | 5+ | 类型系统 | Apache-2.0 |
| Vitest | 1+ | 单元测试 | MIT |
| Playwright | 1+ | E2E 测试 | Apache-2.0 |
| @modelcontextprotocol/sdk | latest | MCP 客户端/服务端 | MIT |
| @anthropic-ai/sdk | latest | Claude API | MIT |
| openai | latest | OpenAI API | MIT |
| node-fluidsynth | latest | 音频合成 | LGPL |
| FluidR3_GM.sf2 | 2.2 | 音源 | CC0 |
| electron-builder | latest | 打包 | MIT |
| electron-updater | latest | 自动更新 | MIT |
| @thd/keyboard | latest | MIDI 键盘（未来） | MIT |

---

## 9. 未来扩展点

### 9.1 VST 插件支持

**当前**：仅支持 SoundFont

**扩展点**：Audio Render Process 增加 JUCE Plugin Host 桥接

**架构预留**：Audio Render Process 是可替换的独立进程，未来可以切换为 JUCE 音频引擎

### 9.2 云端同步

**当前**：本地工程文件

**扩展点**：Main Process 的 Storage 层抽象化，未来可以替换为云端存储

**架构预留**：Storage 接口已经抽象，替换实现即可

### 9.3 多用户协作

**当前**：单用户

**扩展点**：Command Store 支持远程命令同步

**架构预留**：BroadcastChannel 已经支持多实例通信，未来扩展为 WebSocket 即可

---

## 10. 参考

- [Electron 官方文档](https://www.electronjs.org/docs)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [FluidSynth 文档](http://www.musescore.org/fluidsynth/)
- [Command Pattern (GoF)](https://en.wikipedia.org/wiki/Command_pattern)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
