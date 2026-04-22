/**
 * Query Cache Invalidation System
 *
 * Root cause: Drizzle's useLiveQuery doesn't auto-detect changes in expo-sqlite.
 * Solution: Manual invalidation pattern that explicitly notifies subscribers when data changes.
 *
 * Engineering principles:
 * - Explicit over implicit
 * - Predictable, deterministic behavior
 * - Single source of truth for invalidation
 */

export interface QueryCacheEvent {
  type?: "entry-updated" | "entry-deleted" | "generic";
  entryId?: string;
}

type InvalidationListener = (event?: QueryCacheEvent) => void;

class QueryCache {
  private listeners: Set<InvalidationListener> = new Set();

  /**
   * Register a listener that will be called when any table is invalidated
   */
  subscribe(listener: InvalidationListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Invalidate all queries, triggering all subscribers to refetch
   */
  invalidate(event?: QueryCacheEvent): void {
    console.log(
      "[QueryCache] Invalidating cache. Active subscribers:",
      this.listeners.size
    );
    // Snapshot listeners to avoid issues with listeners added/removed during iteration
    const listenersSnapshot = Array.from(this.listeners);
    listenersSnapshot.forEach((listener, index) => {
      try {
        console.log("[QueryCache] Notifying subscriber", index);
        listener(event);
      } catch (error) {
        console.error("[QueryCache] Subscriber error:", error);
        // Continue notifying other subscribers even if one fails
      }
    });
    console.log("[QueryCache] All subscribers notified");
  }

  /**
   * Get the current number of active subscribers (for debugging)
   */
  getSubscriberCount(): number {
    return this.listeners.size;
  }

  /**
   * Clear all subscribers (for testing only)
   */
  clearAllSubscribers(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const queryCache = new QueryCache();
