/**
 * Unit Tests: Query Cache Invalidation System
 *
 * Tests the manual cache invalidation pattern that replaces useLiveQuery.
 * Critical for ensuring UI updates when database changes occur.
 */

import { queryCache } from "../../db/query-cache";

describe("QueryCache", () => {
  beforeEach(() => {
    // Clear all subscribers between tests
    queryCache.clearAllSubscribers();
  });

  describe("subscribe()", () => {
    it("should register a new listener and return unsubscribe function", () => {
      const listener = jest.fn();

      expect(queryCache.getSubscriberCount()).toBe(0);

      const unsubscribe = queryCache.subscribe(listener);

      expect(queryCache.getSubscriberCount()).toBe(1);
      expect(typeof unsubscribe).toBe("function");

      unsubscribe();

      expect(queryCache.getSubscriberCount()).toBe(0);
    });

    it("should support multiple concurrent subscribers", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      const unsub1 = queryCache.subscribe(listener1);
      const unsub2 = queryCache.subscribe(listener2);
      const unsub3 = queryCache.subscribe(listener3);

      expect(queryCache.getSubscriberCount()).toBe(3);

      unsub2();

      expect(queryCache.getSubscriberCount()).toBe(2);

      unsub1();
      unsub3();

      expect(queryCache.getSubscriberCount()).toBe(0);
    });

    it("should safely handle unsubscribe called multiple times", () => {
      const listener = jest.fn();
      const unsubscribe = queryCache.subscribe(listener);

      expect(queryCache.getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(queryCache.getSubscriberCount()).toBe(0);

      // Should not throw
      unsubscribe();
      expect(queryCache.getSubscriberCount()).toBe(0);
    });
  });

  describe("invalidate()", () => {
    it("should notify all registered listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      queryCache.subscribe(listener1);
      queryCache.subscribe(listener2);
      queryCache.subscribe(listener3);

      queryCache.invalidate();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should not notify unsubscribed listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      queryCache.subscribe(listener1);
      const unsub2 = queryCache.subscribe(listener2);

      unsub2();

      queryCache.invalidate();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    it("should handle multiple invalidations correctly", () => {
      const listener = jest.fn();

      queryCache.subscribe(listener);

      queryCache.invalidate();
      queryCache.invalidate();
      queryCache.invalidate();

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("should not throw when invalidating with no subscribers", () => {
      expect(() => queryCache.invalidate()).not.toThrow();
    });

    it("should handle listeners that throw errors gracefully", () => {
      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const goodListener = jest.fn();
      const badListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const anotherGoodListener = jest.fn();

      queryCache.subscribe(goodListener);
      queryCache.subscribe(badListener);
      queryCache.subscribe(anotherGoodListener);

      // Should not throw despite badListener throwing
      expect(() => queryCache.invalidate()).not.toThrow();

      // All listeners should have been called
      expect(goodListener).toHaveBeenCalledTimes(1);
      expect(badListener).toHaveBeenCalledTimes(1);
      expect(anotherGoodListener).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getSubscriberCount()", () => {
    it("should return 0 when no subscribers", () => {
      expect(queryCache.getSubscriberCount()).toBe(0);
    });

    it("should return accurate count as subscribers are added and removed", () => {
      const unsub1 = queryCache.subscribe(() => {});
      expect(queryCache.getSubscriberCount()).toBe(1);

      const unsub2 = queryCache.subscribe(() => {});
      expect(queryCache.getSubscriberCount()).toBe(2);

      const unsub3 = queryCache.subscribe(() => {});
      expect(queryCache.getSubscriberCount()).toBe(3);

      unsub2();
      expect(queryCache.getSubscriberCount()).toBe(2);

      unsub1();
      unsub3();
      expect(queryCache.getSubscriberCount()).toBe(0);
    });
  });

  describe("Integration: Simulating real usage patterns", () => {
    it("should correctly handle subscriber registration during invalidation", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn(() => {
        // Register new listener during invalidation
        queryCache.subscribe(listener3);
      });
      const listener3 = jest.fn();

      queryCache.subscribe(listener1);
      queryCache.subscribe(listener2);

      queryCache.invalidate();

      // Listener3 should NOT be called during this invalidation
      // because it was registered after invalidation started
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).not.toHaveBeenCalled();

      // But should be called on next invalidation
      queryCache.invalidate();
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should handle unsubscribe during invalidation", () => {
      const listener1 = jest.fn();
      let unsub2: (() => void) | null = null;
      const listener2 = jest.fn(() => {
        // Unsubscribe self during callback
        if (unsub2) unsub2();
      });
      const listener3 = jest.fn();

      queryCache.subscribe(listener1);
      unsub2 = queryCache.subscribe(listener2);
      queryCache.subscribe(listener3);

      queryCache.invalidate();

      // All should be called on first invalidation
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      // On second invalidation, listener2 should not be called
      queryCache.invalidate();
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(2);
    });
  });
});
