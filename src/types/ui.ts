export interface OnSuccessPayload {
  message?: string
  id?: string | number
  refresh?: boolean
  [k: string]: any
}

export type OnSuccessArg = OnSuccessPayload | string

export type OnSuccess = (payload: OnSuccessArg) => void
