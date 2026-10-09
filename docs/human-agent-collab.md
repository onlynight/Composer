# 人机协作设计

> 本文档描述 Composer 共鸣中"人类用户"和"AI Agent"如何协同创作。
>
> **核心理念**：同一份工程数据、两个编辑入口、统一状态层、Command Pattern 贯穿、可视化 + 权限分级保护用户。人和 AI 是两个协作者，不是竞争者。

---

## 1. 设计原则

### 1.1 单一真相源（Single Source of Truth）

所有编辑（人/Agent/系统）都通过 Command 队列进入统一状态层。

**不允许**：
- UI 直接修改数据
- Agent 直接修改数据
- 系统绕过 Command 修改数据

**必须**：
- 所有编辑都封装成 `Command`
- Command 进入同一个队列
- Command 有同一个 undo/redo 栈

### 1.2 双向感知

- **Agent → 用户**：Agent 的操作在 UI 上可见（高亮、通知、动画）
- **用户 → Agent**：用户的编辑 Agent 感知得到（上下文附加、主动建议）

### 1.3 用户始终掌控

- Agent 的操作可以逐步查看和撤销
- Agent 的操作前需要权限确认（分级）
- Agent 生成的内容视觉上可区分
- 用户可以随时"暂停 Agent"、"撤销 Agent 所有改动"

### 1.4 编辑能力平等

**用户的编辑能力不能因为 Agent 存在而下降**：
- 用户可以完全不用 Agent，纯手动创作
- 用户可以完全用 Agent，Agent 主导创作
- 用户可以混合使用，人机协作

---

## 2. 统一状态层架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Single Source of Truth                    │
│                                                              │
│        ┌────────────────────────────────┐                    │
│        │   Project Store (Zustand)      │                    │
│        │   + Command Pattern            │                    │
│        │   + Broadcast Channel          │                    │
│        └───────────────┬────────────────┘                    │
│                        │                                     │
│              ┌─────────┴─────────┐                           │
│              │                   │                           │
│              ▼                   ▼                           │
│   ┌──────────────────┐   ┌──────────────────┐               │
│   │  Human Editor    │   │  Agent Editor    │               │
│   │  (Piano Roll,    │   │  (MCP Server,    │               │
│   │   MIDI Editor,   │   │   Tool Calls)    │               │
│   │   Chat Input)    │   │                  │               │
│   └──────────────────┘   └──────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Command Pattern（Command Pattern 详解）

### 3.1 命令结构

```typescript
interface Command {
  id: string;
  type: CommandType;
  timestamp: number;
  source: 'human' | 'agent' | 'system';
  agentSessionId?: string;      // 关联到 AI 会话
  batchId?: string;             // 批量操作的批次 ID
  description: string;          // 用于 UI 展示
  args: any;
  
  // 影响范围（用于冲突检测）
  affectedTracks?: string[];
  affectedNotes?: string[];
  
  // 执行
  execute(state: Project): Project;
  undo(state: Project): Project;
}
```

### 3.2 Command 类型

```typescript
type CommandType =
  // Note 操作
  | 'note.add' | 'note.remove' | 'note.update'
  | 'note.chord.add'
  | 'note.progression.add'
  | 'note.batch'                 // Agent 批量操作（多个命令打包）
  
  // Track 操作
  | 'track.add' | 'track.remove' | 'track.update'
  
  // Project 操作
  | 'project.updateRoot'
  
  // Effect 操作
  | 'effect.add' | 'effect.update' | 'effect.remove'
  
  // 混音操作
  | 'mixer.update';
```

### 3.3 Command Store 实现

