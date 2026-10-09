# MCP 工具定义

> 本文档定义 Composer 共鸣暴露给 Agent 的所有 MCP（Model Context Protocol）工具。
>
> MCP Server 运行在本地（`127.0.0.1:随机端口`），Agent 通过标准 MCP 协议调用。

---

## 1. 设计原则

1. **粒度适中**：工具不能太粗（"生成一段音乐"）也不能太细（"设置某音的时值"），以"创作意图"为粒度
2. **感知优先**：提供足够的只读工具让 Agent 感知当前状态
3. **可撤销**：所有写工具都对应一个 Command，支持撤销
4. **明确输入**：参数类型清晰，避免歧义
5. **返回信息丰富**：不仅返回成功/失败，还返回足够上下文让 Agent 继续决策

---

## 2. 工具清单总览

MVP 阶段（v0.1）提供 **15 个核心工具**，分为 5 类：

| 类别 | 工具数量 | 说明 |
|---|---|---|
| Project（工程） | 4 | 工程管理 |
| Track（轨道） | 3 | 轨道管理 |
| Note（音符） | 5 | 音符编辑（核心） |
| Audio（音频） | 2 | 音频操作 |
| State（状态） | 1 | 状态查询 |

---

## 3. Project 工具（工程管理）

### 3.1 `create_project`

**描述**：创建一个新的音乐工程

```typescript
{
  name: 'create_project',
  description: '创建一个新的音乐工程。可以在已有工程存在时切换。',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '工程名称' },
      key: {
        type: 'object',
        description: '调性',
        properties: {
          root: { type: 'string', enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], description: '根音' },
          mode: { type: 'string', enum: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'], description: '调式' }
        },
        required: ['root', 'mode']
      },
      tempo: { type: 'number', minimum: 20, maximum: 300, description: 'BPM，默认 120' },
      timeSignature: {
        type: 'object',
        description: '节拍',
        properties: {
          numerator: { type: 'integer', description: '分子，默认 4' },
          denominator: { type: 'integer', description: '分母，默认 4' }
        },
        required: ['numerator', 'denominator']
      }
    },
    required: ['name']
  },
  outputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      name: { type: 'string' },
      key: { type: 'object' },
      tempo: { type: 'number' }
    }
  }
}
```

### 3.2 `get_project_info`

**描述**：获取当前工程的基本信息

```typescript
{
  name: 'get_project_info',
  description: '获取当前工程的基本信息，包括调性、速度、节拍、轨道列表。',
  inputSchema: { type: 'object', properties: {} },
  outputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      key: { type: 'object' },
      tempo: { type: 'number' },
      timeSignature: { type: 'object' },
      totalBeats: { type: 'number', description: '工程总节拍数' },
      totalNotes: { type: 'number' },
      tracks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instrument: { type: 'object' },
            noteCount: { type: 'number' }
          }
        }
      }
    }
  }
}
```

### 3.3 `set_key`

**描述**：修改工程调性

```typescript
{
  name: 'set_key',
  description: '修改工程调性。修改后所有音符的相对关系不变（绝对音高变化）。',
  inputSchema: {
    type: 'object',
    properties: {
      root: { type: 'string', enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] },
      mode: { type: 'string', enum: ['major', 'minor', ...] }
    },
    required: ['root', 'mode']
  },
  outputSchema: {
    type: 'object',
    properties: {
      key: { type: 'object' },
      notesShifted: { type: 'integer', description: '被移动的音符数量' }
    }
  }
}
```

### 3.4 `set_tempo`

**描述**：修改工程速度

```typescript
{
  name: 'set_tempo',
  description: '修改工程速度（BPM）。',
  inputSchema: {
    type: 'object',
    properties: {
      bpm: { type: 'number', minimum: 20, maximum: 300 }
    },
    required: ['bpm']
  },
  outputSchema: {
    type: 'object',
    properties: { bpm: { type: 'number' } }
  }
}
```

---

## 4. Track 工具（轨道管理）

### 4.1 `create_track`

**描述**：创建新轨道

```typescript
{
  name: 'create_track',
  description: '创建一条新轨道，可选择乐器音色。',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '轨道名称，如"Piano"、"Drums"、"Guitar"' },
      instrument: {
        type: 'string',
        description: '乐器预设名，可选值：Piano_01, Guitar_Acoustic, Bass_Electric, Strings, Drums_Kit_01, Synth_Lead, Synth_Pad'
      },
      position: { type: 'integer', minimum: 0, description: '插入位置（索引），默认追加到末尾' }
    },
    required: ['name', 'instrument']
  },
  outputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      name: { type: 'string' },
      instrument: { type: 'object' },
      index: { type: 'integer' }
    }
  }
}
```

