// Re-export SDK Task store utilities – ensure clear method is available
import { taskStore as sdkStore, generateId, mapTask, mapPaginated } from '@/sdk/task/api/_shared';

// Export the same store object; add clear method if missing (for test compatibility)
export const taskStore = sdkStore;
const storeWithClear = taskStore as Record<string, unknown> & { clear?: () => void };
if (!storeWithClear.clear) {
  storeWithClear.clear = () => {
    for (const key of Object.keys(taskStore)) {
      if (key !== 'clear') delete (taskStore as Record<string, unknown>)[key];
    }
  };
}

export { generateId, mapTask, mapPaginated };
