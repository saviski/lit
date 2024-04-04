/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {DirectiveResult, Part, directive} from 'lit/directive.js';
import {AsyncDirective} from 'lit/async-directive.js';
import {Signal} from 'signal-polyfill';
import {SignalWatcher} from './signal-watcher.js';

export class WatchDirective<T> extends AsyncDirective {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private __host?: SignalWatcher;
  __signal?: Signal.State<T> | Signal.Computed<T>;
  private __watcher = new Signal.subtle.Watcher(() => {
    this.__host?.updateWatch(this as WatchDirective<unknown>);
  });

  commmit() {
    this.setValue(Signal.subtle.untrack(() => this.__signal?.get()));
  }

  // @ts-expect-error: signal is unused, but the name appears in the signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(signal: Signal.State<T> | Signal.Computed<T>): T {
    return undefined as T;
  }

  override update(
    part: Part,
    [signal]: [signal: Signal.State<T> | Signal.Computed<T>]
  ) {
    this.__host ??= part.options?.host as SignalWatcher;
    if (signal !== this.__signal) {
      if (this.__signal !== undefined) {
        this.__watcher.unwatch(this.__signal);
      }
      if (signal !== undefined) {
        this.__watcher.watch(signal);
      }
      this.__signal = signal;
    }

    // We use untrack() so that the signal access is not tracked by the watcher
    // created by SignalWatcher. This means that an can use both SignalWatcher
    // and watch() and a signal update won't trigger a full element update if
    // it's only passed to watch() and not otherwise accessed by the element.
    return Signal.subtle.untrack(() => signal.get());
  }

  protected override disconnected(): void {
    if (this.__signal !== undefined) {
      this.__watcher.unwatch(this.__signal);
    }
  }

  protected override reconnected(): void {
    if (this.__signal !== undefined) {
      this.__watcher.watch(this.__signal);
    }
  }
}

export type WatchDirectiveFunction = <T>(
  signal: Signal.State<T> | Signal.Computed<T>
) => DirectiveResult<typeof WatchDirective<T>>;

/**
 * Renders a signal and subscribes to it, updating the part when the signal
 * changes.
 */
export const watch = directive(WatchDirective) as WatchDirectiveFunction;