### 4.2 `delete_track`

**描述**：删除轨道（需要用户确认）

```typescript
{
  name: 'delete_track',
  description: '删除指定轨道及其所有音符。这是一个破坏性操作，需要用户确认。',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      confirm: { type: 'string', description: '必须等于 "DELETE_TRACK" 以确认删除' }
    },
    required: ['trackId', 'confirm']
  },
  outputSchema: {
    type: 'object',
    properties: {
      deletedTrackId: { type: 'string' },
      deletedNotesCount: { type: 'integer' }
    }
  }
}
```

### 4.3 `list_tracks`

**描述**：列出所有轨道

```typescript
{
  name: 'list_tracks',
  description: '列出当前工程的所有轨道及其基本信息。',
  inputSchema: { type: 'object', properties: {} },
  outputSchema: {
    type: 'object',
    properties: {
      tracks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instrument: { type: 'object' },
            noteCount: { type: 'integer' },
            mute: { type: 'boolean' },
            solo: { type: 'boolean' },
            volume: { type: 'number' },
            pan: { type: 'number' }
          }
        }
      }
    }
  }
}
```

---

## 5. Note 工具（音符编辑 - 核心）

### 5.1 `write_note`

**描述**：写入单个音符

```typescript
{
  name: 'write_note',
  description: '在指定轨道写入一个音符。',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string', description: '目标轨道 ID' },
      pitch: { type: 'integer', minimum: 0, maximum: 127, description: 'MIDI 音高（C4=60）' },
      velocity: { type: 'integer', minimum: 0, maximum: 127, description: '力度，默认 80' },
      startBeat: { type: 'number', description: '起始节拍（如 1.0 表示第 2 小节开始）' },
      durationBeats: { type: 'number', description: '持续节拍（如 0.5 表示八分音符）' },
      channel: { type: 'integer', minimum: 0, maximum: 15, description: 'MIDI 通道，默认 0' }
    },
    required: ['trackId', 'pitch', 'startBeat', 'durationBeats']
  },
  outputSchema: {
    type: 'object',
    properties: {
      noteId: { type: 'string' },
      pitch: { type: 'integer' },
      pitchName: { type: 'string', description: '如"C4"' },
      startBeat: { type: 'number' },
      durationBeats: { type: 'number' },
      trackId: { type: 'string' }
    }
  }
}
```

### 5.2 `write_chord`

**描述**：写入和弦（多个音同时）

```typescript
{
  name: 'write_chord',
  description: '在指定轨道写入一个和弦（多个音符同时开始）。',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      pitches: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 127 },
        description: 'MIDI 音高数组，如 [60, 62, 64] 表示 C-E-G'
      },
      velocity: { type: 'integer', minimum: 0, maximum: 127, default: 80 },
      startBeat: { type: 'number' },
      durationBeats: { type: 'number' }
    },
    required: ['trackId', 'pitches', 'startBeat', 'durationBeats']
  },
  outputSchema: {
    type: 'object',
    properties: {
      noteIds: { type: 'array', items: { type: 'string' } },
      chordName: { type: 'string', description: '推断出的和弦名（如 Cmaj7）' },
      trackId: { type: 'string' }
    }
  }
}
```

### 5.3 `write_progression`

**描述**：写入和弦进行（Agent 最常用的工具）

```typescript
{
  name: 'write_progression',
  description: '在指定轨道写入一个和弦进行。这是最方便的和弦生成工具。',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      chords: {
        type: 'array',
        items: { type: 'string' },
        description: '和弦符号数组，如 ["C", "G", "Am", "F"]'
      },
      startBeat: { type: 'number', description: '起始节拍，默认 0' },
      durationPerChord: { type: 'number', description: '每个和弦的持续节拍，默认 4' },
      voice: {
        type: 'string',
        enum: ['block', 'broken', 'arpeggio', 'root', 'inverted1', 'inverted2'],
        description: '和弦排列方式。block=柱式和弦，broken=分解和弦，arpeggio=琶音，root=只弹根音'
      },
      velocity: { type: 'integer', minimum: 0, maximum: 127, default: 80 },
      register: { type: 'integer', minimum: 0, maximum: 5, description: '音域范围（0=超低，2=中音区，默认）' }
    },
    required: ['trackId', 'chords']
  },
  outputSchema: {
    type: 'object',
    properties: {
      noteIds: { type: 'array', items: { type: 'string' } },
      totalNotes: { type: 'integer' },
      startBeat: { type: 'number' },
      endBeat: { type: 'number' },
      trackId: { type: 'string' }
    }
  }
}
```

