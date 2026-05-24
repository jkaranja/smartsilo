type Resolver = (approved: boolean) => void

export class ApprovalChannel {
  private pending  = new Map<string, Resolver>()
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>()

  waitFor(approvalId: string, timeoutMs = 5 * 60 * 1000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pending.set(approvalId, resolve)

      const timer = setTimeout(() => {
        if (this.pending.has(approvalId)) {
          this.pending.delete(approvalId)
          this.timeouts.delete(approvalId)
          resolve(false)
        }
      }, timeoutMs)

      this.timeouts.set(approvalId, timer)
    })
  }

  resolve(approvalId: string, approved: boolean): void {
    const resolver = this.pending.get(approvalId)
    if (!resolver) return

    const timer = this.timeouts.get(approvalId)
    if (timer) {
      clearTimeout(timer)
      this.timeouts.delete(approvalId)
    }

    this.pending.delete(approvalId)
    resolver(approved)
  }

  cleanup(): void {
    for (const [id, resolver] of this.pending) {
      const timer = this.timeouts.get(id)
      if (timer) clearTimeout(timer)
      resolver(false)
    }
    this.pending.clear()
    this.timeouts.clear()
  }

  hasPending(): boolean {
    return this.pending.size > 0
  }
}
