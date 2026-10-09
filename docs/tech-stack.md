# 技术选型

> 本文档记录每个关键技术选型的决策过程、备选方案对比、最终选择和理由。
>
> **原则**：每个选择都要有明确的理由，避免"随手选了主流方案"。

---

## 1. 桌面壳：Electron vs Tauri vs 原生

### 决策：**Electron 30+**

### 对比矩阵

| 维度 | Electron | Tauri | 原生（Qt/JUCE） |
|---|---|---|---|
| 音频延迟 | ⭐⭐⭐⭐⭐ 原生音频（可桥接） | ⭐⭐⭐⭐ Rust 原生 | ⭐⭐⭐⭐⭐ 最好 |
| 音源加载 | ⭐⭐⭐⭐⭐ 无限制 | ⭐⭐⭐⭐ 需 Rust FFI | ⭐⭐⭐⭐⭐ 最好 |
| VST 支持 | ⭐⭐⭐⭐ 可桥接 | ⭐⭐ 生态不成熟 | ⭐⭐⭐⭐⭐ 原生 |
| 前端生态 | ⭐⭐⭐⭐⭐ React 完整 | ⭐⭐⭐⭐ 一样，但调试略慢 | ⭐⭐ 需手写 |
| 打包体积 | ⭐⭐ 100MB+ | ⭐⭐⭐⭐⭐ 10-30MB | ⭐⭐⭐ 中等 |
| 冷启动 | ⭐⭐⭐⭐ 2-3 秒 | ⭐⭐⭐⭐⭐ <1 秒 | ⭐⭐⭐⭐⭐ 最快 |
| 开发速度 | ⭐⭐⭐⭐⭐ 最快 | ⭐⭐⭐⭐ 略慢 | ⭐⭐ 慢 |
| 学习曲线 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 需 Rust | ⭐⭐ 高 |
| 崩溃恢复 | ⭐⭐⭐ 需自建 | ⭐⭐⭐ 一样 | ⭐⭐⭐⭐ 好 |

### 决策理由

**为什么选 Electron**：
1. **音频能走原生**：Electron 可以调 WASAPI/CoreAudio，不受 Chromium 沙盒限制
2. **前端生态完整**：React、Zustand、Tailwind 等全可用
3. **MCP 集成自然**：Node.js 有官方 MCP SDK
4. **团队学习成本低**：Web 开发者最熟悉的方案

**为什么不用 Tauri**：
- VST 插件生态不成熟（虽然本项目 v1.0 未必支持 VST）
- 打包体积优势在我们这个音频+音源场景下不显著（SoundFont 就几百 MB）
- Rust FFI 层维护成本高，音频层如果走 WASM FluidSynth 反而不如 Electron 直接

**为什么不用原生**：
- UI 开发成本指数级上升
- 单人项目不适合
- 失去 Web 生态优势

### 未来迁移路径

如果 Electron 打包体积或性能成为瓶颈，可以迁移到 Tauri。因为：
- 前端代码（React）可复用
- 后端 Node.js 代码需要重写为 Rust（工作量大但可控）
- MCP Server 可以在 Rust 侧重建

---

## 2. 音频引擎：FluidSynth vs JUCE vs 自研

### 决策：**FluidSynth + SoundFont（v0.1）→ JUCE 扩展（v1.0+）**

### 对比矩阵

| 维度 | FluidSynth | JUCE | 自研 | LMMS |
|---|---|---|---|---|
| 音质 | ⭐⭐⭐⭐ SoundFont 采样 | ⭐⭐⭐⭐ 需自己写 | ⭐⭐ 极难做好 | ⭐⭐⭐⭐⭐ 完整 DAW |
| 学习曲线 | ⭐⭐⭐⭐⭐ 就是一个库 | ⭐⭐⭐ 需学 C++ | ⭐⭐ 音频 DSP 极难 | ⭐⭐ 代码库庞大 |
| 开发速度 | ⭐⭐⭐⭐⭐ 快 | ⭐⭐⭐ 中等 | ⭐ 极慢 | ⭐ 极慢 |
| 许可 | LGPL-2.1 ✅ | Apache-2.0 ✅ | 自定 ✅ | GPL-2 ❌ |
| 效果器 | ⭐⭐ 有限 | ⭐⭐⭐⭐⭐ 完整 | ⭐⭐ 需自己写 | ⭐⭐⭐⭐⭐ 完整 |
| 插件支持 | ⭐ 无 | ⭐⭐⭐⭐ 可宿主 | ⭐ 需自己写 | ⭐⭐⭐⭐ VST3/LV2 |
| Node 绑定 | ⭐⭐⭐⭐ 成熟 | ⭐⭐⭐ 需 CLI 桥接 | ⭐⭐⭐⭐⭐ | ⭐ 无 |

