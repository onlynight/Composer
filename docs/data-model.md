# 核心数据模型

> 本文档定义 Composer 共鸣的核心数据模型，包括工程文件、轨道、音符、Command Pattern 和状态管理。

---

## 1. 设计原则

1. **整数优先**：使用整数 tick 而非浮点秒，避免浮点误差
2. **不可变数据**：所有更新通过 Command 生成新对象，方便 undo/redo
3. **明确类型**：核心类型有完整 TypeScript 定义，不依赖 any
4. **可扩展**：预留 `meta` 字段支持未来扩展
5. **JSON 友好**：工程文件可以序列化为 JSON（便于存储、传输、版本化）
6. **来源可追溯**：每个 Command 记录 `source`（human / agent / system）

---

## 2. 核心数据类型

### 2.1 基础类型

```typescript
// 位置单位：MIDI 标准 tick
// 默认 480 ticks/beat（即一个四分音符 = 480 ticks）
export const TICKS_PER_BEAT = 480;

// MIDI 音高：0-127，C4 = 60
export type Pitch = number;

// MIDI 力度：0-127
export type Velocity = number;

// 时间位置（以 tick 为单位）
export type Tick = number;

// 唯一 ID（UUID v4）
export type ID = string;

// 时间戳（Unix 毫秒）
export type Timestamp = number;
```

### 2.2 音阶与调式

```typescript
export enum PitchClass {
  C = 0, CSharp = 1, D = 2, DSharp = 3, E = 4,
  F = 5, FSharp = 6, G = 7, GSharp = 8, A = 9,
  ASharp = 10, B = 11
}

export enum Mode {
  Major = 'major',
  Minor = 'minor',
  Dorian = 'dorian',
  Phrygian = 'phrygian',
  Lydian = 'lydian',
  Mixolydian = 'mixolydian',
  Locrian = 'locrian',
}

export interface Key {
  root: PitchClass;
  mode: Mode;
}
```

### 2.3 节拍与速度

```typescript
export interface TimeSignature {
  numerator: number;     // 4 in 4/4
  denominator: number;   // 4 in 4/4
}

export interface TempoMapEntry {
  tick: Tick;
  bpm: number;
}
```

---

## 3. 音符（Note）

### 3.1 定义

```typescript
export interface Note {
  id: ID;
  pitch: Pitch;          // MIDI 音高 0-127
  velocity: Velocity;    // 力度 0-127
  start: Tick;           // 起始位置（tick）
  duration: Tick;        // 持续时长（tick）
  channel: number;       // MIDI 通道 0-15
  lyrics?: string;       // 歌词（人声轨道用）
  color?: string;        // 音符颜色（可选，用于 Agent 生成标记）
  source: 'human' | 'agent' | 'system';  // 创建来源
  createdAt: Timestamp;
  modifiedAt: Timestamp;
}
```

### 3.2 音符操作

```typescript
// 判断两个音符是否冲突（同一 track 上重叠）
export function notesConflict(a: Note, b: Note): boolean {
  return a.channel === b.channel &&
         a.start < b.start + b.duration &&
         b.start < a.start + a.duration;
}

// 判断音符是否对齐到网格
export function isAlignedToGrid(note: Note, gridTicks: number): boolean {
  return note.start % gridTicks === 0 && note.duration % gridTicks === 0;
}

// 对齐到最近网格
export function snapToGrid(note: Note, gridTicks: number): Note {
  return {
    ...note,
    start: Math.round(note.start / gridTicks) * gridTicks,
    duration: Math.round(note.duration / gridTicks) * gridTicks,
  };
}

// 音符转换工具
export function noteToMidiMessage(note: Note): {
  on: { channel, pitch, velocity };
  off: { channel, pitch };
} {
  return {
    on: { channel: note.channel, pitch: note.pitch, velocity: note.velocity },
    off: { channel: note.channel, pitch: note.pitch },
  };
}
```