### 5.4 `delete_note`

**描述**：删除音符

```typescript
{
  name: 'delete_note',
  description: '删除指定音符。',
  inputSchema: {
    type: 'object',
    properties: {
      noteId: { type: 'string' }
    },
    required: ['noteId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      deletedNoteId: { type: 'string' },
      pitchName: { type: 'string' }
    }
  }
}
```

### 5.5 `list_notes`

**描述**：列出轨道上的音符

```typescript
{
  name: 'list_notes',
  description: '列出指定轨道上的音符，可按范围筛选。',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      fromBeat: { type: 'number', description: '起始节拍（可选）' },
      toBeat: { type: 'number', description: '结束节拍（可选）' }
    },
    required: ['trackId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      notes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            pitch: { type: 'integer' },
            pitchName: { type: 'string' },
            velocity: { type: 'integer' },
            startBeat: { type: 'number' },
            durationBeats: { type: 'number' },
            source: { type: 'string', enum: ['human', 'agent', 'system'] }
          }
        }
      },
      total: { type: 'integer' }
    }
  }
}
```

---

## 6. Audio 工具（音频操作）

### 6.1 `preview_section`

**描述**：预览指定范围的音频

```typescript
{
  name: 'preview_section',
  description: '预览指定节拍范围的音频。用户会听到这段音频。',
  inputSchema: {
    type: 'object',
    properties: {
      fromBeat: { type: 'number', description: '起始节拍' },
      toBeat: { type: 'number', description: '结束节拍' },
      trackIds: { type: 'array', items: { type: 'string' }, description: '指定轨道（可选，默认全部）' }
    },
    required: ['fromBeat', 'toBeat']
  },
  outputSchema: {
    type: 'object',
    properties: {
      durationSeconds: { type: 'number' },
      notesPlayed: { type: 'integer' }
    }
  }
}
```

### 6.2 `render_audio`

**描述**：离线渲染音频文件

```typescript
{
  name: 'render_audio',
  description: '离线渲染整个工程（或指定范围）为音频文件。渲染完成后用户会收到文件路径。',
  inputSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['wav', 'mp3', 'flac'], default: 'wav' },
      quality: { type: 'number', minimum: 0, maximum: 1, default: 0.9, description: '压缩质量（mp3 用）' },
      fromBeat: { type: 'number', description: '起始节拍（可选）' },
      toBeat: { type: 'number', description: '结束节拍（可选）' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: '生成的音频文件路径' },
      durationSeconds: { type: 'number' },
      fileSize: { type: 'integer', description: '字节数' },
      format: { type: 'string' }
    }
  }
}
```

---

## 7. State 工具（状态查询）

### 7.1 `get_current_score`

**描述**：获取当前乐谱（Agent 感知当前状态的关键工具）

```typescript
{
  name: 'get_current_score',
  description: '获取当前工程的完整乐谱信息。这是 Agent 感知当前状态的关键工具，编辑前建议先调用。',
  inputSchema: {
    type: 'object',
    properties: {
      includeNotes: { type: 'boolean', default: true, description: '是否包含音符详情' },
      maxNotesPerTrack: { type: 'integer', default: 100, description: '每轨道最多返回的音符数' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      key: { type: 'object' },
      tempo: { type: 'number' },
      timeSignature: { type: 'object' },
      totalBeats: { type: 'number' },
      tracks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instrument: { type: 'object' },
            notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  pitchName: { type: 'string' },
                  startBeat: { type: 'number' },
                  durationBeats: { type: 'number' },
                  velocity: { type: 'integer' },
                  source: { type: 'string' }
                }
              }
            },
            noteCount: { type: 'integer' }
          }
        }
      }
    }
  }
}
```

**关键设计**：`get_current_score` 是**只读工具**，Agent 每次编辑前都应该先调用它了解当前状态。这是"感知-决策-行动"循环的关键。

---

## 8. 高级工具（M6+）

以下是 v0.5 阶段计划添加的工具：

### 8.1 `analyze_chord`（识别和弦）

