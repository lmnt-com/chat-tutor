/**
 * A queue that processes promises as they are added and completed.
 * Useful for handling concurrent operations that need to be processed in order.
 */
export class PromiseQueue<T> {
  private queue: Promise<T>[] = [];
  private isProcessing = false;
  private isComplete = false;

  /**
   * Add a promise to the queue
   */
  add(promise: Promise<T>): void {
    if (this.isComplete) {
      throw new Error("Cannot add to completed queue");
    }
    this.queue.push(promise);
  }

  /**
   * Mark the queue as complete (no more items will be added)
   */
  markComplete(): void {
    this.isComplete = true;
  }

  /**
   * Check if the queue is complete and empty
   */
  isFinished(): boolean {
    return this.isComplete && this.queue.length === 0;
  }

  /**
   * Process all promises in the queue sequentially
   * @param processor Function to handle each completed promise result
   * @param errorHandler Optional function to handle errors
   */
  async process(
    processor: (result: T) => void | Promise<void>,
    errorHandler?: (error: Error, index: number) => void | Promise<void>,
  ): Promise<void> {
    if (this.isProcessing) {
      throw new Error("PromiseQueue is already processing");
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      while (processedCount < this.queue.length || !this.isComplete) {
        if (processedCount < this.queue.length) {
          const currentIndex = processedCount;
          try {
            const result = await this.queue[currentIndex];
            await processor(result);
          } catch (error) {
            const errorObj =
              error instanceof Error ? error : new Error(String(error));
            console.error(
              `Error processing promise at index ${currentIndex}:`,
              errorObj,
            );

            if (errorHandler) {
              await errorHandler(errorObj, currentIndex);
            }
          }
          processedCount++;
        } else {
          // Wait a bit before checking for new promises
          // Note: In production, you might use events instead of polling
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the current queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (only when not processing)
   */
  clear(): void {
    if (this.isProcessing) {
      throw new Error("Cannot clear queue while processing");
    }
    this.queue = [];
    this.isComplete = false;
  }
}