---

## 4. 乐器与轨道

### 4.1 乐器

```typescript
export enum InstrumentType {
  SoundFont = 'soundfont',
  Synth = 'synth',          // 未来：JUCE 合成器
  VST = 'vst',              // 未来：VST 插件
}

export interface Instrument {
  type: InstrumentType;
  soundfontId?: string;     // 指向 soundfonts/ 目录
  bank: number;             // GM bank 0-127
  program: number;          // GM program 0-127
  presetName?: string;      // 预设名称
  parameters?: Record<string, number>;  // 合成器参数
}

// 常用 GM 乐器预设
export const PRESET_INSTRUMENTS: Record<string, Instrument> = {
  'Piano_01': {
    type: InstrumentType.SoundFont,
    soundfontId: 'FluidR3_GM',
    bank: 0, program: 0,
    presetName: 'Acoustic Grand Piano',
  },
  'Guitar_Acoustic': {
    type: InstrumentType.SoundFont,
    soundfontId: 'FluidR3_GM',
    bank: 0, program: 24,
    presetName: 'Acoustic Guitar',
  },
  'Bass_Electric': {
    type: InstrumentType.SoundFont,
    soundfontId: 'FluidR3_GM',
    bank: 0, program: 34,
    presetName: 'Fingered Bass',
  },
  'Strings': {
    type: InstrumentType.SoundFont,
    soundfontId: 'FluidR3_GM',
    bank: 0, program: 48,
    presetName: 'String Ensemble',
  },
  'Drums_Kit_01': {
    type: InstrumentType.SoundFont,
    soundfontId: 'FluidR3_GM',
    bank: 0, program: 128,
    presetName: 'Drums',
  },
};
```

### 4.2 轨道

```typescript
export interface Track {
  id: ID;
  name: string;
  instrument: Instrument;
  notes: Note[];
  mute: boolean;
  solo: boolean;
  volume: number;           // 0-127（MIDI vol）
  pan: number;              // -64 (L) to 64 (R)
  effects: Effect[];
  automation: Automation[];
  source: 'human' | 'agent' | 'system';
  createdAt: Timestamp;
}
```

---

## 5. 效果器

### 5.1 定义

```typescript
export enum EffectType {
  EQ = 'eq',
  Compressor = 'compressor',
  Reverb = 'reverb',
  Delay = 'delay',
  Chorus = 'chorus',
  Distortion = 'distortion',
}

export interface Effect {
  id: ID;
  type: EffectType;
  parameters: Record<string, number>;  // 类型特定参数
  bypass: boolean;
  wet: number;               // 湿/干比 0-1
}

// 各效果器参数 schema
export interface EQParams {
  low: { freq: number; gain: number };
  mid: { freq: number; gain: number; q: number };
  high: { freq: number; gain: number };
}

export interface CompressorParams {
  threshold: number;         // dB
  ratio: number;
  attack: number;            // ms
  release: number;           // ms
  makeup: number;           // dB
}

export interface ReverbParams {
  decay: number;             // 秒
  preDelay: number;          // ms
  roomSize: number;          // 0-1
}

export interface DelayParams {
  time: number;              // ms
  feedback: number;          // 0-1
  modulation: number;        // 0-1
}
```

---

## 6. 工程（Project）

### 6.1 定义

