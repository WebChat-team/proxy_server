// imports ================================================== //
import type { IncomingHttpHeaders, OutgoingHttpHeader, ServerResponse } from "http";
import type { MiddlewareProxyServer } from "./types";
import parseSetCookie from "../parseSetCookie";
import { pipeline } from "stream";
import http from "http";
import { OutgoingHttpHeaders } from "http2";

// types ==================================================== //
type setToType = (from: string, to: string) => MiddlewareProxyServer

function convertSetCookieToCookie(setCookies: string[] = []) {
    return setCookies
      .map(cookie => {
        // Берем только первую часть до ';' (игнорируем атрибуты типа HttpOnly, Secure)
        const [keyValue] = cookie.split(';');
        return keyValue.trim();
      })
      .join('; ');
  }

// main ===================================================== //
// middlewares без внешних зависимостей
const proxing: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    try {

        if (requestProxy.headers['transfer-encoding'] === "chunked") {

            const { hostname, port, pathname } = new URL(requestProxy.to);

            const streamRequestProxy = http.request(
                {
                    hostname,
                    port,
                    path: pathname,
                    method: requestProxy.method,
                    headers: getSendHeaders(requestProxy.headers) as OutgoingHttpHeaders || undefined,
                }
            );

            pipeline(
                requestProxy,
                streamRequestProxy,
                (error) => {
                    if (error) {
                        console.error('Ошибка при проксировании:', error);
                        responseProxy.end();
                    }
                }
            )

        } else {

            // 1. запрос указанному серверу
            const responseFromServer = await fetch(
                requestProxy.to,
                {
                    method: requestProxy.method,
                    headers: getSendHeaders(requestProxy.headers) as HeadersInit || undefined,
                    body: requestProxy.body || undefined,
                }
            );

            // 2. возврат ответа от сервера клиенту
            const headers = Object.fromEntries(responseFromServer.headers);
            responseProxy.writeHead(
                responseFromServer.status,
                {
                    ...getSendHeaders(headers),
                    "set-cookie": splitAndGetSetCookieHeader(responseProxy, responseFromServer)
                }
            );

            // responseProxy.writeHead(responseFromServer.status, getSendHeaders(headers));
            responseProxy.end(await responseFromServer.text());

        }

    } catch (error) {
        console.error("Error during proxying:", error);
        responseProxy
            .writeHead(502, { "Content-Type": "text/plain" })
            .end("Bad Gateway")
    }

    // helpers
    function splitAndGetSetCookieHeader(responseProxy: ServerResponse, responseFromServer: Response) {

        const returnHeaderSetCookie = parseSetCookie(responseProxy.getHeader("set-cookie")?.toString() || "");
        const usedKeysCookies = new Set(returnHeaderSetCookie.map((cookie) => cookie.split("= ")[0].trim()));

        for (let cookie of responseFromServer.headers.getSetCookie()) {
            cookie = cookie.trim();
            if (!usedKeysCookies.has(cookie.split("= ")[0])) {
                returnHeaderSetCookie.push(cookie);
            }
        }

        return returnHeaderSetCookie;

    }
    function getSendHeaders(headers: IncomingHttpHeaders) {

        let copy_headers = { ...headers };

        delete copy_headers["content-encoding"];
        delete copy_headers["content-length"];
        delete copy_headers["host"];
        delete copy_headers["connection"];
        delete copy_headers["cache-control"];
        copy_headers["origin"] = `http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`;

        return copy_headers;

    }

};
const notFound: MiddlewareProxyServer = async (requestProxy, responseProxy) => {
    responseProxy
        .writeHead(404)
        .end();
};
const getSetToMiddleware: setToType = (from, to) => {

    return async function setToMiddleware(requestProxy, responseProxy) {
        requestProxy.to = to + "/" + requestProxy.url.slice(from.indexOf("[>]"));
    };

};
const parseCookie: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    const cookiesInString = requestProxy.headers.cookie || "";
    requestProxy.cookie = new Map<string, string>();

    for (const cookie of cookiesInString.split(";")) {
        const [nameCookie, valueCookie] = cookie.split("=");
        if (nameCookie && valueCookie) requestProxy.cookie.set(nameCookie.trim(), valueCookie.trim());
    }

};
const debug: MiddlewareProxyServer = async (requestProxy, responseProxy) => {
    console.info(requestProxy.url);
};

// middlewares с внешними зависимостями
const checkAuth: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    // 1. проверка наличия и подлинности access токена
    const accessToken = requestProxy.cookie.get("access_token");
    if (accessToken) {

        const responseAuthServer = await fetch(
            process.env.AUTH_SERVER_ADDRESS + "/is_valid_access_token.php",
            {
                method: "POST",
                headers: {
                    "Origin": `http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    access_token: accessToken 
                })
            }
        );

        if (responseAuthServer.ok) return;

    }

    // 2. проверка наличия и подлинности refresh токена. обновление токенов
    const refreshToken = requestProxy.cookie.get("refresh_token");
    if (refreshToken) {

        const responseAuthServer = await fetch(
            process.env.AUTH_SERVER_ADDRESS + "/update_tokens.php",
            {
                method: "POST",
                headers: {
                    "Origin": `http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            }
        );

        if (responseAuthServer.ok) {
            requestProxy.headers['set-cookie'] = responseAuthServer.headers.getSetCookie();
            requestProxy.headers['cookie'] = convertSetCookieToCookie(responseAuthServer.headers.getSetCookie());
            responseProxy.setHeader("set-cookie", responseAuthServer.headers.getSetCookie());
            return;
        }

    }

    // 3. отклоняем запрос и возвр responseProxy.setHeader("set-cookie", responseAuthServer.headers.getSetCookie());ащаем Forbidden 403 с удаленными куками
    responseProxy
        .writeHead(
            403, "Forbidden",
            {
                "Set-Cookie": [
                    // `access_token=; domain=.vision.com; HttpOnly; path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`,
                    // `refresh_token=; domain=.vision.com; HttpOnly; path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`,
                    `access_token=; HttpOnly; path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`,
                    `refresh_token=; HttpOnly; path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`,
                ],
            }
        )
        .end("Forbidden 403");


};

// exports ================================================== //
export { proxing, notFound, getSetToMiddleware, checkAuth, parseCookie, debug };