```typescript
{
  name: 'analyze_chord',
  description: '分析指定音符组成什么和弦。',
  inputSchema: {
    type: 'object',
    properties: {
      pitchNames: { type: 'array', items: { type: 'string' }, description: '如 ["C", "E", "G"]' }
    },
    required: ['pitchNames']
  },
  outputSchema: {
    type: 'object',
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: '如 "Cmaj7"' },
            confidence: { type: 'number' },
            inversion: { type: 'integer' }
          }
        }
      },
      root: { type: 'string' }
    }
  }
}
```

### 8.2 `suggest_progression`（和弦建议）

```typescript
{
  name: 'suggest_progression',
  description: '基于当前调性给出常见的和弦进行建议。',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'object' },
      style: { type: 'string', enum: ['pop', 'rock', 'jazz', 'lofi', 'classical'] },
      length: { type: 'integer', minimum: 2, maximum: 16, description: '进行长度（小节数）' }
    },
    required: ['key']
  },
  outputSchema: {
    type: 'object',
    properties: {
      progressions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            chords: { type: 'array', items: { type: 'string' } },
            name: { type: 'string', description: '如 "1-5-6-4"、"ii-V-I"' },
            usage: { type: 'string', description: '典型用途' }
          }
        }
      }
    }
  }
}
```

### 8.3 `generate_variation`（变奏生成）

```typescript
{
  name: 'generate_variation',
  description: '基于选中的音符生成变奏。',
  inputSchema: {
    type: 'object',
    properties: {
      baseNoteIds: { type: 'array', items: { type: 'string' } },
      variationType: {
        type: 'string',
        enum: ['melodic', 'harmonic', 'rhythmic', 'ornamental']
      },
      constraints: { type: 'string', description: '自然语言约束，如"保持调性"、"更欢快"' },
      count: { type: 'integer', minimum: 1, maximum: 5, description: '生成变奏数量，默认 3' }
    },
    required: ['baseNoteIds', 'variationType']
  },
  outputSchema: {
    type: 'object',
    properties: {
      variations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            notes: { type: 'array', items: { type: 'object' } },
            previewAudioPath: { type: 'string' }
          }
        }
      }
    }
  }
}
```

### 8.4 `suggest_edit`（非侵入建议）

```typescript
{
  name: 'suggest_edit',
  description: '给出编辑建议但不立即执行，等待用户批准。',
  inputSchema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: '建议说明' },
      command: { type: 'object', description: '具体命令' },
      rationale: { type: 'string', description: '为什么这个建议' },
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['description', 'command']
  },
  outputSchema: {
    type: 'object',
    properties: {
      suggestionId: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'modified'] }
    }
  }
}
```

---

## 9. 权限分级

每个工具都有一个权限级别，决定执行前是否需要用户确认：

| 工具 | 权限 | 说明 |
|---|---|---|
| `get_project_info` | silent | 只读，静默执行 |
| `get_current_score` | silent | 只读 |
| `list_tracks` | silent | 只读 |
| `list_notes` | silent | 只读 |
| `analyze_chord` | silent | 只读 |
| `suggest_progression` | silent | 只读 |
| `preview_section` | silent | 无副作用 |
| `write_note` | notify | 添加音符后通知 |
| `write_chord` | notify | 添加和弦后通知 |
| `write_progression` | confirm（信任模式 silent） | 需要确认（信任模式下静默） |
| `create_track` | notify | 创建后通知 |
| `set_key` | notify | 修改后通知 |
| `set_tempo` | notify | 修改后通知 |
| `delete_note` | confirm | 需要确认 |
| `delete_track` | strong | 强确认（多步） |
| `render_audio` | notify | 完成后通知 |
| `generate_variation` | confirm | 生成前确认 |
| `suggest_edit` | confirm | 建议前确认 |

**"信任 Agent"开关**：
- 用户可以在设置里启用"信任 Agent"模式
- 启用后，`notify` 和 `confirm` 级别降级为 `silent`
- 但 `strong` 级别仍然需要确认（防误操作）

---

## 10. 错误处理

### 10.1 错误码

```typescript
enum ToolErrorCode {
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',       // 参数错误
  NOT_FOUND = 'NOT_FOUND',                    // 找不到资源（轨道、音符）
  PERMISSION_DENIED = 'PERMISSION_DENIED',    // 权限不足
  CONFLICT = 'CONFLICT',                      // 冲突（用户正在编辑）
  INTERNAL_ERROR = 'INTERNAL_ERROR',          // 内部错误
  RATE_LIMITED = 'RATE_LIMITED',              // 频率限制
}
```