```typescript
export interface Project {
  // 元数据
  version: string;            // schema version，用于向后兼容
  id: ID;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 基本参数
  root: {
    tempo: number;            // BPM
    timeSignature: TimeSignature;
    key: Key;
    tempoMap: TempoMapEntry[];  // 变速点（未来）
    ticksPerBeat: number;     // 默认 480
  };
  
  // 轨道
  tracks: Track[];
  
  // 主输出效果链
  masterChain: Effect[];
  
  // AI 会话历史
  aiSessions: AISession[];
  
  // 描述信息
  meta: {
    author: string;
    description: string;
    tags: string[];
    genre?: string;
    mood?: string[];
  };
  
  // 播放状态（不持久化，仅内存）
  _runtime?: {
    playhead: Tick;
    isPlaying: boolean;
    loopStart: Tick;
    loopEnd: Tick;
  };
}

export interface AISession {
  id: ID;
  timestamp: Timestamp;
  mode: 'composer' | 'arranger' | 'collaborator' | 'critic' | 'teacher' | 'fixer';
  model: string;
  messages: AIMessage[];
  generatedNotes: ID[];       // Agent 生成的 note.id 引用
  generatedTracks: ID[];      // Agent 生成的 track.id 引用
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Timestamp;
}

export interface ToolCall {
  id: ID;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'denied';
}
```

### 6.2 工程操作

```typescript
// 创建新工程
export function createProject(options: {
  name: string;
  key?: Key;
  tempo?: number;
  timeSignature?: TimeSignature;
}): Project {
  return {
    version: SCHEMA_VERSION,
    id: uuid(),
    name: options.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    root: {
      tempo: options.tempo ?? 120,
      timeSignature: options.timeSignature ?? { numerator: 4, denominator: 4 },
      key: options.key ?? { root: PitchClass.C, mode: Mode.Major },
      tempoMap: [],
      ticksPerBeat: TICKS_PER_BEAT,
    },
    tracks: [],
    masterChain: [],
    aiSessions: [],
    meta: { author: '', description: '', tags: [] },
  };
}

// 添加音符（原子操作）
export function addNote(project: Project, trackId: ID, note: Omit<Note, 'id' | 'createdAt' | 'modifiedAt' | 'source'>): Project {
  const newNote: Note = {
    ...note,
    id: uuid(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    source: 'human',  // 这里应该通过 Command 传递 source
  };
  
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map(t =>
      t.id === trackId ? { ...t, notes: [...t.notes, newNote] } : t
    ),
  };
}
```

---

## 7. Command Pattern

### 7.1 为什么用 Command Pattern

**核心问题**：人、Agent、系统都可能修改工程状态，如何保证一致性、可撤销、可追踪？

**Command Pattern 收益**：
1. **Undo/redo 天然支持**：Command 栈操作
2. **批量操作可打包**：Agent 一次生成 32 个音符 → 一个 Command → 一步撤销
3. **状态变更可追踪**：每个 Command 有 source、timestamp、description
4. **冲突检测**：基于 Command 的 `affectedNotes` 集合
5. **重放能力**：Command 序列可序列化，未来支持"创作日志"和"回放"

### 7.2 定义

```typescript
export type CommandType =
  // Note 操作
  | 'note.add' | 'note.remove' | 'note.update'
  | 'note.chord.add' | 'note.progression.add'
  | 'note.batch'                        // 批量音符操作
  
  // Track 操作
  | 'track.add' | 'track.remove' | 'track.update'
  
  // Project 操作
  | 'project.updateRoot'
  
  // Effect 操作
  | 'effect.add' | 'effect.update' | 'effect.remove'
  
  // 混音操作
  | 'mixer.update';

export interface Command<TArgs = any> {
  id: ID;
  type: CommandType;
  timestamp: Timestamp;
  source: 'human' | 'agent' | 'system';
  agentSessionId?: ID;      // 关联到 AI 会话（用于"撤销 Agent 的所有改动"）
  batchId?: ID;             // 批量操作的批次 ID
  description: string;      // 用于 UI 展示（"添加音符 C4"、"创建钢琴轨道"）
  args: TArgs;
  
  // 影响范围（用于冲突检测）
  affectedTracks?: ID[];
  affectedNotes?: ID[];
  
  // 执行
  execute(project: Project): Project;
  undo(project: Project): Project;
}

// Command 工厂函数
export function makeCommand<TArgs>(options: {
  type: CommandType;
  source: 'human' | 'agent' | 'system';
  description: string;
  args: TArgs;
  agentSessionId?: ID;
  batchId?: ID;
  affectedTracks?: ID[];
  affectedNotes?: ID[];
  execute: (project: Project) => Project;
  undo: (project: Project) => Project;
}): Command<TArgs> {
  return {
    ...options,
    id: uuid(),
    timestamp: Date.now(),
  };
}
```

