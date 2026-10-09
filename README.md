# Composer 共鸣

> **An AI-native music composer. Compose together, resonate within.**
>
> AI 时代的音乐创作环境 —— 与 AI 共鸣，与人共鸣。

**Composer / 共鸣** 是一个开源的、AI 原生的音乐创作工具。它不是"AI 生成音乐的黑盒"，也不是"传统 DAW 外挂一个 ChatGPT"，而是把 **Agent 作为产品本身的一部分** —— 用户打开应用就能与内建的音乐创作助手一起工作，人和 AI 共同编辑同一份工程、互相感知、协同创作。

---

## 命名哲学

### Composer / 共鸣

项目以 **英文 Composer** 与 **中文共鸣** 共同呈现，两个词不是简单的翻译关系，而是**语义互补**，各自表达产品哲学的一侧。

#### Composer：创作者，也是专业

**Composer** 在英语里的本义是"作曲家"。它不是 *creator*（创造者）、不是 *maker*（制作者）、不是 *writer*（写作者）——**它是古典音乐语境里的专业称谓**。贝多芬是 Composer，舒伯特是 Composer，AI 帮用户创作时，用户的身份依然是 Composer，AI 是协助者。

选择 Composer 意味着：
- **用户是主体**：AI 不取代创作，只协助创作
- **专业定位**：不把它做成"一键生成 BGM"的娱乐工具，而是做成能承担严肃音乐创作的工作台
- **避开 AI 标签**：不用 *ComposeAI / GenMusic / AI-Beat* 这类泛滥的命名，避免产品被贴上"又一个 AI 玩具"的标签

#### 共鸣：作品唤起的共振

**共鸣** 在中文里既是一个物理概念（共振），也是一个情感概念（心理共振）。它指向**作品与听者之间的关系**——一首好作品的价值，不在于创作者的巧思，而在于它引发了什么共鸣。

选择"共鸣"意味着：
- **作品的终点是共鸣**：创作工具的意义，最终在于让作品抵达听者
- **人机之间也在共鸣**：Agent 理解用户的意图、匹配用户的风格、跟随用户的节奏——这本身是一种"技术性的共鸣"
- **超越翻译对应**："共鸣"不是"Composer"的中文翻译，它讲的是产品哲学的另一半

#### 合在一起

```
英文 Composer  =  创作者（谁在创作）
中文 共鸣     =  作品引发的情感共振（为什么创作）
                ↓
       创作者通过作品引发共鸣
```

一个词回答"这个软件让谁做什么"，一个词回答"这个软件最终为什么存在"。**信达雅三位一体**：

- **信**：准确说出产品是什么（音乐创作）与为什么（引发共鸣）
- **达**：两个词都好读好记，中英语境都自然
- **雅**：古典音乐的专业质感，避免落入"AI 工具"的俗套

---

## 项目当前状态

**v0.0.1 设计阶段**

技术方案已经完成，尚未开始编码实现。仓库当前仅包含设计文档。

| 文档 | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 系统架构总览 |
| [docs/tech-stack.md](docs/tech-stack.md) | 技术选型与决策理由 |
| [docs/data-model.md](docs/data-model.md) | 核心数据模型 |
| [docs/mcp-tools.md](docs/mcp-tools.md) | MCP 工具定义 |
| [docs/agent-design.md](docs/agent-design.md) | 内建 Agent 设计 |
| [docs/human-agent-collab.md](docs/human-agent-collab.md) | 人机协作设计 |
| [docs/milestones.md](docs/milestones.md) | 里程碑与开发节点 |

---

## 核心特性（规划中）

- **内建 AI Agent**：打开应用即可使用，无需配置外部 API
- **多模型支持**：Anthropic Claude、OpenAI GPT、本地模型、自定义端点
- **人机协同编辑**：用户和 Agent 编辑同一份工程，双向感知、可撤销
- **专业音频引擎**：基于 FluidSynth + SoundFont，支持多轨道混音
- **完整编辑能力**：Piano Roll、Timeline、Mixer、Transport，不牺牲人类编辑体验
- **MCP 协议**：Agent 通过标准 MCP 工具操控编辑器，可插拔可扩展
- **跨平台**：Windows / macOS / Linux
- **完全开源**：Apache-2.0 许可，欢迎贡献

---

## 文档

技术方案文档位于 [`docs/`](docs/) 目录：

- **[架构设计](docs/architecture.md)** — 系统整体架构、三层职责划分、目录结构
- **[技术选型](docs/tech-stack.md)** — Electron、FluidSynth、JUCE、MCP 的选型理由
- **[数据模型](docs/data-model.md)** — 工程文件、音符、轨道、Command Pattern
- **[MCP 工具](docs/mcp-tools.md)** — Agent 可调用的工具清单与协议
- **[Agent 设计](docs/agent-design.md)** — 内建 Agent Runtime、多模型接入、上下文管理
- **[人机协作](docs/human-agent-collab.md)** — 双编辑入口、协作模式、可视化设计
- **[里程碑](docs/milestones.md)** — 开发节点、时间线、交付标准

---

## 路线图

```
v0.1 Beta（约 12-13 周）    MVP：编辑器 + 音频 + 内建 Agent 基础版
v0.5（约 6-8 个月）         完整功能：效果器、混音、多模式 Agent、经济模型
v1.0（约 9-12 个月）        正式版：VST 支持、跨端同步、稳定发布
```

详见 [docs/milestones.md](docs/milestones.md)。

---

## 开源协议

本项目使用 [Apache License 2.0](LICENSE) 协议开源。

选择 Apache-2.0 而非 MIT 或 GPL 的理由：
- **Apache-2.0 优于 MIT**：多一层**专利保护条款**，对音乐行业（涉及大量插件、音源授权）尤为重要
- **Apache-2.0 优于 GPL**：Apache-2.0 不传染，商业友好，社区参与门槛低
- **Apache-2.0 是行业默认**：Google、Microsoft 等大公司友好，商业化路径清晰

关于商标与商标使用，另见 `TRADEMARK.md`（后续补充）。

---

## 贡献

欢迎任何形式的贡献：代码、文档、Bug 报告、设计讨论、社区运营。

在项目启动前（v0.1 之前），最重要的贡献形式是：
- **设计建议**：对 `docs/` 目录下的任何设计文档提出 PR
- **技术讨论**：在 GitHub Discussions 讨论技术选型
- **试用场景**：告诉我们你想用它做什么（音乐风格、使用场景、目标平台）

---

## 许可证

```
Copyright 2025-2026 Composer 共鸣 Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

*Compose together. Resonate within.*
*与 AI 共鸣，与人共鸣。*
