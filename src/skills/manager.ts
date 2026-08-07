import type { SkillDefinition, SkillInstance, SkillOutput } from './types'

export class SkillsManager {
  private skills: Map<string, SkillInstance> = new Map()
  private definitions: Map<string, SkillDefinition> = new Map()

  registerSkill(instance: SkillInstance): void {
    const { id } = instance.definition
    if (this.skills.has(id)) {
      console.warn(`[Skills] Skill ${id} already registered`)
      return
    }
    this.skills.set(id, instance)
    this.definitions.set(id, instance.definition)
    console.log(`[Skills] Registered: ${instance.definition.name} v${instance.definition.version}`)
  }

  unregisterSkill(skillId: string): void {
    this.skills.delete(skillId)
    this.definitions.delete(skillId)
    console.log(`[Skills] Unregistered: ${skillId}`)
  }

  getSkill(skillId: string): SkillInstance | undefined {
    return this.skills.get(skillId)
  }

  getDefinition(skillId: string): SkillDefinition | undefined {
    return this.definitions.get(skillId)
  }

  getSkills(): SkillDefinition[] {
    return Array.from(this.definitions.values())
  }

  getEnabledSkills(): SkillDefinition[] {
    return this.getSkills().filter(s => s.enabled)
  }

  setEnabled(skillId: string, enabled: boolean): void {
    const def = this.definitions.get(skillId)
    if (def) {
      def.enabled = enabled
    }
  }

  async executeSkill(skillId: string, input: Record<string, unknown>): Promise<SkillOutput> {
    const skill = this.skills.get(skillId)
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`)
    }
    if (!skill.definition.enabled) {
      throw new Error(`Skill is disabled: ${skill.definition.name}`)
    }

    // Validate input if validator exists
    if (skill.validate) {
      const error = skill.validate(input)
      if (error) {
        throw new Error(`Invalid input: ${error}`)
      }
    }

    return skill.execute(input)
  }

  async installFromMarketplace(skillId: string): Promise<boolean> {
    // In production, this would download and register from skill marketplace
    console.log(`[Skills] Installing from marketplace: ${skillId}`)
    return true
  }

  async importLocalSkill(filePath: string): Promise<boolean> {
    // In production, this would load a skill from a local file
    console.log(`[Skills] Importing local skill: ${filePath}`)
    return true
  }
}