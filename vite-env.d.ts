/// <reference types="vite/client" />

interface ImportMetaEnv {

  // server
  readonly PORT: number
  readonly IP: number

  // protected apis
  readonly AUTH_SERVER: string
  readonly USER_SERVER: string

}

interface ImportMeta {
  readonly env: ImportMetaEnv
}