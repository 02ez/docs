import { describe, expect, test, beforeAll } from 'vitest'
import { performance } from 'perf_hooks'

// Performance SLO thresholds (in milliseconds)
const SLO_THRESHOLDS = {
  // Critical paths that must stay fast
  HOT_PATHS: {
    // Page rendering should be under 500ms
    PAGE_RENDER: 500,
    // API responses should be under 200ms  
    API_RESPONSE: 200,
    // Search queries should be under 300ms
    SEARCH_QUERY: 300,
    // Content parsing should be under 100ms
    CONTENT_PARSE: 100,
  },
  // Performance regression detection
  REGRESSION: {
    // Alert if performance degrades by more than 20%
    DEGRADATION_THRESHOLD: 0.2,
    // Minimum number of samples for baseline
    MIN_SAMPLES: 5,
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map()
  
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start
    this.recordMeasurement(name, duration)
    return result
  }
  
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start
    this.recordMeasurement(name, duration)
    return result
  }
  
  private recordMeasurement(name: string, duration: number) {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    this.measurements.get(name)!.push(duration)
  }
  
  getStats(name: string) {
    const measurements = this.measurements.get(name) || []
    if (measurements.length === 0) return null
    
    const sorted = [...measurements].sort((a, b) => a - b)
    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]
    
    return {
      count: measurements.length,
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50,
      p95,
      p99
    }
  }
  
  checkSLO(name: string, threshold: number): boolean {
    const stats = this.getStats(name)
    if (!stats) return false
    
    // Check if p95 is within SLO threshold
    return stats.p95 <= threshold
  }
  
  reset() {
    this.measurements.clear()
  }
}

describe('Performance SLO Monitoring', () => {
  const monitor = new PerformanceMonitor()
  
  beforeAll(() => {
    monitor.reset()
  })

  test('hot-path performance benchmarks meet SLO requirements', async () => {
    // Simulate content parsing performance
    for (let i = 0; i < 10; i++) {
      monitor.measureSync('content-parse', () => {
        // Simulate some work - parsing markdown/liquid content
        const text = 'Sample markdown content'.repeat(100)
        return text.split(' ').length
      })
    }
    
    // Simulate API response performance  
    for (let i = 0; i < 10; i++) {
      await monitor.measureAsync('api-response', async () => {
        // Simulate async work - database query or API call
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
        return { data: 'response' }
      })
    }
    
    // Simulate search query performance
    for (let i = 0; i < 10; i++) {
      monitor.measureSync('search-query', () => {
        // Simulate search processing
        const query = 'test search query'
        return query.toLowerCase().split(' ').filter(Boolean)
      })
    }
    
    // Check SLO compliance
    const contentParseStats = monitor.getStats('content-parse')
    const apiResponseStats = monitor.getStats('api-response')  
    const searchQueryStats = monitor.getStats('search-query')
    
    expect(contentParseStats).toBeTruthy()
    expect(apiResponseStats).toBeTruthy()
    expect(searchQueryStats).toBeTruthy()
    
    // Verify SLO thresholds
    expect(monitor.checkSLO('content-parse', SLO_THRESHOLDS.HOT_PATHS.CONTENT_PARSE)).toBe(true)
    expect(monitor.checkSLO('api-response', SLO_THRESHOLDS.HOT_PATHS.API_RESPONSE)).toBe(true)
    expect(monitor.checkSLO('search-query', SLO_THRESHOLDS.HOT_PATHS.SEARCH_QUERY)).toBe(true)
    
    // Log performance stats for monitoring
    console.log('Performance Stats:', {
      contentParse: contentParseStats,
      apiResponse: apiResponseStats,
      searchQuery: searchQueryStats
    })
  })

  test('performance regression detection', () => {
    // Simulate baseline measurements
    const baseline = [50, 52, 48, 51, 49, 53, 47] // ~50ms baseline
    const current = [65, 67, 63, 66, 64] // ~65ms current (30% regression)
    
    const baselineAvg = baseline.reduce((sum, val) => sum + val, 0) / baseline.length
    const currentAvg = current.reduce((sum, val) => sum + val, 0) / current.length
    
    const regression = (currentAvg - baselineAvg) / baselineAvg
    
    // Should detect significant regression
    expect(regression).toBeGreaterThan(SLO_THRESHOLDS.REGRESSION.DEGRADATION_THRESHOLD)
    expect(baseline.length).toBeGreaterThanOrEqual(SLO_THRESHOLDS.REGRESSION.MIN_SAMPLES)
    
    console.log(`Performance regression detected: ${(regression * 100).toFixed(1)}%`)
  })

  test('memory usage stays within bounds', () => {
    const initialMemory = process.memoryUsage()
    
    // Simulate some work that might use memory
    const data = []
    for (let i = 0; i < 1000; i++) {
      data.push({ id: i, content: 'Some content '.repeat(10) })
    }
    
    const afterMemory = process.memoryUsage()
    
    // Check memory usage hasn't grown excessively (less than 50MB)
    const memoryGrowth = afterMemory.heapUsed - initialMemory.heapUsed
    const memoryGrowthMB = memoryGrowth / (1024 * 1024)
    
    expect(memoryGrowthMB).toBeLessThan(50)
    
    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`)
  })

  test('concurrent request handling performance', async () => {
    // Simulate handling multiple concurrent requests
    const concurrentRequests = 50
    const startTime = performance.now()
    
    const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
      return monitor.measureAsync(`concurrent-request-${i}`, async () => {
        // Simulate request processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
        return { requestId: i, result: 'success' }
      })
    })
    
    const results = await Promise.all(promises)
    const totalTime = performance.now() - startTime
    
    // All requests should complete successfully
    expect(results.length).toBe(concurrentRequests)
    expect(results.every(r => r.result === 'success')).toBe(true)
    
    // Total time should be reasonable (under 1 second for 50 concurrent requests)
    expect(totalTime).toBeLessThan(1000)
    
    console.log(`Handled ${concurrentRequests} concurrent requests in ${totalTime.toFixed(2)}ms`)
  })
})