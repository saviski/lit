/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Signal} from 'signal-polyfill';

export * from 'signal-polyfill';
export * from './lib/signal-watcher.js';
export * from './lib/watch.js';
export * from './lib/html-tag.js';

export const State = Signal.State;
export const Computed = Signal.Computed;
export const subtle = Signal.subtle;

export const signal = <T>(value: T) => new Signal.State(value);
export const computed = <T>(callback: () => T) =>
  new Signal.Computed<T>(callback);