### 决策理由

**为什么选 FluidSynth 作为 MVP**：
1. **LGPL 许可**：可以动态链接闭源使用，Apache-2.0 兼容
2. **20+ 年历史**：稳定可靠，跨平台，社区成熟
3. **Node.js 绑定成熟**：`node-fluidsynth`、`synthwave` 都可用
4. **SoundFont 生态丰富**：FluidR3_GM (CC0)、General User GS、Harmoniums 等免费音源
5. **音质足够**：FluidR3_GM 是免费音源里公认最好的，MVP 阶段够用
6. **开发周期最短**：可以直接嵌入 Node 后端，不需要额外桥接

**为什么不用 JUCE 作为 MVP**：
- JUCE 是**框架**不是引擎，你还是要写很多代码
- C++ 项目拖慢迭代速度
- MVP 阶段目标是验证产品价值，不是打磨音质

**为什么不用 LMMS**：
- **GPL-2 传染**：与 Apache-2.0 冲突
- 代码库 100K+ 行，改造成本高
- 是一个完整 DAW，我们需要的是引擎不是软件

**为什么不从零自研**：
- 音频 DSP 是"坑里的坑"
- 效果器实现（动态压缩器、卷积混响）都是论文级工程
- 用户不认——你做出来的钢琴音色大概率不如 FluidR3

### 演进路径

```
v0.1（MVP）：FluidSynth + FluidR3_GM
              ├── 音质：良好（免费音源最好）
              ├── 效果器：基础 Web Audio
              └── 插件：不支持

v0.5：引入 JUCE
       ├── 保留 FluidSynth 作为通用 fallback
       └── JUCE 承担合成器音色 + 效果器

v1.0：VST 宿主
       └── JUCE Plugin Host 桥接用户插件
```

---

## 3. 音源：FluidR3_GM vs 其他

### 决策：**FluidR3_GM.sf2 (CC0)**

### 备选对比

| 音源 | 许可 | 大小 | 音质 | 说明 |
|---|---|---|---|---|
| FluidR3_GM | CC0 | 200MB | ⭐⭐⭐⭐⭐ | 社区公认最佳免费 GM |
| General User GS | CC0 | 30MB | ⭐⭐⭐ | 小体积但够用 |
| Harmoniums | CC0 | 20MB | ⭐⭐⭐ | 特定音色 |
| SonicSpectrum | CC0 | 40MB | ⭐⭐⭐ | 均衡 |
| 商业音源 | 付费 | 大 | ⭐⭐⭐⭐⭐ | 授权复杂 |

### 决策理由

- **CC0 公共领域**：完全无版权顾虑
- **音质最高**：FluidR3_GM 是 Linux 音频社区的黄金标准
- **GM 兼容**：支持 GM/GS 乐器编号，与 MIDI 标准对齐
- **社区基础**：大量用户熟悉，遇到问题容易找到答案

### 音源授权注意事项

**不要**：
- 使用网上流传的未经授权 SF2 文件（很多是灰产）
- 内置任何商业音源

**可以**：
- FluidR3_GM (CC0)
- General User GS (CC0)
- Harmoniums (CC0)
- 用户自己导入的音源（用户负责授权）

---

## 4. MCP 协议：官方 SDK vs 自建

### 决策：**@modelcontextprotocol/sdk（官方 TypeScript SDK）**

### 决策理由

**为什么用官方 SDK**：
1. **协议演进**：MCP 协议在快速迭代，官方 SDK 会跟上
2. **兼容性**：与所有 MCP 客户端（Claude Desktop、Cursor、ZCode 等）兼容
3. **类型安全**：TypeScript 类型完整
4. **社区支持**：遇到问题容易找到答案

**为什么不用自建**：
- MCP 是**标准协议**，自建实现必然有偏差
- 未来可能被主流客户端拒绝（协议不合规）
- 自建维护成本高

### 关键设计

**本地 HTTP 服务**：
- 端口：`127.0.0.1:随机端口`（启动时动态分配）
- 传输：HTTP + SSE（MCP 标准传输方式之一）
- 认证：本地回环，无需认证

**MCP 工具清单**：详见 [mcp-tools.md](mcp-tools.md)

---

## 5. LLM 客户端：多模型支持

### 决策：**多模型抽象层 + 用户可选**

### 支持列表

| Provider | 官方 SDK | 推荐用途 |
|---|---|---|
| Anthropic Claude | `@anthropic-ai/sdk` | 默认推荐，Tool Use 支持最好 |
| OpenAI GPT-4/5 | `openai` | 通用能力，视觉理解 |
| OpenAI 兼容端点 | `openai` (baseURL 配置) | DeepSeek、Moonshot、Qwen 等 |
| 本地模型 | `llama.cpp` 桥接 | 隐私敏感用户 |
| 自定义代理 | 用户配置 | 企业内网 |

