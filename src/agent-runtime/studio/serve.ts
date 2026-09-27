/**
 * Studio 本地演示服务 —— 一条命令把工作台跑起来，浏览器直接体验。
 *
 *   npx tsx src/agent-runtime/studio/serve.ts
 *   然后打开 http://127.0.0.1:8799/studio
 *
 * 与正式网关的唯一区别：启动时往知识库塞了几条示例资料，
 * 让「试运行」能看到真实的知识库命中（否则会显示"无依据"）。
 * 示例资料是演示用，不落盘（未传 knowledgeDir）。
 */
import { startGateway } from '../hosts/gateway'
import { Studio } from './studio'
import type { KnowledgeBase } from '../../knowledge-base/knowledge-base'

const SAMPLES = [
  {
    category: '产品' as const,
    title: 'FyqyClaw 产品与报价说明',
    permission: 'public' as const,
    content:
      'FyqyClaw（飞扬企源AI）是本地私有化企业智能体平台，数据存于企业自有设备、不上公有云。\n' +
      '标准版授权 3.8 万元起，含客服应答、合同审查、发票报销、简历筛选、营销文案五个业务数字员工。\n' +
      '交付周期：签约后 5 个工作日内完成本地部署；售后提供 12 个月免费升级。\n' +
      '如客户已有金蝶 / 用友系统，平台以「AI 辅助 + 接口对接」方式协同，不替代其账务与供应链主流程。',
  },
  {
    category: '制度' as const,
    title: '差旅与费用报销制度',
    permission: 'internal' as const,
    content:
      '第一条 报销凭证须为发票或财政票据，抬头必须为公司全称，个人抬头的餐饮发票一律不予报销。\n' +
      '第二条 差旅住宿标准：一线城市不超过 500 元/晚，其他城市不超过 350 元/晚。\n' +
      '第三条 单笔报销 5000 元以上须经部门负责人与财务负责人双签。',
  },
  {
    category: '合同法务' as const,
    title: '采购合同审查要点',
    permission: 'internal' as const,
    content:
      '采购合同审查要点：一、核查对方主体资格与经营范围；二、明确标的、数量、质量与验收标准；\n' +
      '三、约定价款、支付方式与发票类型；四、关注违约责任与争议解决条款；\n' +
      '五、警惕预付款比例过高的条款，预付款一般不超过合同总额 30%。',
  },
]

async function main(): Promise<void> {
  // geoMaterialDir 指向仓库根的 GEO 物料（llms.txt / GEO-品牌事实页.md），让 T2.4 投喂技能真读物料
  // securityDir 让 T3 平台账号与审计落盘本地（零出境），重启后仍在
  const gw = await startGateway({
    port: 8799,
    host: '127.0.0.1',
    geoMaterialDir: 'H:/Fyqyclaw',
    securityDir: 'H:/Fyqyclaw/.platform-security',
  })

  const kb = gw.runtime.getService<KnowledgeBase>('knowledgeBase')
  if (kb) {
    for (const s of SAMPLES) await kb.ingest({ ...s, source: '演示数据' })
    const stats = kb.getStats()
    console.log(`已灌入示例知识：${stats.docCount} 篇 / ${stats.chunkCount} 块`)
  }

  // 预置一个数字员工，打开页面就有东西可试
  const studio = new Studio(gw.runtime)
  await gw.studio.create({
    name: '客服小飞',
    role: 'customer-service',
    scenario: '回答客户关于产品价格、交付周期与售后的咨询',
    categories: ['产品'],
    clearance: 'public',
    allowExternal: false,
    outputStyle: 'structured',
  })

  console.log('')
  console.log('  数字员工工作台已启动 →  http://127.0.0.1:' + gw.port + '/studio')
  console.log('  （按 Ctrl+C 停止）')
  console.log('')
}

main().catch((err) => {
  console.error('启动失败:', err)
  process.exit(1)
})