### 10.2 错误响应格式

```typescript
{
  ok: false,
  error: {
    code: 'CONFLICT',
    message: 'Note is being edited by user, try again later',
    details: {
      noteId: 'xxx',
      lockedBy: 'human'
    },
    retryable: true  // Agent 是否可以重试
  }
}
```

---

## 11. MCP Server 实现

### 11.1 目录结构

```
electron/server/mcp/
├── server.ts              # MCP Server 主类
├── tool-registry.ts       # 工具注册表
├── tools/
│   ├── project.ts         # Project 工具
│   ├── track.ts           # Track 工具
│   ├── note.ts            # Note 工具
│   ├── audio.ts           # Audio 工具
│   └── state.ts           # State 工具
├── permission.ts          # 权限检查
└── logging.ts             # 工具调用日志
```

### 11.2 Server 初始化

```typescript
// electron/server/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createServer } from 'node:http';

export class ResonanceMCPServer {
  private server: Server;
  private port: number;
  
  constructor() {
    this.server = new Server({
      name: 'resonance-composer',
      version: '0.1.0',
    }, {
      capabilities: {
        tools: {},
      }
    });
    
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOL_REGISTRY.getAll() };
    });
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // 权限检查
      const permission = checkPermission(name, args);
      if (permission === 'strong') {
        // 等待用户确认
        const confirmed = await waitForUserConfirm(name, args);
        if (!confirmed) return { isError: true, content: [{ type: 'text', text: 'User declined' }] };
      }
      
      // 执行工具
      const result = await TOOL_REGISTRY.execute(name, args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    });
  }
  
  async start() {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    await this.server.connect(transport);
    // 启动 HTTP server
    this.port = ...;
  }
}
```

### 11.3 工具注册

```typescript
// electron/server/mcp/tool-registry.ts
import { z } from 'zod';  // 或 zod-to-json-schema

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  
  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }
  
  getAll() {
    return Array.from(this.tools.values()).map(t => t.definition);
  }
  
  async execute(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(args);
  }
}

export const TOOL_REGISTRY = new ToolRegistry();
```

### 11.4 工具实现示例

```typescript
// electron/server/mcp/tools/note.ts
TOOL_REGISTRY.register({
  name: 'write_note',
  definition: {
    name: 'write_note',
    description: '在指定轨道写入一个音符。',
    inputSchema: {
      type: 'object',
      properties: {
        trackId: { type: 'string' },
        pitch: { type: 'integer', minimum: 0, maximum: 127 },
        velocity: { type: 'integer', minimum: 0, maximum: 127, default: 80 },
        startBeat: { type: 'number' },
        durationBeats: { type: 'number' },
      },
      required: ['trackId', 'pitch', 'startBeat', 'durationBeats'],
    }
  },
  async execute(args) {
    const { trackId, pitch, velocity = 80, startBeat, durationBeats } = args;
    
    // 1. 验证
    const track = getTrack(trackId);
    if (!track) throw new ToolError('NOT_FOUND', `Track ${trackId} not found`);
    
    // 2. 构建 Command
    const note: Note = {
      id: uuid(),
      pitch,
      velocity,
      start: beatToTick(startBeat),
      duration: beatToTick(durationBeats),
      channel: 0,
      source: 'agent',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    
    const cmd = makeAddNoteCommand(note);
    
    // 3. 执行
    await projectStore.dispatch(cmd);
    
    // 4. 返回结果
    return {
      noteId: note.id,
      pitch,
      pitchName: pitchToName(pitch),
      startBeat,
      durationBeats,
      trackId,
    };
  },
});
```

---

## 12. MCP 工具测试

### 12.1 单元测试