### 7.3 Command 示例

#### 添加音符

```typescript
export function makeAddNoteCommand(note: Note): Command {
  return makeCommand({
    type: 'note.add',
    source: note.source,
    description: `添加音符 ${pitchToName(note.pitch)} (力度 ${note.velocity})`,
    args: { note },
    affectedTracks: [note.trackId],
    affectedNotes: [note.id],
    execute: (project) => addNote(project, note.trackId, note),
    undo: (project) => removeNote(project, note.id),
  });
}
```

#### 写入和弦

```typescript
export function makeAddChordCommand(
  trackId: ID,
  pitches: Pitch[],
  velocity: Velocity,
  start: Tick,
  duration: Tick
): Command {
  const notes: Note[] = pitches.map(pitch => ({
    id: uuid(),
    pitch,
    velocity,
    start,
    duration,
    channel: 0,
    source: 'agent',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  }));
  
  return makeCommand({
    type: 'note.chord.add',
    source: 'agent',
    description: `写入和弦 ${pitches.map(pitchToName).join(' ')}`,
    args: { trackId, pitches, velocity, start, duration, notes },
    affectedTracks: [trackId],
    affectedNotes: notes.map(n => n.id),
    execute: (project) => {
      return project.tracks.reduce((p, t) => {
        if (t.id === trackId) {
          return { ...p, tracks: p.tracks.map(tr => 
            tr.id === trackId ? { ...tr, notes: [...tr.notes, ...notes] } : tr
          )};
        }
        return p;
      }, project);
    },
    undo: (project) => {
      const noteIds = new Set(notes.map(n => n.id));
      return {
        ...project,
        tracks: project.tracks.map(t => ({
          ...t,
          notes: t.notes.filter(n => !noteIds.has(n.id)),
        })),
      };
    },
  });
}
```

#### Agent 批量操作（关键！）

```typescript
export function makeAgentBatchCommand(
  agentSessionId: ID,
  subCommands: Command[],
  description: string
): Command {
  return makeCommand({
    type: 'note.batch',
    source: 'agent',
    agentSessionId,
    description,
    args: { subCommands },
    affectedTracks: [...new Set(subCommands.flatMap(c => c.affectedTracks ?? []))],
    affectedNotes: [...new Set(subCommands.flatMap(c => c.affectedNotes ?? []))],
    execute: (project) => subCommands.reduce((p, c) => c.execute(p), project),
    undo: (project) => subCommands.slice().reverse().reduce((p, c) => c.undo(p), project),
  });
}
```

**Agent 批量操作的价值**：
- Agent 生成整段音乐 → 一个 batch Command
- 用户 Ctrl+Z → 一步撤销 Agent 的所有操作
- 用户可以接受 Agent 的某一部分（把 subCommands 挑出来重新 dispatch）

---

## 8. 状态管理

### 8.1 Project Store

