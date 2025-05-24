declare namespace NodeJS {

    interface ProcessEnv {

        // server
        readonly PORT: number
        readonly HOSTNAME: string

        // @ts-ignore
        readonly MODE: "development" | "production"

        // protected apis
        readonly AUTH_SERVER: string
        readonly USER_SERVER: string
        readonly S3_STORAGE_ADDRESS: string

    }

}