```typescript
// tests/integration/mcp-tools.test.ts
import { TOOL_REGISTRY } from '../electron/server/mcp/tool-registry';

describe('MCP Tools', () => {
  beforeEach(async () => {
    // 重置工程状态
    await projectStore.reset();
    await projectStore.dispatch(makeCreateProjectCommand({ name: 'Test' }));
  });
  
  it('create_track creates a valid track', async () => {
    const result = await TOOL_REGISTRY.execute('create_track', {
      name: 'Piano',
      instrument: 'Piano_01',
    });
    
    expect(result.trackId).toBeDefined();
    expect(result.name).toBe('Piano');
    expect(result.instrument.program).toBe(0);
  });
  
  it('write_progression writes the correct number of notes', async () => {
    const track = await TOOL_REGISTRY.execute('create_track', {
      name: 'Piano',
      instrument: 'Piano_01',
    });
    
    const result = await TOOL_REGISTRY.execute('write_progression', {
      trackId: track.trackId,
      chords: ['C', 'G', 'Am', 'F'],
      durationPerChord: 4,
      voice: 'block',
    });
    
    expect(result.totalNotes).toBeGreaterThan(0);
    expect(result.endBeat).toBe(16);  // 4 和弦 × 4 拍
  });
  
  it('get_current_score returns current project state', async () => {
    await TOOL_REGISTRY.execute('create_track', { name: 'Piano', instrument: 'Piano_01' });
    
    const result = await TOOL_REGISTRY.execute('get_current_score', {});
    
    expect(result.key).toBeDefined();
    expect(result.tracks.length).toBe(1);
  });
  
  it('rejects delete_track without confirmation', async () => {
    const track = await TOOL_REGISTRY.execute('create_track', { name: 'Piano', instrument: 'Piano_01' });
    
    await expect(TOOL_REGISTRY.execute('delete_track', { trackId: track.trackId })).rejects.toThrow(/confirm/i);
    
    await TOOL_REGISTRY.execute('delete_track', { trackId: track.trackId, confirm: 'DELETE_TRACK' });
  });
});
```

### 12.2 E2E 测试（Agent 通过 MCP）

```typescript
// tests/e2e/agent-mcp-flow.test.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { ToolRegistry } from '../../electron/server/mcp/tool-registry';

describe('Agent MCP Flow', () => {
  it('can generate a simple song through MCP', async () => {
    // 启动 MCP Server
    await startMCPServer();
    
    // 用 Claude 通过 MCP 客户端连接
    const client = createMCPClient('http://127.0.0.1:port');
    
    // 发送对话
    const response = await client.chat({
      messages: [{ role: 'user', content: '写一段 C 大调的 4 小节和弦进行' }],
      tools: await client.listTools(),
    });
    
    // 验证：应该至少有钢琴轨道和和弦
    const state = await TOOL_REGISTRY.execute('get_current_score', {});
    expect(state.tracks.length).toBeGreaterThan(0);
    expect(state.tracks.some(t => t.name.includes('Piano'))).toBe(true);
    
    await client.close();
    await stopMCPServer();
  });
});
```

---

## 13. 工具扩展指南

### 13.1 添加新工具的步骤

1. **定义 schema**：在 `electron/server/mcp/tools/xxx.ts` 中定义工具
2. **注册**：调用 `TOOL_REGISTRY.register(...)`
3. **权限**：在 `permission.ts` 中添加权限级别
4. **测试**：添加单元测试和集成测试
5. **文档**：更新本文档
6. **系统提示**：更新 Agent 的 system prompt 让 Agent 知道有新工具

### 13.2 命名约定

- 工具名使用 **snake_case**：`write_note`、`get_current_score`
- 动词在前：`create_track`、`delete_note`、`list_tracks`
- 前缀分组：`write_*`（写入）、`get_*`（读取）、`list_*`（列出）、`set_*`（设置）、`delete_*`（删除）

### 13.3 参数命名

- 使用 camelCase：`trackId`、`startBeat`
- 位置参数用 beat（而非 tick），因为 LLM 对"拍"更熟悉
- 内部转换 beat → tick，MCP 层对用户屏蔽 tick

### 13.4 返回格式

- 使用 camelCase
- 返回 `id` 让 Agent 后续可以引用
- 返回 `name`（如 `pitchName`）让 Agent 有可读性

---

## 14. 版本演进

### 14.1 v0.1（MVP）

15 个工具：project（4）+ track（3）+ note（5）+ audio（2）+ state（1）

### 14.2 v0.5

+6 个工具：
- `analyze_chord`
- `suggest_progression`
- `generate_variation`
- `suggest_edit`
- `add_effect`（效果器）
- `update_mixer`（混音）

### 14.3 v1.0

+ 更多高级工具：
- `load_vst`（VST 插件）
- `import_midi`（导入 MIDI 文件）
- `export_musicxml`（导出乐谱）
- `analyze_tempo`（分析节奏）
- `suggest_arrangement`（编排建议）

---

## 15. 参考

- [MCP 官方规范](https://modelcontextprotocol.io/)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Zod 类型定义](https://zod.dev/)