```typescript
// packages/caa-store/src/project-store.ts
interface ProjectState {
  project: Project | null;
  undoStack: Command[];
  redoStack: Command[];
  isSaving: boolean;
  lastError: string | null;
}

export const useProjectStore = create<ProjectState & Actions>((set, get) => ({
  project: null,
  undoStack: [],
  redoStack: [],
  isSaving: false,
  lastError: null,
  
  // 执行命令
  async dispatch(cmd: Command) {
    const state = get();
    if (!state.project) throw new Error('No project loaded');
    
    // 检查冲突
    if (cmd.source === 'agent' && state.userLock?.intersects(cmd.affectedNotes ?? [])) {
      throw new ConflictError(`Note being edited by user`);
    }
    
    // 执行
    const newProject = cmd.execute(state.project);
    
    // 更新栈
    set({
      project: newProject,
      undoStack: [...state.undoStack, cmd],
      redoStack: [],
    });
    
    // 广播
    broadcast.sync({ type: 'command.executed', cmd, project: newProject });
    
    // 触发自动保存
    debounceAutosave();
  },
  
  // 撤销
  undo() {
    const state = get();
    if (state.undoStack.length === 0) return;
    
    const cmd = state.undoStack[state.undoStack.length - 1];
    const newProject = cmd.undo(state.project!);
    
    set({
      project: newProject,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, cmd],
    });
    
    broadcast.sync({ type: 'command.undone', cmd, project: newProject });
  },
  
  // 重做
  redo() {
    const state = get();
    if (state.redoStack.length === 0) return;
    
    const cmd = state.redoStack[state.redoStack.length - 1];
    const newProject = cmd.execute(state.project!);
    
    set({
      project: newProject,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, cmd],
    });
    
    broadcast.sync({ type: 'command.redone', cmd, project: newProject });
  },
  
  // 特殊：撤销 Agent 的所有改动（从某个时间点后）
  undoAllAgentChanges(sinceTimestamp: number) {
    const state = get();
    const agentCommands = state.undoStack.filter(
      c => c.source === 'agent' && c.timestamp >= sinceTimestamp
    );
    
    // 反向执行
    agentCommands.slice().reverse().forEach(cmd => {
      set({
        project: cmd.undo(get().project!),
        undoStack: get().undoStack.filter(c => c.id !== cmd.id),
      });
    });
  },
}));
```

### 8.2 Broadcast Sync（跨进程同步）

```typescript
// shared/broadcast-sync.ts
export type SyncEvent =
  | { type: 'command.executed'; cmd: Command; project: Project }
  | { type: 'command.undone'; cmd: Command; project: Project }
  | { type: 'project.loaded'; project: Project }
  | { type: 'project.saved' }
  | { type: 'project.error'; error: string }
  | { type: 'agent.status'; status: 'idle' | 'thinking' | 'tool_call' }
  | { type: 'agent.suggestion'; suggestion: Suggestion };

export class BroadcastSync {
  private channel = new BroadcastChannel('resonance-project');
  private listeners = new Set<(event: SyncEvent) => void>();
  
  emit(event: SyncEvent) {
    this.channel.postMessage(event);
  }
  
  on(handler: (event: SyncEvent) => void) {
    this.listeners.add(handler);
    this.channel.addEventListener('message', (e) => handler(e.data));
    return () => this.listeners.delete(handler);
  }
}

export const broadcast = new BroadcastSync();
```

---

## 9. 文件持久化

### 9.1 文件格式

**扩展名**：`.resproj`（Resonance Project）

**格式**：JSON 压缩 + 元数据头

```json
{
  "format": "resproj",
  "formatVersion": "1.0",
  "project": {
    // 完整的 Project 对象
    "version": "1.0.0",
    "id": "...",
    "name": "...",
    ...
  }
}
```

### 9.2 版本迁移

```typescript
// packages/caa-core/src/version.ts
export const CURRENT_SCHEMA_VERSION = '1.0.0';

export interface MigrationStep {
  from: string;
  to: string;
  migrate: (project: Project) => Project;
}

export const MIGRATIONS: MigrationStep[] = [
  // 未来：v0.9 → v1.0
  // 添加新字段、删除旧字段等
];

export async function migrateProject(raw: any): Promise<Project> {
  const project = { ...raw };
  let current = project.version ?? '0.9';
  
  for (const step of MIGRATIONS) {
    if (compareVersion(current, step.from) <= 0 && compareVersion(step.to, current) > 0) {
      Object.assign(project, step.migrate(project));
      current = step.to;
    }
  }
  
  return project;
}
```

### 9.3 自动保存

