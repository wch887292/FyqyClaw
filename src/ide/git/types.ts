export interface GitStatus {
  branch: string
  changes: GitChange[]
  ahead: number
  behind: number
  staged: number
  unstaged: number
}

export interface GitChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
}