```typescript
class CommandStore {
  private commands: Command[] = [];
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: Set<StateListener> = new Set();
  private userLock: Set<string> = new Set();  // 用户正在编辑的音符
  
  async dispatch(cmd: Command): Promise<void> {
    // 1. 冲突检测
    if (cmd.source === 'agent') {
      const affected = cmd.affectedNotes ?? [];
      const conflicts = affected.filter(id => this.userLock.has(id));
      if (conflicts.length > 0) {
        throw new ConflictError(`Note(s) ${conflicts} are being edited by user`);
      }
    }
    
    // 2. 执行命令
    const newProject = cmd.execute(currentProject);
    currentProject = newProject;
    
    // 3. 更新栈
    this.commands.push(cmd);
    this.undoStack.push(cmd);
    this.redoStack = [];
    
    // 4. 广播
    this.notify(cmd);
    
    // 5. Agent 操作可视化
    if (cmd.source === 'agent') {
      this.emitVisualFeedback(cmd);
    }
    
    // 6. 通知 Agent 用户操作
    if (cmd.source === 'human') {
      this.notifyAgentOfUserAction(cmd);
    }
  }
  
  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    
    currentProject = cmd.undo(currentProject);
    this.redoStack.push(cmd);
    this.notify({ ...cmd, isUndo: true });
  }
  
  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    
    currentProject = cmd.execute(currentProject);
    this.undoStack.push(cmd);
    this.notify({ ...cmd, isRedo: true });
  }
  
  // 特殊：撤销 Agent 的所有改动
  undoAllAgentChanges(sinceTimestamp: number): void {
    const agentCommands = this.undoStack.filter(
      c => c.source === 'agent' && c.timestamp >= sinceTimestamp
    );
    
    // 反向执行
    agentCommands.slice().reverse().forEach(cmd => {
      currentProject = cmd.undo(currentProject);
    });
    
    this.undoStack = this.undoStack.filter(c => !agentCommands.includes(c));
  }
  
  // 用户编辑锁定
  onUserStartEdit(noteIds: string[]) {
    noteIds.forEach(id => this.userLock.add(id));
  }
  
  onUserEndEdit(noteIds: string[]) {
    noteIds.forEach(id => this.userLock.delete(id));
  }
}
```

---

## 4. 冲突处理策略

### 4.1 三种冲突场景

| 场景 | 处理 |
|---|---|
| Agent 生成新音符，人类同时删掉另一个 | 无冲突，两条命令都执行 |
| 人类拖动音符 X，Agent 同时改同一个音符 X | Agent 让位，抛出 ConflictError |
| Agent 正在生成时人类按了 Stop | 立即中断 Agent 生成，已生成的进入 undo 栈 |

### 4.2 冲突检测实现

```typescript
class ConflictDetector {
  private userLocked: Set<string> = new Set();
  
  // 用户在拖拽、编辑时锁定音符
  onUserStartEdit(noteIds: string[]) {
    noteIds.forEach(id => this.userLocked.add(id));
  }
  
  onUserEndEdit(noteIds: string[]) {
    noteIds.forEach(id => this.userLocked.delete(id));
  }
  
  // Agent 编辑前检查
  checkAgentAccess(cmd: Command): 'ok' | 'conflict' {
    if (cmd.source !== 'agent') return 'ok';
    
    const affected = cmd.affectedNotes ?? [];
    const conflicts = affected.filter(id => this.userLocked.has(id));
    
    return conflicts.length > 0 ? 'conflict' : 'ok';
  }
}
```

### 4.3 冲突 UI 提示

```
┌──────────────────────────────────────┐
│ ⚠ 冲突：用户正在编辑此音符             │
│                                      │
│ Agent 想修改你正在编辑的音符 C4，是否？│
│                                      │
│ [让 Agent 修改] [让 Agent 稍后重试]    │
│ [让 Agent 跳过]                       │
└──────────────────────────────────────┘
```

---

## 5. 三种人机协作模式

### 5.1 模式 A：Agent 主导 + 用户审阅

**场景**：用户说"给我写一段情绪忧郁的主歌"

**流程**：
1. 用户自然语言描述 → Agent 生成初稿
2. 用户在 UI 中看到 Agent 的编辑（**视觉高亮**标记哪些是 Agent 生成的）
3. 用户满意的部分点"接受"，不满意的直接拖/删
4. 用户拖动的音符标记为"人类修改"

**UI 视觉语言**：
```
┌────────────────────────────────────────┐
│  ●──●──┐───┐──●──┐──●──●──             │
│  Agent  │   │ Agent│   │                │
│  (青色) 人(绿)  Agent(青色)              │
└────────────────────────────────────────┘
```

**Agent 操作可视化**：
- **生成中**：音符虚线显示 + 动画
- **生成完成**：变实线 + 短暂高亮
- **人类修改**：颜色变为绿色/人类色

### 5.2 模式 B：用户主导 + Agent 建议