```typescript
// electron/storage/autosave.ts
const AUTOSAVE_INTERVAL = 30 * 1000;  // 30 秒
const AUTOSAVE_DEBOUNCE = 5000;       // 命令后 5 秒

export class AutosaveManager {
  private timer: NodeJS.Timeout | null = null;
  private debounce: NodeJS.Timeout | null = null;
  
  onCommand(cmd: Command) {
    // 防抖：命令后 5 秒内如果还有命令，推迟保存
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.save(), AUTOSAVE_DEBOUNCE);
  }
  
  start() {
    this.timer = setInterval(() => this.save(), AUTOSAVE_INTERVAL);
  }
  
  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.debounce) clearTimeout(this.debounce);
  }
  
  private async save() {
    // 保存到临时文件，再原子重命名
    // 避免崩溃时损坏工程文件
  }
}
```

---

## 10. MIDI 数据格式

### 10.1 时序转换

```typescript
// tick ↔ beat ↔ second
export function beatToTick(beat: number, ticksPerBeat: number = TICKS_PER_BEAT): Tick {
  return Math.round(beat * ticksPerBeat);
}

export function tickToBeat(tick: Tick, ticksPerBeat: number = TICKS_PER_BEAT): number {
  return tick / ticksPerBeat;
}

export function tickToSecond(tick: Tick, bpm: number, ticksPerBeat: number = TICKS_PER_BEAT): number {
  return (tick / ticksPerBeat) * (60 / bpm);
}

export function secondToTick(second: number, bpm: number, ticksPerBeat: number = TICKS_PER_BEAT): Tick {
  return Math.round(second * (bpm / 60) * ticksPerBeat);
}
```

### 10.2 音高转换

```typescript
// MIDI pitch ↔ 音符名
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function pitchToName(pitch: Pitch): string {
  const octave = Math.floor(pitch / 12) - 1;
  return NOTE_NAMES[pitch % 12] + octave;
}

export function nameToPitch(name: string): Pitch {
  // 解析 "C4"、"G#3" 等
  const match = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`Invalid pitch name: ${name}`);
  // ...
}

// 音阶内判断
export function isPitchInScale(pitch: Pitch, key: Key): boolean {
  const intervals = SCALE_INTERVALS[key.mode];
  const rootDegree = key.root;
  const pitchDegree = pitch % 12;
  const relativeDegree = (pitchDegree - rootDegree + 12) % 12;
  return intervals.includes(relativeDegree);
}
```

### 10.3 和弦解析

```typescript
// 和弦符号解析
export function parseChord(symbol: string): {
  root: PitchClass;
  type: string;
  pitches: Pitch[];
} {
  // 支持：C、Cm、C#、Cmaj7、C7、Cm7、Csus4、C7#5 等
  const regex = /^([A-G])(#|b)?(maj|m|7|m7|maj7|7#5|7b5|sus2|sus4|dim|aug)?$/;
  // ...
}

// 和弦匹配（识别选中的音符是什么和弦）
export function matchChord(pitches: Pitch[]): ChordMatch | null {
  // 尝试匹配各种和弦类型
  // 返回最佳匹配
}
```

---

## 11. JSON Schema

### 11.1 工程文件 Schema

`packages/caa-midi-ir/src/schema.json`：

