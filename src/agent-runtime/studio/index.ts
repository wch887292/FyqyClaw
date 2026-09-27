/**
 * Studio（非技术用户工作台）模块公共导出。
 *
 * 用法（嵌入）：
 *   const studio = new Studio(runtime, { storeDir: 'D:/fyqy-data' })
 *   await studio.load()
 *   const emp = await studio.create({ name:'客服小飞', role:'customer-service', scenario:'…' })
 *   const r = await studio.tryRun(emp.id, '你们这款材料多少钱？')
 *
 * 用法（浏览器）：启动网关后打开 http://localhost:8787/studio
 */
export { Studio } from './studio'
export type { StudioBlueprints, StudioOptions } from './studio'
export {
  compileEmployee,
  normalizeDraft,
  validateDraft,
  StudioValidationError,
  type CompiledEmployee,
} from './studio-agent'
export {
  ROLE_BLUEPRINTS,
  OUTPUT_STYLES,
  CATEGORY_HINTS,
  CLEARANCE_HINTS,
  getBlueprint,
  getOutputTemplate,
} from './blueprints'
export { STUDIO_HTML } from './ui'
export type {
  DigitalEmployee,
  DigitalEmployeeDraft,
  GuidedResult,
  OutputStyle,
  RoleBlueprint,
  StudioRole,
  TryRunResult,
} from './types'