**场景**：用户在写歌，卡住了

**流程**：
1. 用户手动写了一段主旋律
2. 用户点"AI 建议" → Agent 分析当前音符
3. Agent 给出 3 个建议：
   - "这里可以加一个 G7 和弦"
   - "第 4 小节的 A 可以试着换成 A#"
   - "副歌前可以做一个过门"
4. 用户点击建议 → Agent 应用改动 → 用户接受或撤销

**关键点**：建议是**非侵入式**的，用户点击才生效。

**建议卡片 UI**：
```
┌──────────────────────────────────┐
│ 💡 Agent 建议                    │
│                                  │
│ 1. 在第 4 小节加 G7 和弦         │
│    [✓ 应用] [✗ 忽略]            │
│                                  │
│ 2. 把 A 换成 A#（增加紧张感）     │
│    [✓ 应用] [✗ 忽略]            │
│                                  │
│ 3. 副歌前加个过门                 │
│    [✓ 应用] [✗ 忽略]            │
└──────────────────────────────────┘
```

### 5.3 模式 C：分工协作

**场景**：复杂编排

**流程**：
- 用户负责：主旋律、节奏动机
- Agent 负责：和声伴奏、填充、混音
- 或者反过来

**UI 上每个轨道可以标注"主导者"**：
```
🎵 Vocal      [用户]
🎹 Piano      [Agent]  ← 用户说了"给我配个钢琴伴奏"
🎸 Guitar     [用户]
🥁 Drums      [Agent]  ← 用户说了"加个鼓"
```

**主导者影响**：
- Agent 主导的轨道：Agent 可以自由生成和修改
- 用户主导的轨道：Agent 只能建议，需要用户确认才能修改
- 混合：默认所有轨道都是用户主导

---

## 6. Agent 操作可视化设计

### 6.1 Piano Roll 上的视觉语言

```
颜色编码：
- 白色：人类创建的音符（默认）
- 青色：Agent 创建的音符
- 绿色：人类修改过的音符（原本 Agent 生成）
- 虚线：Agent 正在生成的音符
- 实线：已完成的音符

图标标记：
- 🤖 音符右上角小图标：Agent 生成
- 👤 音符右上角小图标：人类创建/修改
```

### 6.2 Agent 生成动画

```typescript
// Piano Roll 组件
function NoteComponent({ note, isAgentGenerating, isRecentlyGenerated }) {
  return (
    <div
      className={`note ${note.source === 'agent' ? 'note--agent' : 'note--human'}
                 ${isAgentGenerating ? 'note--generating' : ''}
                 ${isRecentlyGenerated ? 'note--highlight' : ''}`}
    >
      {note.source === 'agent' && <AgentIcon />}
    </div>
  );
}
```

### 6.3 Agent 状态指示

**Chat 面板顶部**：
```
┌──────────────────────────────────────────┐
│ 🤖 Agent 状态                              │
│                                          │
│ ● idle     空闲                            │
│ ● thinking 思考中                          │
│ ● tool_call 正在调用工具                    │
│ ● waiting 等待你的确认                      │
│ ● error  出错                              │
└──────────────────────────────────────────┘
```

---

## 7. 权限分级 UI

### 7.1 权限级别

| 工具类型 | 权限 | UI 表现 |
|---|---|---|
| 只读（get_*, preview） | silent | 静默执行 |
| 创建类（create_track, write_note） | notify（信任模式 silent） | 执行后 Toast 通知 |
| 修改类（update_note, delete_note） | confirm | 弹窗确认 |
| 破坏类（clear_all, delete_track） | strong | 强弹窗（多步确认） |
| 批量操作 | confirm | 显示 diff 后确认 |

### 7.2 信任模式

```
┌──────────────────────────────────┐
│ ⚙ Agent 权限设置                │
│                                  │
│ 信任级别：                        │
│ ○ 严格（每次操作都问）            │
│ ● 平衡（只读静默，写入询问）      │
│ ○ 自由（非破坏性操作全部静默）    │
│                                  │
│ [保存]                           │
└──────────────────────────────────┘
```

### 7.3 权限弹窗示例

