/**
 * Studio 蓝图与选项 —— 把「角色 / 知识目录 / 输出风格」翻译成用户看得懂的白话选项。
 *
 * 这里是「零代码」的关键：用户只做选择题，prompt 与安全策略由蓝图提供。
 */
import type { KnowledgeCategory } from '../../knowledge-base/types'
import { CATEGORY_HINTS, CLEARANCE_HINTS } from '../../knowledge-base/types'
import type { OutputStyle, RoleBlueprint, StudioRole } from './types'

// 目录 / 密级的白话说明统一定义在知识库模块（避免两处维护），此处透出给 Studio 界面使用。
export { CATEGORY_HINTS, CLEARANCE_HINTS }

/** 角色蓝图：5 个内置角色 + 自定义。 */
export const ROLE_BLUEPRINTS: RoleBlueprint[] = [
  {
    role: 'customer-service',
    label: '客服应答',
    hint: '客户问产品、价格、交付、售后，它来答',
    suggestedName: '客服小飞',
    defaultCategories: ['产品', '客户'],
    defaultClearance: 'internal',
    defaultAllowExternal: true,
    externalAllowed: true,
    systemPrompt:
      '你是「{{name}}」，一名企业客服数字员工。任务场景：{{scenario}}\n' +
      '基于企业知识库，用友好、专业、简洁的语气回答客户咨询。' +
      '仅依据已知信息作答；遇到无法确认的事项，明确说明并引导转人工，不得编造或过度承诺。',
  },
  {
    role: 'contract',
    label: '合同审查',
    hint: '合同里的风险条款，它先过一遍',
    suggestedName: '合同审查小飞',
    defaultCategories: ['合同法务', '制度'],
    defaultClearance: 'internal',
    defaultAllowExternal: false,
    externalAllowed: false,
    systemPrompt:
      '你是「{{name}}」，一名企业合同审查数字员工。任务场景：{{scenario}}\n' +
      '基于合同法务知识库，识别合同中的风险条款（付款条件、违约责任、保密义务、知识产权、管辖争议），' +
      '给出风险等级（高/中/低）与具体修改建议。输出须结构化、可追溯，' +
      '并明确声明不替代律师正式法律意见。',
  },
  {
    role: 'invoice',
    label: '发票报销',
    hint: '发票合不合规、能不能报，它来核',
    suggestedName: '报销小飞',
    defaultCategories: ['制度'],
    defaultClearance: 'internal',
    defaultAllowExternal: false,
    externalAllowed: false,
    systemPrompt:
      '你是「{{name}}」，一名企业发票报销数字员工。任务场景：{{scenario}}\n' +
      '依据公司报销制度核验发票与单据的合规性：抬头与税号一致、类目在预算内、' +
      '金额与审批权限匹配、票据真实有效。输出「可报销 / 需补正」清单并标注原因；' +
      '对疑似不合规项直接指出，不替用户绕过制度。',
  },
  {
    role: 'resume',
    label: '简历筛选',
    hint: '按岗位要求给简历打分、写摘要',
    suggestedName: '招聘小飞',
    defaultCategories: ['制度', '培训'],
    defaultClearance: 'internal',
    defaultAllowExternal: false,
    externalAllowed: false,
    systemPrompt:
      '你是「{{name}}」，一名企业招聘简历筛选数字员工。任务场景：{{scenario}}\n' +
      '依据岗位 JD 与评分维度（匹配度、相关经验、稳定性、风险项）对候选人打分并输出摘要。' +
      '严格保护候选人隐私：不在结论外泄露身份证号、手机号等敏感字段；' +
      '对明显不匹配者给出明确淘汰理由，避免主观歧视。',
  },
  {
    role: 'marketing',
    label: '营销文案',
    hint: '朋友圈、公众号、短视频文案，它来写',
    note: '生成的营销内容如需外发，走第三方 MCP 通道（数字人/短视频），默认需人工确认，不自动发布',
    suggestedName: '文案小飞',
    defaultCategories: ['产品'],
    defaultClearance: 'public',
    defaultAllowExternal: true,
    externalAllowed: true,
    systemPrompt:
      '你是「{{name}}」，一名企业营销文案数字员工。任务场景：{{scenario}}\n' +
      '依据品牌调性、目标平台（朋友圈 / 公众号 / 短视频 / 电商详情）与合规红线，' +
      '生成可直接使用的多版本文案。严格遵守广告法：不夸大、不虚假承诺；' +
      '涉及数据须标注「以实际为准」；不生成诱导分享或违规话术。',
  },
  {
    role: 'custom',
    label: '自定义',
    hint: '以上都不合适？自己描述一个',
    suggestedName: '我的数字员工',
    defaultCategories: ['制度'],
    defaultClearance: 'internal',
    defaultAllowExternal: false,
    externalAllowed: false,
    systemPrompt:
      '你是「{{name}}」，一名企业数字员工。任务场景：{{scenario}}\n' +
      '基于企业知识库，专业、准确、简洁地完成该场景的工作。' +
      '仅依据已知信息作答；无法确认时如实说明，不得编造。',
  },
]

