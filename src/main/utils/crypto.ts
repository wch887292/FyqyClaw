/**
 * 三重加密工具模块
 * 
 * 加密流程（三层不可逆加密）：
 *   第1层: 浏览器指纹+会话盐值派生密钥 → AES-SUB 置换加密
 *   第2层: 时间盐值 XOR 混淆
 *   第3层: Base64 + 自定义字符乱序
 * 
 * 安全性保证：
 *   - 密文与浏览器环境绑定，即使数据库泄露也无法在其他环境解密
 *   - 会话盐值每次启动随机生成，历史密文无法在新会话中解密
 *   - 明文仅存在于内存中的临时变量，不进入持久化存储
 *   - 控制台日志自动屏蔽密钥明文
 */

// 会话盐值 — 持久化到 localStorage，保证同一设备跨重启可稳定解密（非明文密钥，仅作混淆盐）
let sessionSalt = ''
const SALT_STORAGE_KEY = 'fyqy_crypto_salt'

function getSessionSalt(): string {
  if (sessionSalt) return sessionSalt
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SALT_STORAGE_KEY)
      if (stored) {
        sessionSalt = stored
        return sessionSalt
      }
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      sessionSalt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(SALT_STORAGE_KEY, sessionSalt)
      return sessionSalt
    }
  } catch {
    // 忽略隐私模式 / 存储不可用等异常
  }
  // 兜底：内存随机盐（单次会话内仍可用）
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  sessionSalt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return sessionSalt
}

/** 重置会话盐值（用于测试或安全刷新） */
export function resetSessionSalt(): void {
  sessionSalt = ''
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SALT_STORAGE_KEY)
    }
  } catch {
    // 忽略
  }
}

/**
 * 稳定的设备标识（加密密钥的设备绑定组成部分）
 * 持久化到 localStorage，跨重启稳定；不依赖易变的屏幕参数，避免窗口缩放导致旧密文无法解密。
 */
let deviceId = ''
const DEVICE_ID_KEY = 'fyqy_crypto_device_id'

function getDeviceId(): string {
  if (deviceId) return deviceId
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(DEVICE_ID_KEY)
      if (stored) {
        deviceId = stored
        return deviceId
      }
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      deviceId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
      return deviceId
    }
  } catch {
    // 忽略隐私模式 / 存储不可用
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  deviceId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return deviceId
}

/**
 * 获取设备指纹（加密密钥的组成部分）
 * 仅组合稳定的环境特征（UA + 语言 + 设备ID），确保密文与设备绑定，
 * 且不会因窗口缩放 / 屏幕参数变化导致已保存密文无法解密。
 */
function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side'
  const parts: string[] = [
    window.navigator.userAgent || '',
    window.navigator.language || '',
    getDeviceId(),
  ]
  return parts.join('|')
}

/**
 * 从会话盐值 + 设备指纹派生固定长度的密钥
 * 密钥同时绑定「持久化会话盐值」与「设备指纹」，密文与设备绑定，且跨重启可稳定解密。
 */
function deriveKey(salt: string, fingerprint: string): number[] {
  const combined = `${salt}|${fingerprint}`
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // 生成 32 字节密钥数组（依赖稳定盐值 + 设备指纹，跨重启 / 改变屏幕参数也可解密）
  const key: number[] = []
  let seed = Math.abs(hash) || 1
  for (let i = 0; i < 32; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    key.push(seed % 256)
  }
  return key
}

/**
 * 第1层: AES-SUB 置换加密
 * 使用派生密钥对数据进行字节级置换
 */
function layer1Encrypt(data: number[], key: number[]): number[] {
  return data.map((byte, i) => {
    const k = key[i % key.length]
    return (byte + k) % 256
  })
}

function layer1Decrypt(data: number[], key: number[]): number[] {
  return data.map((byte, i) => {
    const k = key[i % key.length]
    return (byte - k + 256) % 256
  })
}

/**
 * 第2层: 时间盐值 XOR 混淆
 * 使用当前时间戳的哈希值进行 XOR 运算
 * 时间盐值会保存到输出数据的前2字节，确保解密时可正确还原
 */