```json
{
  "$id": "https://github.com/composer/resonance/schemas/project.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Resonance Project",
  "type": "object",
  "required": ["format", "formatVersion", "project"],
  "properties": {
    "format": { "const": "resproj" },
    "formatVersion": { "type": "string" },
    "project": {
      "type": "object",
      "required": ["version", "id", "name", "root", "tracks"],
      "properties": {
        "version": { "type": "string" },
        "id": { "type": "string", "format": "uuid" },
        "name": { "type": "string" },
        "createdAt": { "type": "number" },
        "updatedAt": { "type": "number" },
        "root": {
          "type": "object",
          "required": ["tempo", "timeSignature", "key", "ticksPerBeat"],
          "properties": {
            "tempo": { "type": "number", "minimum": 20, "maximum": 300 },
            "timeSignature": {
              "type": "object",
              "required": ["numeritor", "denominator"],
              "properties": {
                "numeritor": { "type": "integer" },
                "denominator": { "type": "integer" }
              }
            },
            "key": {
              "type": "object",
              "required": ["root", "mode"],
              "properties": {
                "root": { "type": "integer", "minimum": 0, "maximum": 11 },
                "mode": { "type": "string", "enum": ["major", "minor", "dorian", ...] }
              }
            },
            "ticksPerBeat": { "type": "integer", "default": 480 }
          }
        },
        "tracks": { "type": "array", "items": { "$ref": "#/$defs/track" } }
      }
    }
  },
  "$defs": {
    "track": {
      "type": "object",
      "required": ["id", "name", "instrument", "notes"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "name": { "type": "string" },
        "instrument": { "$ref": "#/$defs/instrument" },
        "notes": { "type": "array", "items": { "$ref": "#/$defs/note" } }
      }
    },
    "note": {
      "type": "object",
      "required": ["id", "pitch", "velocity", "start", "duration", "channel"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "pitch": { "type": "integer", "minimum": 0, "maximum": 127 },
        "velocity": { "type": "integer", "minimum": 0, "maximum": 127 },
        "start": { "type": "integer", "minimum": 0 },
        "duration": { "type": "integer", "minimum": 1 },
        "channel": { "type": "integer", "minimum": 0, "maximum": 15 }
      }
    }
  }
}
```

### 11.2 Schema 校验

```typescript
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateProject = ajv.compile(SCHEMA_JSON);

export function validateProjectFile(raw: unknown): {
  valid: boolean;
  errors: string[];
  project?: Project;
} {
  const result = validateProject(raw);
  if (!result) {
    return {
      valid: false,
      errors: ajv.errors?.map(e => `${e.instancePath}: ${e.message}`) ?? ['Unknown error'],
    };
  }
  return {
    valid: true,
    errors: [],
    project: raw as Project,
  };
}
```

---

## 12. 冲突检测与并发

### 12.1 场景

**同一个音符被人类和 Agent 同时编辑**怎么办？

### 12.2 三种冲突情况

| 场景 | 处理 |
|---|---|
| Agent 生成新音符，人类同时删掉另一个 | 无冲突，两条命令都执行 |
| 人类拖动音符 X，Agent 同时改同一个音符 X | Agent 让位，抛出 ConflictError |
| Agent 正在生成时人类按了 Stop | 立即中断 Agent 生成，已生成的进入 undo 栈 |

### 12.3 实现

```typescript
class ConflictDetector {
  // 记录用户正在编辑的音符（拖拽中、输入中）
  private userLocked: Set<ID> = new Set();
  
  onUserStartEdit(noteIds: ID[]) {
    noteIds.forEach(id => this.userLocked.add(id));
  }
  
  onUserEndEdit(noteIds: ID[]) {
    noteIds.forEach(id => this.userLocked.delete(id));
  }
  
  checkAgentAccess(cmd: Command): 'ok' | 'conflict' {
    if (cmd.source !== 'agent') return 'ok';
    const affected = cmd.affectedNotes ?? [];
    const conflicts = affected.filter(id => this.userLocked.has(id));
    return conflicts.length > 0 ? 'conflict' : 'ok';
  }
}
```

---

## 13. 关键测试用例

### 13.1 Timeline 转换

```typescript
describe('timeline', () => {
  it('converts 1.5 beats at 480 tpb to 720 ticks', () => {
    expect(beatToTick(1.5)).toEqual(720);
  });
  
  it('converts 2 seconds at 120bpm to 1440 ticks', () => {
    expect(secondToTick(2, 120)).toEqual(1440);
  });
  
  it('roundtrip: beat → tick → beat', () => {
    const beats = [0, 0.25, 0.5, 0.75, 1, 1.5, 2];
    beats.forEach(b => {
      expect(tickToBeat(beatToTick(b))).toBeCloseTo(b, 3);
    });
  });
});
```