export function getBlueprint(role: StudioRole): RoleBlueprint {
  return ROLE_BLUEPRINTS.find((b) => b.role === role) ?? ROLE_BLUEPRINTS[ROLE_BLUEPRINTS.length - 1]
}

/** 输出风格 → 输出要求文本（用户不用写 prompt）。 */
export const OUTPUT_STYLES: { style: OutputStyle; label: string; hint: string; template: string }[] = [
  {
    style: 'concise',
    label: '简洁',
    hint: '结论先行，两三句话说完',
    template: '直接给出结论，控制在 3 句以内；必要时补 1~2 条要点。',
  },
  {
    style: 'structured',
    label: '结构化',
    hint: '分【结论】【依据】【建议】三段',
    template:
      '按【结论先行】/【依据（含知识库出处）】/【后续动作或待确认事项】三段输出。',
  },
  {
    style: 'friendly',
    label: '亲和口语',
    hint: '像同事聊天，适合直接发给客户',
    template: '用亲和、口语化的语气表达，避免术语；可直接复制发给客户或同事。',
  },
]

export function getOutputTemplate(style: OutputStyle): string {
  return OUTPUT_STYLES.find((s) => s.style === style)?.template ?? OUTPUT_STYLES[0].template
}

/* ------------------------------------------------------------------ */
/* 对话式引导的关键词表（确定性解析，无需模型，离线可用）               */
/* ------------------------------------------------------------------ */

export const ROLE_KEYWORDS: { role: StudioRole; words: string[] }[] = [
  { role: 'customer-service', words: ['客服', '售后', '咨询', '客户问', '答客户', '接待'] },
  { role: 'contract', words: ['合同', '法务', '条款', '协议', '风险审查'] },
  { role: 'invoice', words: ['报销', '发票', '单据', '费用', '财务核'] },
  { role: 'resume', words: ['简历', '招聘', '面试', '候选人', 'hr', 'HR'] },
  { role: 'marketing', words: ['文案', '营销', '推广', '朋友圈', '公众号', '短视频', '宣传'] },
]

export const CATEGORY_KEYWORDS: { category: KnowledgeCategory; words: string[] }[] = [
  { category: '制度', words: ['制度', '规章', '考勤', '报销制度', '员工手册', '审批'] },
  { category: '产品', words: ['产品', '报价', '价格', '交期', '服务条款'] },
  { category: '客户', words: ['客户', '合作', '订单', '纪要'] },
  { category: '培训', words: ['培训', '手册', '新人', '岗位', '操作规范'] },
  { category: '合同法务', words: ['合同', '法务', '条款', '模板'] },
]

export const EXTERNAL_KEYWORDS = ['对接', '外部系统', '外发', '同步到', '推到', '企业微信', '钉钉', '飞书']

export const STYLE_KEYWORDS: { style: OutputStyle; words: string[] }[] = [
  { style: 'concise', words: ['简洁', '简短', '几句话', '别啰嗦', '直接'] },
  { style: 'structured', words: ['结构化', '分点', '三段', '清单', '表格'] },
  { style: 'friendly', words: ['口语', '亲和', '聊天', '发给客户', '客气'] },
]
