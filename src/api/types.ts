export interface ApiRoute {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  handler: (req: ApiRequest) => Promise<ApiResponse>
  auth?: boolean
}

export interface ApiRequest {
  body?: unknown
  params: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
}

export interface ApiResponse {
  code: number
  msg: string
  data?: unknown
}

export interface ApiConfig {
  port: number
  authKey: string
  enabled: boolean
}