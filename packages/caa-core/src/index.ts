/**
 * @caa/core — Pure TypeScript core logic for Composer 共鸣.
 *
 * This package has no dependency on Electron, Node.js builtins, or any
 * DOM API. It can be imported from the renderer, the main process, the
 * audio render process, and (potentially) a CLI or cloud service.
 */

export * from './constants.js';
export * from './types.js';
export * from './timeline.js';
export * from './note-utils.js';
export * from './scale.js';
export * from './project.js';
export * from './track.js';
export * from './command.js';
