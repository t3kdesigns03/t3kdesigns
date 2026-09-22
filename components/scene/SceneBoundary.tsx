"use client";

import { Component, type ReactNode } from "react";

/**
 * If the renderer throws (context loss, driver refusal, a shader that will
 * not compile on some phone) the page must not look broken: we tell the
 * store and the CSS galaxy stays as the background.
 */
export default class SceneBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[scene] falling back to CSS galaxy:", error);
    }
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
