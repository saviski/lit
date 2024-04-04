/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {PropertyDeclaration, PropertyValueMap, ReactiveElement} from 'lit';
import {Signal} from 'signal-polyfill';
import {WatchDirective} from './watch.js';

type ReactiveElementConstructor = abstract new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => ReactiveElement;

export interface SignalWatcher extends ReactiveElement {
  updateWatch(d: WatchDirective<unknown>): void;
}

/**
 * Adds the ability for a LitElement or other ReactiveElement class to
 * watch for access to signals during the update lifecycle and trigger a new
 * update when signals values change.
 */
export function SignalWatcher<T extends ReactiveElementConstructor>(
  Base: T
): T {
  abstract class SignalWatcher extends Base {
    // Watcher.watch() doesn't dedupe so we need to track this ourselves.
    private __isWatching = false;
    private __watcherUpdate = false;
    private __watcher = new Signal.subtle.Watcher(() => {
      this.__watcherUpdate = true;
      this.requestUpdate();
      this.__watcherUpdate = false;
    });
    private __forceUpdateSignal = new Signal.State(0);
    private __updateSignal = new Signal.Computed(() => {
      this.__forceUpdateSignal.get();
      super.performUpdate();
    });
    private __shouldRender = true;
    private __pendingWatches = new Set<WatchDirective<unknown>>();

    protected override performUpdate() {
      // ReactiveElement.performUpdate() also does this check, so we want to
      // bail early so we don't erroneously appear to not depend on any signals.
      if (this.isUpdatePending === false) {
        return;
      }
      if (this.__shouldRender) {
        this.__updateSignal.get();
      } else {
        super.performUpdate();
      }
    }

    protected override update(
      changedProperties: PropertyValueMap<this> | Map<PropertyKey, unknown>
    ): void {
      if (this.__shouldRender) {
        this.__shouldRender = false;
        super.update(changedProperties);
      } else {
        this.__pendingWatches.forEach((d) => d.commmit());
        this.__pendingWatches.clear();
      }
    }

    override requestUpdate(
      name?: PropertyKey | undefined,
      oldValue?: unknown,
      options?: PropertyDeclaration<unknown, unknown> | undefined
    ): void {
      this.__shouldRender = true;
      if (!this.__watcherUpdate) {
        this.__forceUpdateSignal?.set(this.__forceUpdateSignal.get() + 1);
      }
      super.requestUpdate(name, oldValue, options);
    }

    override connectedCallback(): void {
      if (!this.__isWatching) {
        this.__isWatching = true;
        this.__watcher.watch(this.__updateSignal);
        this.requestUpdate();
      }
      super.connectedCallback();
    }

    override disconnectedCallback(): void {
      this.__isWatching = false;
      this.__watcher.unwatch(this.__updateSignal);
      super.disconnectedCallback();
    }

    updateWatch(d: WatchDirective<unknown>): void {
      this.__pendingWatches.add(d);
      const shouldRender = this.__shouldRender;
      this.__watcherUpdate = true;
      this.requestUpdate();
      this.__watcherUpdate = false;
      this.__shouldRender = shouldRender;
    }
  }
  return SignalWatcher;
}