```
┌──────────────────────────────────┐
│ 🤖 Agent 请求执行：write_note    │
│                                  │
│ 参数：                           │
│ 轨道：Piano                       │
│ 音高：C4                         │
│ 起始：第 2 小节                   │
│ 长度：1 拍                        │
│ 力度：80                         │
│                                  │
│ 影响：                            │
│ 将添加 1 个音符到 Piano 轨道       │
│                                  │
│ [✓ 允许] [✗ 拒绝] [⚙ 修改后允许]  │
└──────────────────────────────────┘
```

---

## 8. 用户偏好学习

### 8.1 观察的用户操作

```typescript
class UserPrefsObserver {
  private prefs = new UserPrefs();
  
  // 用户添加音符
  onNoteAdded(note: Note) {
    // 分析调性使用
    if (isPitchInScale(note.pitch, { root: 0, mode: 'major' })) {
      this.prefs.increaseKey('C', 'major');
    }
    
    // 分析力度使用
    this.prefs.velocitySamples.push(note.velocity);
  }
  
  // 用户选择乐器
  onInstrumentSelected(instrument: Instrument) {
    this.prefs.favoriteInstruments.push(instrument.presetName);
  }
  
  // 用户修改速度
  onTempoChanged(tempo: number) {
    this.prefs.tempoSamples.push(tempo);
  }
  
  // 用户接受的 Agent 建议
  onSuggestionAccepted(suggestion: Suggestion) {
    this.prefs.acceptedSuggestions.push(suggestion);
  }
  
  // 用户拒绝的 Agent 建议
  onSuggestionRejected(suggestion: Suggestion) {
    this.prefs.rejectedSuggestions.push(suggestion);
  }
}
```

### 8.2 学到的偏好如何影响 Agent

```typescript
class AgentContext {
  private prefs: UserPrefs;
  
  // 生成 system prompt 时注入偏好
  getSystemPrompt(): string {
    return `
    ## 用户偏好（观察学习）
    - 常用调：${this.prefs.getPreferredKeys()}
    - 常用速度：${this.prefs.getPreferredTempos()} BPM
    - 偏好乐器：${this.prefs.getFavoriteInstruments()}
    - 常拒建议：${this.prefs.getRejectedPatternTypes()}
    `;
  }
}
```

### 8.3 用户可控制的偏好

```
┌──────────────────────────────────┐
│ ⚙ 用户偏好设置                    │
│                                  │
│ 🎵 常用调性                       │
│ [C Major ▾]                      │
│                                  │
│ 🎵 常用速度                       │
│ [120 BPM]                        │
│                                  │
│ 🎵 偏好乐器                       │
│ [Piano] [Guitar] [Strings]       │
│                                  │
│ 🎵 生成密度                       │
│ ○ 稀疏 ● 中等 ○ 密集              │
│                                  │
│ 🎵 响应风格                       │
│ ○ 简洁 ● 详细                     │
│                                  │
│ [保存]                           │
└──────────────────────────────────┘
```

---

## 9. UI 布局设计

### 9.1 完整布局

```
┌────────────────────────────────────────────────────────────────┐
│  Menu Bar: 文件 编辑 轨道 视图 帮助    [🎵 项目名]  ⚙ [🤖 Agent] │
├──────────┬─────────────────────────────────────────┬───────────┤
│ Track    │  Timeline                               │           │
│ List     │  ┌────────────────────────────────────┐ │           │
│          │  │ ▮▮▮▮▮▮▮▮▮▮ ▮▮▮▮▮▮▮▮▮▮ ▮▮▮▮▮▮▮▮▮▮ │ │  AI Chat │
│ 🎵 Vocal │  │ [♪♪♪]  旋律 (用户)                  │ │          │
│ 🎹 Piano │  ├────────────────────────────────────┤ │  🧑: 加个 │
│ 🎸 Guitar│  │ ▮▮▮▮▮▮▮▮▮▮ ▮▮▮▮▮▮▮▮▮▮            │ │  🤖: 已在│
│ 🥁 Drums │  │ [🎵🎵]    和弦 (Agent生成)          │ │     钢琴 │
│          │  ├────────────────────────────────────┤ │     添加  │
│          │  │  音量 -6 dB  [🎚 效果器]             │ │     了 C │
│ [+添加]  │  ├────────────────────────────────────┤ │     大调  │
│          │  │  播放头 ▮                            │ │     进行  │
│          │  │  0     1     2     3     4          │ │     要预览│
│          │  │  [◀] [⏸] [▶] [⏹]  Loop  ▢ 120 BPM  │ │     吗?  │
├──────────┴──┴─────────────────────────────────────────┴───────────┤
│ Piano Roll (底部主编辑区)                                        │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │  ♯ C ────●───●─────────────●────────────────────────────── │  │
│ │    C ────────────●───●───●───────────────────────────────── │  │
│ │  ♯ D ───────────────────────────────────────────────────── │  │
│ │    D ────────────────────────────────────────────────────── │  │
│ │  ♯ E ────●──────────────────────────────────────────────── │  │
│ │    F ────────────●───●──────────────────────────────────── │  │
│ │    G ────────────────────●───●───●──────────────────────── │  │
│ │  ♯ A ────────────────────────────●───────────────────────── │  │
│ │    A ────────────────────────────●───────────────────────── │  │
│ │  ♯ B ────────────────────────────────────────────────────── │  │
│ └────────────────────────────────────────────────────────────┘  │
│  [网格: 1/16] [音阶: C Major] [量化: ✓] [缩放: 100%]             │
└────────────────────────────────────────────────────────────────┘
```