### 抽象接口

```typescript
interface LLMClient {
  chat(params: ChatParams): AsyncIterable<ChatChunk>;
  close(): Promise<void>;
  modelCapabilities(): ModelCapabilities;
}
```

### 为什么多模型支持

1. **模型迭代快**：Claude 4.5 今天最强，明天可能不是
2. **用户成本敏感**：允许用户切到便宜模型
3. **合规需求**：某些行业要求用指定模型
4. **生态友好**：不被单一供应商锁定
5. **BYOK**：用户自带 Key 是技术用户硬需求

### 具体实现

**Claude（推荐默认）**：
```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: ... });
// 支持 Tool Use、流式响应、长上下文
```

**OpenAI 兼容**：
```typescript
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: ..., baseURL: ... });
// 支持 Function Calling、流式响应
// 通过 baseURL 切换到 DeepSeek、Moonshot 等
```

---

## 6. 前端框架：React vs Vue vs Svelte

### 决策：**React 18 + Vite**

### 对比

| 维度 | React | Vue | Svelte |
|---|---|---|---|
| 生态 | ⭐⭐⭐⭐⭐ 最大 | ⭐⭐⭐⭐ 大 | ⭐⭐⭐ 中等 |
| 组件库 | ⭐⭐⭐⭐⭐ 极丰富 | ⭐⭐⭐⭐ 丰富 | ⭐⭐⭐ 中等 |
| 学习曲线 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 低 | ⭐⭐⭐⭐⭐ 低 |
| 招聘 | ⭐⭐⭐⭐⭐ 最容易 | ⭐⭐⭐⭐ 容易 | ⭐⭐⭐ 一般 |
| 类型支持 | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐⭐⭐ 好 | ⭐⭐⭐⭐ 好 |
| 性能 | ⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐⭐ 最好 |

### 决策理由

- **生态最大**：Piano Roll 这种自定义 Canvas 组件，React 生态资源最丰富
- **招人容易**：开源项目需要持续贡献者
- **社区案例**：Linear、Notion、Figma 都是 React
- **Vite 加速**：HMR 极快，开发体验好

---

## 7. 状态管理：Zustand vs Redux vs Jotai

### 决策：**Zustand**

### 决策理由

- **轻量**：Zustand 比 Redux Toolkit 小 10 倍
- **直观**：没有 reducer/action 抽象，直接函数式
- **Performance**：支持 selectors，性能接近 Redux
- **集成好**：与 React、TypeScript、immer 都无缝
- **社区趋势**：TanStack Query、Redux 官方都在推荐 Zustand

```typescript
// Zustand 风格
const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  setProject: (p) => set({ project: p }),
  updateNote: (id, changes) => set(state => ({
    project: {
      ...state.project,
      notes: state.project.notes.map(n =>
        n.id === id ? { ...n, ...changes } : n
      )
    }
  })),
}));
```

**为什么不 Redux**：Redux 学习曲线陡峭，middleware 复杂，Zustand 覆盖 90% 场景。

**为什么不 Jotai**：Jotai 是原子化状态，适合复杂依赖，我们场景用不到。

---

## 8. 构建工具：Vite vs Webpack

### 决策：**Vite 5+**

### 决策理由

- **开发速度**：Vite 冷启动秒级，WebPacek 需要十几秒
- **配置简单**：Vite 默认配置足够 90% 场景
- **HMR 快**：修改代码瞬间生效
- **社区共识**：新项目基本都选 Vite

**Electron 集成**：使用 `vite-electron-plugin` 或 `electron-vite`。

---

## 9. 测试框架：Vitest + Playwright

### 决策：**Vitest（单元/集成）+ Playwright（E2E）**

### 决策理由

**Vitest 而非 Jest**：
- Vite 原生集成，无需 babel 配置
- 速度更快（并行执行）
- TypeScript 原生支持

**Playwright 而非 Cypress**：
- 多浏览器支持（Chromium、Firefox、WebKit）
- 支持 Electron（Cypress 对 Electron 支持有限）
- 速度快，稳定性好

---

## 10. 打包与分发

### 决策：**electron-builder + electron-updater**

### 决策理由

**electron-builder**：
- 支持 Windows/macOS/Linux 打包
- 配置简洁（YAML）
- 支持代码签名
- 社区默认选择

**electron-updater**：
- 自动更新机制
- 支持多种后端（GitHub Releases、自建、S3）
- 增量更新减少下载

### 代码签名

