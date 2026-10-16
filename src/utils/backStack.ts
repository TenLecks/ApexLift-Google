// Android back button: open sheets/menus/modals push a handler; the newest one wins.
// When nothing is open, App's own navigation (exit workout → close sub-screen → Workout tab → exit) runs.

export interface BackStack {
  push(handler: () => void): () => void;
  handle(): boolean;
}

export function createBackStack(): BackStack {
  const handlers: (() => void)[] = [];
  return {
    push(handler) {
      handlers.push(handler);
      return () => {
        const i = handlers.lastIndexOf(handler);
        if (i >= 0) handlers.splice(i, 1);
      };
    },
    handle() {
      const top = handlers[handlers.length - 1];
      if (!top) return false;
      top();
      return true;
    },
  };
}

export const backStack = createBackStack();
