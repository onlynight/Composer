/**
 * Project CRUD operations (pure, side-effect-free).
 */

import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
  TICKS_PER_BEAT,
} from './constants.js';
import { totalTicksForBars } from './timeline.js';
import type { Id, Project, TimeSignature, Track } from './types.js';

/** Generate a UUID v4-style identifier. Uses crypto.randomUUID when available. */
export function newId(): Id {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Math.random-based pseudo-UUID (not cryptographically secure).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface NewProjectOptions {
  name?: string;
  bpm?: number;
  timeSignature?: TimeSignature;
  initialBars?: number;
  initialTracks?: Array<{ name: string; program: number; type?: Track['type'] }>;
}

/** Create an empty project with sane defaults. */
export function createProject(opts: NewProjectOptions = {}): Project {
  const now = Date.now();
  const timeSignature = opts.timeSignature ?? {
    numerator: DEFAULT_TIME_SIGNATURE[0],
    denominator: DEFAULT_TIME_SIGNATURE[1],
  };
  const bpm = opts.bpm ?? DEFAULT_BPM;
  const initialBars = opts.initialBars ?? 16;
  const totalTicks = totalTicksForBars(initialBars, { bpm, timeSignature });

  const initialTracks: Track[] = (opts.initialTracks ?? [
    { name: 'Piano', program: 0 },
    { name: 'Bass', program: 33 },
    { name: 'Drums', program: 120 },
  ]).map((t, i) => ({
    id: newId(),
    name: t.name,
    type: t.type ?? (t.name.toLowerCase().includes('drum') ? 'percussion' : 'piano'),
    channel: i,
    program: t.program,
    volumeDb: 0,
    pan: 0,
    muted: false,
    solo: false,
    visible: true,
    notes: [],
  }));

  return {
    id: newId(),
    name: opts.name ?? 'Untitled Project',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    bpm,
    timeSignature,
    totalTicks,
    tracks: initialTracks,
    selectedNoteIds: [],
    activeTrackIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Duplicate a project (deep copy with fresh ids). */
export function duplicateProject(src: Project, newName?: string): Project {
  const idMap = new Map<string, string>();
  const tracks: Track[] = src.tracks.map((t) => {
    const tid = newId();
    idMap.set(t.id, tid);
    return {
      ...t,
      id: tid,
      notes: t.notes.map((n) => {
        const nid = newId();
        idMap.set(n.id, nid);
        return { ...n, id: nid };
      }),
    };
  });
  const now = Date.now();
  return {
    ...src,
    id: newId(),
    name: newName ?? `${src.name} (Copy)`,
    tracks,
    selectedNoteIds: src.selectedNoteIds.map((id) => idMap.get(id) ?? id),
    createdAt: now,
    updatedAt: now,
  };
}

/** Serialize a project to a portable JSON string. */
export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

/** Parse a project from JSON, with schema version validation. */
export function deserializeProject(json: string): Project {
  const parsed = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid project JSON: not an object');
  }
  if (typeof parsed.schemaVersion !== 'number') {
    throw new Error('Invalid project JSON: missing schemaVersion');
  }
  if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Project schemaVersion ${parsed.schemaVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  return migrateProject(parsed as Project);
}

/**
 * Migrate a project to the current schema version.
 * Add new migration steps here as schema evolves.
 */
export function migrateProject(project: Project): Project {
  if (project.schemaVersion >= CURRENT_SCHEMA_VERSION) return project;
  // v1 is the initial version — no migrations needed yet.
  return { ...project, schemaVersion: CURRENT_SCHEMA_VERSION };
}

/** Compute the project's total duration in seconds (informational). */
export function projectDurationSeconds(project: Project): number {
  return (project.totalTicks / TICKS_PER_BEAT) * (60 / project.bpm);
}