| 平台 | 签名 | 成本 | 必需性 |
|---|---|---|---|
| Windows | Authenticode | $99/年起 | 推荐 |
| macOS | Developer ID | $99/年 | 必需（防 Gatekeeper 拦截） |
| Linux | 无强制签名 | - | 可选（cosign/.sigstore） |

**MVP 阶段**：先不签名，用测试版发布。
**正式版**：注册签名证书。

---

## 11. 开源许可

### 决策：**Apache License 2.0**

### 为什么 Apache-2.0 优于 MIT

- **专利保护条款**：Apache-2.0 明确要求贡献者授权专利，避免未来专利诉讼
- **音乐行业相关**：音源、插件、算法都涉及专利问题
- **企业友好**：Google、Microsoft 等大公司友好

### 为什么 Apache-2.0 优于 GPL

- **不传染**：Apache-2.0 不要求衍生作品开源
- **商业友好**：用户可以闭源商用
- **社区参与门槛低**：不用担心贡献了代码就被迫开源商业代码

### 音源/依赖许可合规检查

| 依赖 | 许可 | 是否兼容 Apache-2.0 |
|---|---|---|
| Electron | MIT | ✅ |
| React | MIT | ✅ |
| Vite | MIT | ✅ |
| Zustand | MIT | ✅ |
| TypeScript | Apache-2.0 | ✅ |
| Vitest | MIT | ✅ |
| Playwright | Apache-2.0 | ✅ |
| MCP SDK | MIT | ✅ |
| Anthropic SDK | MIT | ✅ |
| OpenAI SDK | MIT | ✅ |
| FluidSynth | LGPL-2.1 | ✅（动态链接） |
| FluidR3_GM | CC0 | ✅ |
| electron-builder | MIT | ✅ |

**全部兼容**，无许可冲突。

---

## 12. 项目工具链

| 用途 | 选择 | 版本 |
|---|---|---|
| 包管理器 | pnpm | 8+ |
| Monorepo | pnpm workspaces | - |
| TypeScript | TypeScript | 5+ |
| Lint | ESLint + Prettier | latest |
| Commit 规范 | commitlint + conventional commits | - |
| CI | GitHub Actions | - |
| Code Coverage | Vitest 内置 | - |
| API 文档 | TypeDoc | - |

---

## 13. 开发环境

### 前置要求

- Node.js 20+
- pnpm 8+
- CMake（用于编译 FluidSynth 绑定）
- Git 2.30+
- Windows 10+ / macOS 12+ / Linux (Ubuntu 22.04+)

### 首次安装

```bash
git clone https://github.com/<org>/resonance.git
cd resonance
pnpm install
pnpm build:native    # 编译 node-fluidsynth 绑定
pnpm dev             # 启动开发环境
```

### 开发命令

```bash
pnpm dev              # 启动开发环境（热更新）
pnpm build            # 生产构建
pnpm test             # 单元测试
pnpm test:e2e         # E2E 测试
pnpm lint             # 代码检查
pnpm format           # 格式化
pnpm typecheck        # 类型检查
pnpm package          # 打包安装程序
pnpm publish          # 发布（需要权限）
```

---

## 14. 关键决策速查

| 问题 | 选择 | 详细理由 |
|---|---|---|
| 桌面壳 | Electron | 音频能走原生、前端生态完整 |
| 音频引擎 | FluidSynth | LGPL、成熟、Node 绑定好 |
| 音源 | FluidR3_GM | CC0、免费音源最好 |
| 前端框架 | React | 生态最大、招人容易 |
| 状态管理 | Zustand | 轻量、直观、性能好 |
| 构建 | Vite | 开发体验好 |
| MCP SDK | 官方 SDK | 协议演进、兼容性 |
| LLM | 多模型抽象 | 用户可选、不被锁定 |
| 打包 | electron-builder | 成熟、跨平台 |
| 开源许可 | Apache-2.0 | 专利保护、商业友好 |

---

## 15. 未来可能的技术演进

- **音频**：JUCE 替换 FluidSynth → VST 插件支持
- **前端**：React 19（Server Components 无用，但并发功能有用）
- **状态**：如 Zustand 出问题，可切 Jotai
- **MCP**：如 MCP 协议演进，官方 SDK 会跟进
- **LLM**：随模型迭代更新推荐默认

---

## 16. 参考

- [Electron 官方文档](https://www.electronjs.org/docs)
- [FluidSynth 官方](http://www.musescore.org/fluidsynth/)
- [MCP 官方](https://modelcontextprotocol.io/)
- [Anthropic 官方 SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Vite 官方](https://vitejs.dev/)
- [Zustand 官方](https://github.com/pmndrs/zustand)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
