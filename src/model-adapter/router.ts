import type { ModelRoute } from './types'

export class ModelRouter {
  private routes: ModelRoute[] = []

  registerRoute(route: ModelRoute): void {
    this.routes.push(route)
    this.routes.sort((a, b) => b.priority - a.priority)
  }

  unregisterRoute(model: string): void {
    this.routes = this.routes.filter(r => r.model !== model)
  }

  selectAdapter(model: string): string | null {
    const matching = this.routes.filter(r => r.model === model)
    if (matching.length === 0) return null

    // Weighted random selection
    const totalWeight = matching.reduce((sum, r) => sum + r.weight, 0)
    let random = Math.random() * totalWeight

    for (const route of matching) {
      random -= route.weight
      if (random <= 0) return route.adapter
    }

    return matching[0].adapter
  }

  getRoutes(): ModelRoute[] {
    return [...this.routes]
  }
}