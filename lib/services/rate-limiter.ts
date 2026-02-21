/**
 * Rate limiter implementation for FinancialData.net API
 *
 * Shared across market-data and options-data services since
 * they use the same API key with a single rate limit (10 req/min).
 */
export class RateLimiter {
  private queue: Array<() => Promise<void>> = []
  private requestTimes: number[] = []
  private readonly maxRequestsPerMinute: number = 10
  private readonly minIntervalMs: number = 6000 // 6 seconds between requests (10 per minute)
  private processing: boolean = false

  /**
   * Add a request to the queue and process it with rate limiting
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Clean up old request times (older than 1 minute)
      const now = Date.now()
      this.requestTimes = this.requestTimes.filter((time) => now - time < 60000)

      // Check if we need to wait
      if (this.requestTimes.length >= this.maxRequestsPerMinute) {
        const oldestRequest = this.requestTimes[0]
        const waitTime = 60000 - (now - oldestRequest)
        if (waitTime > 0) {
          await this.sleep(waitTime)
          continue
        }
      }

      // Get the next request
      const request = this.queue.shift()
      if (!request) break

      // Execute the request
      this.requestTimes.push(Date.now())
      await request()

      // Wait minimum interval before next request
      if (this.queue.length > 0) {
        await this.sleep(this.minIntervalMs)
      }
    }

    this.processing = false
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }
}

// Shared singleton — both market-data.ts and options-data.ts import this
export const apiRateLimiter = new RateLimiter()