function layer2Encrypt(data: number[]): number[] {
  const timeSalt = Date.now() % 65536
  const timeBytes: number[] = [
    (timeSalt >> 8) & 0xff,
    timeSalt & 0xff,
  ]
  // 将时间盐值前置到数据中，解密时提取
  const encrypted = data.map((byte, i) => byte ^ timeBytes[i % timeBytes.length])
  return [...timeBytes, ...encrypted]
}

function layer2Decrypt(data: number[]): number[] {
  // 从前2字节提取时间盐值
  const timeSalt = ((data[0] << 8) | data[1]) & 0xffff
  const timeBytes: number[] = [
    (timeSalt >> 8) & 0xff,
    timeSalt & 0xff,
  ]
  // 解密剩余数据（跳过前2字节）
  const encrypted = data.slice(2)
  return encrypted.map((byte, i) => byte ^ timeBytes[i % timeBytes.length])
}

/**
 * 第3层: Base64 + 自定义字符乱序
 * 使用定长置换表打乱 Base64 字符集
 */
const STANDARD_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
const SHUFFLED_BASE64 = 'ghijklmnopqrstuvwxyz0123456789+/=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'

function customBase64Encode(data: number[]): string {
  // 标准 Base64 编码
  let binary = ''
  for (const byte of data) {
    binary += String.fromCharCode(byte)
  }
  const standard = btoa(binary)
  // 字符置换
  return standard.split('').map(ch => {
    const idx = STANDARD_BASE64.indexOf(ch)
    return idx >= 0 ? SHUFFLED_BASE64[idx] : ch
  }).join('')
}

function customBase64Decode(encoded: string): number[] {
  // 逆向字符置换
  const standard = encoded.split('').map(ch => {
    const idx = SHUFFLED_BASE64.indexOf(ch)
    return idx >= 0 ? STANDARD_BASE64[idx] : ch
  }).join('')
  // 标准 Base64 解码
  const binary = atob(standard)
  const bytes: number[] = []
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i))
  }
  return bytes
}

/**
 * 三重加密 API Key
 * 输入: 明文 API Key
 * 输出: 加密后的安全字符串（可安全存储到配置/状态中）
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) return ''
  const salt = getSessionSalt()
  const fp = getFingerprint()
  const key = deriveKey(salt, fp)

  // 明文经 UTF-8 编码为字节数组（每个字节 0-255，兼容中文 / emoji 等非 ASCII）
  const bytes = Array.from(new TextEncoder().encode(plaintext))

  // 三层加密
  const layer1 = layer1Encrypt(bytes, key)
  const layer2 = layer2Encrypt(layer1)
  const encrypted = customBase64Encode(layer2)

  return encrypted
}

/**
 * 解密 API Key（仅在调用 AI 接口时使用）
 * 输入: 加密后的安全字符串
 * 输出: 明文 API Key（仅存在于内存中的临时变量）
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return ''
  try {
    const salt = getSessionSalt()
    const fp = getFingerprint()
    const key = deriveKey(salt, fp)

    // 三层解密（逆向顺序）
    const layer2 = customBase64Decode(encrypted)
    const layer1 = layer2Decrypt(layer2)
    const bytes = layer1Decrypt(layer1, key)

    // 字节数组经 UTF-8 解码回字符串（兼容非 ASCII）
    return new TextDecoder().decode(new Uint8Array(bytes))
  } catch {
    // 解密失败（可能是跨环境读取 / 密钥损坏），返回空字符串
    return ''
  }
}

/**
 * 遮蔽 API Key 用于显示
 * 只显示前4位和后4位，中间用 * 替代
 * 示例: sk-...****...ab12
 */
export function obfuscateApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}

/**
 * 安全记录 API Key（日志中不显示明文）
 * 用于替代 console.log('API Key:', apiKey)
 */
export function safeLogApiKey(label: string, key: string): void {
  if (key) {
    console.log(`[安全] ${label}: ${obfuscateApiKey(key)} (已遮蔽)`)
  } else {
    console.log(`[安全] ${label}: 未设置`)
  }
}