### 9.2 布局组件

- **Resizable Panels**：拖拽分栏
- **Docking**：面板可嵌入/浮动
- **持久化**：布局保存到工程文件

---

## 10. 快捷键设计

### 10.1 全局快捷键

| 快捷键 | 功能 |
|---|---|
| `Space` | 播放/暂停 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+S` | 保存工程 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+N` | 新建工程 |
| `Ctrl+O` | 打开工程 |
| `Ctrl+P` | 打印谱面 |
| `Ctrl+F` | 搜索音符 |
| `Ctrl+Shift+A` | 全选音符 |

### 10.2 Piano Roll 快捷键

| 快捷键 | 功能 |
|---|---|
| `Delete` | 删除选中音符 |
| `Ctrl+C` | 复制选中音符 |
| `Ctrl+X` | 剪切选中音符 |
| `Ctrl+V` | 粘贴音符 |
| `Ctrl+D` | 复制选中音符到下一位置 |
| `Alt+拖动` | 复制（不移动） |
| `Shift+拖动` | 对齐到网格 |
| `Ctrl+拖动` | 精确移动（逐 tick） |
| `滚轮` | 缩放 |
| `Space+拖动` | 平移视图 |
| `Ctrl+A` | 全选音符 |
| `Ctrl+Shift+拖动` | 多选范围 |

### 10.3 Agent 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+/` | 显示/隐藏 Chat 面板 |
| `Ctrl+Shift+Z` | 撤销 Agent 的所有改动 |
| `Ctrl+Shift+1` | 切换到 Composer 模式 |
| `Ctrl+Shift+2` | 切换到 Arranger 模式 |
| `Ctrl+Shift+3` | 切换到 Collaborator 模式 |
| `Ctrl+Shift+4` | 切换到 Critic 模式 |
| `Ctrl+Shift+5` | 切换到 Teacher 模式 |
| `Ctrl+Shift+6` | 切换到 Fixer 模式 |
| `Ctrl+I` | 插入附加上下文到 Chat |
| `Esc` | 取消 Agent 当前操作 |

---

## 11. 编辑器操作 → Agent 感知

### 11.1 事件订阅

```typescript
// src/hooks/use-editor-agent-bridge.ts
export function useEditorAgentBridge() {
  const agentRuntime = useAgentRuntime();
  const projectStore = useProjectStore();
  
  useEffect(() => {
    // 订阅所有编辑命令
    const unsubscribe = projectStore.subscribe((cmd) => {
      if (cmd.source === 'human') {
        agentRuntime.onEditorAction(cmd);
      }
    });
    
    // 订阅选中变化
    const unsubscribeSelection = selectionStore.subscribe((selectedNotes) => {
      agentRuntime.onSelectionChange(selectedNotes);
    });
    
    // 订阅工具栏操作
    const unsubscribeTool = toolStore.subscribe((tool) => {
      agentRuntime.onToolSelectionChange(tool);
    });
    
    return () => {
      unsubscribe();
      unsubscribeSelection();
      unsubscribeTool();
    };
  }, []);
}
```

