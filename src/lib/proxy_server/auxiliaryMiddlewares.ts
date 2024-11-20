// imports ================================================== //
import type { IncomingHttpHeaders } from "http";
import type { MiddlewareProxyServer } from "./types";

// types ==================================================== //
type setToType = (from: string, to: string) => MiddlewareProxyServer

// main ===================================================== //
// middlewares без внешних зависимостей
const proxing: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    try {

        // 1. запрос указанному серверу
        const responseFromServer = await fetch(
            requestProxy.to,
            {
                method: requestProxy.method,
                credentials: "include",
                headers: getSendHeaders(requestProxy.headers) as HeadersInit || undefined,
                body: requestProxy.body || undefined
            }
        );

        // 2. возврат ответа от сервера клиенту
        const headers = Object.fromEntries(responseFromServer.headers);
        responseProxy.writeHead(responseFromServer.status, getSendHeaders(headers));
        responseProxy.end(await responseFromServer.text());

    } catch (error) {
        console.error("Error during proxying:", error);
        responseProxy
            .writeHead(502, { "Content-Type": "text/plain" })
            .end("Bad Gateway")
    }

    function getSendHeaders(headers: IncomingHttpHeaders) {

        let copy_headers = {...headers};

        delete copy_headers["content-encoding"];
        delete copy_headers["content-length"];
        delete copy_headers["host"];
        delete copy_headers["connection"];
        delete copy_headers["cache-control"];
        copy_headers["origin"] = "http://api.webchat.com";

        return copy_headers;

    }

};
const notFound: MiddlewareProxyServer = async (requestProxy, responseProxy) => {
    responseProxy
        .writeHead(404)
        .end();
};
const getSetToForRequestProxy: setToType = (from, to) => {

    return async function (requestProxy, responseProxy) {
        let lastIndexWire = from.lastIndexOf("[*]");
        if (lastIndexWire !== -1) {
            requestProxy.to = to + "/" + requestProxy.url.slice(lastIndexWire);
        } else {
            requestProxy.to = to;
        }
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

// middlewares с внешними зависимостями
const checkAuth: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    // 1. проверка наличия и подлинности access токена
    const accessToken = requestProxy.cookie.get("access_token");
    if (accessToken) {

        const responseAuthServer = await fetch(
            process.env.AUTH_SERVER_ADDRESS + "/is_valid_access_token.php",
            {
                method: "GET",
                headers: {
                    "Origin": "http://api.webchat.com",
                    "Authorization": `Bearer ${accessToken}`
                }
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
                    "Origin": "http://api.webchat.com",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            }
        );

        if (responseAuthServer.ok) {
            responseProxy.setHeader("set-cookie", responseAuthServer.headers.getSetCookie());
            return;
        }

    }

    // 3. отклоняем запрос и возвращаем Forbidden 403 с удаленными куками
    responseProxy
        .writeHead(
            403, "Forbidden",
            {
                "set-cookie": [
                    `access_token = null; domain = .webchat.com; HttpOnly; path = /; max-age = 0;`,
                    `refresh_token = null; domain = .webchat.com; HttpOnly; path = /; max-age = 0;`,
                ]
            }
        )
        .end("Forbidden 403");


};

// exports ================================================== //
export { proxing, notFound, getSetToForRequestProxy, checkAuth, parseCookie };