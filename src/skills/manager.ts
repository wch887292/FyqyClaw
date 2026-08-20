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
    // 技能市场尚未接入：如实返回未安装，避免误导用户以为已安装成功
    console.warn(`[Skills] 技能市场未接入，无法安装: ${skillId}`)
    return false
  }

  async importLocalSkill(filePath: string): Promise<boolean> {
    // 本地技能导入尚未接入：如实返回未导入，避免误导用户
    console.warn(`[Skills] 本地技能导入未接入: ${filePath}`)
    return false
  }
}