### 11.2 Agent 感知上下文

```typescript
class AgentContextManager {
  private userActionBuffer: UserAction[] = [];
  private actionWindow = 5000;  // 5 秒窗口
  
  onEditorAction(cmd: Command) {
    this.userActionBuffer.push({
      type: cmd.type,
      timestamp: cmd.timestamp,
      target: cmd.args,
    });
    
    // 清理旧操作
    const now = Date.now();
    this.userActionBuffer = this.userActionBuffer.filter(
      a => now - a.timestamp < this.actionWindow
    );
    
    // 分析操作模式
    if (this.userActionBuffer.length >= 5) {
      const pattern = this.analyzePattern(this.userActionBuffer);
      this.onPatternDetected(pattern);
    }
  }
  
  private analyzePattern(actions: UserAction[]): Pattern | null {
    // 检测"卡壳"信号：反复修改同一个音符
    const targets = actions.map(a => a.target?.noteId);
    if (new Set(targets).size < targets.length / 2) {
      return { type: 'struggling', target: targets[0] };
    }
    
    // 检测"流畅创作"信号：连续添加音符
    if (actions.every(a => a.type === 'note.add')) {
      return { type: 'flowing' };
    }
    
    return null;
  }
  
  private onPatternDetected(pattern: Pattern) {
    switch (pattern.type) {
      case 'struggling':
        this.proactiveSuggest('我注意到你在这一段反复修改，要不要试试这些和弦？');
        break;
      case 'flowing':
        this.enterQuietMode();
        break;
    }
  }
}
```

---

## 12. 上下文附加（Selection Awareness）

### 12.1 选中内容附加到对话

```typescript
// src/components/ai-chat/ContextAttachment.tsx
function ContextAttachment() {
  const selection = useSelectionStore();
  
  if (selection.notes.length === 0) return null;
  
  return (
    <div className="context-attachment">
      <span>📎 附加内容：</span>
      <button onClick={() => chatStore.attachContext(selection.notes)}>
        [♪♪♪] 选中的 {selection.notes.length} 个音符
      </button>
    </div>
  );
}
```

### 12.2 推荐操作

```typescript
function generatePromptSuggestion(notes: Note[]): string[] {
  if (notes.length === 0) return [];
  
  const isMelody = notes.length < 10;
  const isHarmony = notes.length >= 3 && notes.length <= 8;
  const isSection = notes.length > 10;
  
  if (isMelody) return ['生成变奏', '改到另一个调', '分析旋律'];
  if (isHarmony) return ['这个和弦是什么', '配个节奏', '扩展成和声'];
  if (isSection) return ['分析选中', '生成配器'];
  
  return ['分析选中', '生成配器'];
}
```

### 12.3 Chat 面板显示

```
┌─────────────────────────────────────────┐
│ 📎 附加内容                              │
│ [♪♪♪] 选中的 4 个音符 (C4 E4 G4 B4)     │
│ [✕ 移除]                                │
├─────────────────────────────────────────┤
│ 🤖 你选中了 4 个音符                   │
│    (C4, E4, G4, B4 @ 1.0-2.0)          │
│                                         │
│ 推荐操作：                              │
│ [🎯 这是什么和弦?]                      │
│ [🎼 生成变奏]                           │
│ [🎸 配个钢琴伴奏]                       │
│ [🎤 加点旋律]                           │
└─────────────────────────────────────────┘
```

---

## 13. 撤销 Agent 操作

### 13.1 智能撤销

**Ctrl+Z 不只是撤销一步**，而是撤销"一个意图"：

- Agent 说"我加一段主歌" → 一次性 undo 掉所有相关音符
- 用户拖动 3 个音符 → 一次性撤销
- 一次 undo 操作对应一个 Command（batch 内部包含多个原子操作）

### 13.2 "撤销 Agent 所有改动"按钮

```typescript
// src/components/ai-chat/AgentControls.tsx
function AgentControls() {
  const projectStore = useProjectStore();
  const agentRuntime = useAgentRuntime();
  
  return (
    <div className="agent-controls">
      <button onClick={() => projectStore.undoAllAgentChanges(agentRuntime.startTime)}>
        ↩️ 撤销 Agent 所有改动
      </button>
    </div>
  );
}
```

