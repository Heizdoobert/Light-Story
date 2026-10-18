// Re-export SDK Task store utilities – ensure clear method is available
import { taskStore as sdkStore, generateId, mapTask, mapPaginated } from '@/sdk/task/api/_shared';

// Export the same store object; add clear method if missing (for test compatibility)
export const taskStore = sdkStore;
if (!(taskStore as any).clear) {
  (taskStore as any).clear = () => {
    for (const key in taskStore) {
      delete (taskStore as any)[key];
    }
  };
}

export { generateId, mapTask, mapPaginated };
