// imports ================================================== //
import type { IncomingMessage, ServerResponse } from "http";
import { RouterMethod } from "./router";

// main ===================================================== //
type ProxyServerRequest = IncomingMessage & {
    body?: string,
    to: string,
    method: RouterMethod,
    url: string,
    cookie: Map<string, string> // расширяется засчет middleware parseCookies
} 
type MiddlewareProxyServer = (requestProxy: ProxyServerRequest, responseProxy: ServerResponse) => Promise<any>

// exports ================================================== //
export type { MiddlewareProxyServer, ProxyServerRequest };