### 13.3 撤销历史展示

```
┌──────────────────────────────────┐
│ 撤销历史                          │
│                                  │
│ ← 撤销: Agent 添加和弦 C (青色)   │
│ ← 撤销: Agent 创建钢琴轨道 (青色) │
│ ← 撤销: 用户拖动音符 C4 (白色)   │
│                                  │
│ [→ 重做]                          │
└──────────────────────────────────┘
```

---

## 14. 教学模式（Teacher Mode）

### 14.1 Teacher 模式特点

- Agent 只读，不修改工程
- 用户学音乐时 Agent 当老师
- Agent 可以用编辑器演示概念（在临时轨道上）

### 14.2 教学示例

```
👤: 什么是和弦？
🤖: 和弦是三个或更多音同时响起的组合。
    最基础的和弦是三和弦，比如 C-E-G 就是 C 大调和弦。
    
    [🎵 播放 C 大三和弦]  ← Agent 用预览工具播放！
    [📖 展开理论解释]
    
👤: 好，那什么是属和弦？
🤖: 属和弦是大调音阶的第 7 级音开始构建的和弦...
    在你当前的工程里，G 大调和弦就是属和弦。
    
    要试试在当前工程里加一个 G 和弦吗？
    [🎯 添加 G 和弦到第 4 小节]
```

### 14.3 教学资源

```
📚 教学资源目录：
- 音阶与调式
- 和弦与和声
- 节奏与节拍
- 曲式结构
- 配器基础
- 音乐理论进阶
```

---

## 15. 关键交互细节

### 15.1 Agent 操作前预览

Agent 说"我要给你加一段钢琴伴奏"时，UI 显示：

```
┌──────────────────────────────────┐
│ 🤖 Agent 计划进行以下操作：        │
│                                  │
│ + 新建轨道 "Piano"               │
│ + 在第 1-4 小节写入和弦：          │
│   ♬ C - F - G - C               │
│                                  │
│ [✓ 接受] [✗ 忽略] [✎ 修改后接受]  │
└──────────────────────────────────┘
```

用户点击"修改后接受"进入编辑模式，可以直接拖音符调整，然后再确认。

### 15.2 Agent 正在操作时的 UI

```
┌──────────────────────────────────────────┐
│ 🤖 Agent is editing...                   │
│                                          │
│ ✓ Created track "Piano"                   │
│ ✓ Wrote 4 notes to "Piano" (C, E, G, B)  │
│ ⏳ Writing chord progression...           │
│                                          │
│ [取消] [允许继续] [查看改动]                │
└──────────────────────────────────────────┘
```

同时 Piano Roll 里，**正在被 Agent 生成的音符用虚线显示**，生成完成后变成实线。

### 15.3 Agent 操作完成后

```
┌──────────────────────────────────────────┐
│ ✓ Agent 完成操作                          │
│                                          │
│ 已生成 16 个音符到 Piano 轨道              │
│                                          │
│ [⏸ 预览] [↩️ 撤销] [🎵 继续创作]          │
│                                          │
│ 🤖 你觉得怎么样？我可以：                 │
│ • 调整力度让它更有起伏                    │
│ • 加个旋律线                              │
│ • 换成更忧伤的调                          │
└──────────────────────────────────────────┘
```

---

## 16. 未来扩展

### 16.1 多人协作

未来支持多人一起创作：
- 用户 A 手动编辑
- 用户 B 用 Agent 编辑
- 实时同步

### 16.2 Agent 群组

多个 Agent 协同：
- **Composer Agent** 生成主旋律
- **Arranger Agent** 编排伴奏
- **Critic Agent** 审听点评

### 16.3 云同步

用户偏好、工程文件跨设备同步：
- 桌面端 → 移动端
- 桌面端 → Web 端
- 团队共享

### 16.4 教学社区

用户教学 Agent 的知识：
- 用户提交"教学片段"（示范 + 说明）
- Agent 学习这些片段
- 其他用户可以引用

---

## 17. 相关文档

- [架构设计](./architecture.md)
- [数据模型（Command Pattern 细节）](./data-model.md)
- [Agent 设计](./agent-design.md)
- [MCP 工具](./mcp-tools.md)
- [里程碑](./milestones.md)