### 13.2 音阶与调式

```typescript
describe('scale', () => {
  it('returns C major scale pitches', () => {
    expect(scale('C', 'major')).toEqual([60, 62, 64, 65, 67, 69, 71]);
  });
  
  it('returns A minor scale', () => {
    expect(scale('A', 'minor')).toEqual([57, 59, 60, 62, 64, 65, 67]);
  });
  
  it('checks if pitch is in scale', () => {
    expect(isPitchInScale(60, { root: 0, mode: 'major' })).toBe(true);  // C
    expect(isPitchInScale(61, { root: 0, mode: 'major' })).toBe(false); // C#
    expect(isPitchInScale(64, { root: 0, mode: 'major' })).toBe(true);  // E
  });
});
```

### 13.3 和弦解析

```typescript
describe('chord', () => {
  it('parses simple C chord', () => {
    expect(parseChord('C')).toEqual({
      root: 'C', type: '', pitches: [60, 62, 64]
    });
  });
  
  it('parses G7#5', () => {
    expect(parseChord('G7#5')).toEqual({
      root: 'G', type: '7#5', pitches: [55, 59, 62, 64]
    });
  });
  
  it('parses Am7', () => {
    expect(parseChord('Am7')).toEqual({
      root: 'A', type: 'm7', pitches: [57, 60, 62, 65]
    });
  });
});
```

### 13.4 Command Pattern

```typescript
describe('command', () => {
  it('execute and undo are symmetric', () => {
    const project = createProject({ name: 'Test' });
    const note = { ... };
    const cmd = makeAddNoteCommand(note);
    
    const afterExecute = cmd.execute(project);
    expect(afterExecute.tracks[0].notes.length).toBe(project.tracks[0].notes.length + 1);
    
    const afterUndo = cmd.undo(afterExecute);
    expect(afterUndo.tracks[0].notes.length).toBe(project.tracks[0].notes.length);
  });
  
  it('batch command can be undone in one step', () => {
    const project = createProject({ name: 'Test' });
    const subCmds = [makeAddNoteCommand(n1), makeAddNoteCommand(n2), makeAddNoteCommand(n3)];
    const batch = makeAgentBatchCommand('session-1', subCmds, 'Agent 生成 3 个音符');
    
    const afterExecute = batch.execute(project);
    expect(afterExecute.tracks[0].notes.length).toBe(3);
    
    const afterUndo = batch.undo(afterExecute);
    expect(afterUndo.tracks[0].notes.length).toBe(0);  // 一步撤销全部
  });
});
```

### 13.5 工程读写

```typescript
describe('project storage', () => {
  it('saves and loads project with same data', async () => {
    const project = createProject({ name: 'Test' });
    const path = await saveProject(project);
    const loaded = await loadProject(path);
    expect(loaded).toEqual(project);
  });
  
  it('handles corrupt files gracefully', async () => {
    const path = await writeTempFile('{"invalid": json');
    const result = await tryLoadProject(path);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid JSON');
  });
  
  it('migrates old version projects', async () => {
    const oldProject = { version: '0.9', /* 旧 schema */ };
    const migrated = await migrateProject(oldProject);
    expect(migrated.version).toBe('1.0.0');
    // 新字段有默认值
    expect(migrated.root.ticksPerBeat).toBe(480);
  });
});
```

---

## 14. 参考

- [MIDI 1.0 Specification](https://www.midi.org/specifications/file-midi-1-0-standard)
- [General MIDI Level 1](https://www.midi.org/specifications/file-gmlevel1)
- [Command Pattern (GoF)](https://en.wikipedia.org/wiki/Command_pattern)
- [JSON Schema](https://json-schema.org/)
- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
