// imports ================================================== //
import type { MiddlewareProxyServer } from "./types";

// types ==================================================== //
type setToType = (from: string, to: string) => MiddlewareProxyServer

// main ===================================================== //
// middlewares без внешних зависимостей
const proxing: MiddlewareProxyServer = async (requestProxy, responseProxy) => {

    try {

        // request prepare
        delete requestProxy.headers["connection"];
        delete requestProxy.headers["host"];
        delete requestProxy.headers["content-length"];
        delete requestProxy.headers["cache-control"];
        requestProxy.headers["origin"] = "http://api.webchat.com";

        const responseFromServer = await fetch(
            requestProxy.to,
            {
                method: requestProxy.method,
                credentials: "include",
                headers: requestProxy.headers as HeadersInit || undefined,
                body: requestProxy.body || undefined
            }
        );

        console.log(responseFromServer.status);

        // response prepare
        const headers = Object.fromEntries(responseFromServer.headers);
        delete headers["content-encoding"];
        delete headers["content-length"];
        delete headers["host"];
        delete headers["connection"];

        responseProxy.writeHead(responseFromServer.status, headers);
        responseProxy.end(await responseFromServer.text());

    } catch (error) {
        console.error("Error during proxying:", error);
        responseProxy
            .writeHead(502, { "Content-Type": "text/plain" })
            .end("Bad Gateway")
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

    console.log(requestProxy.cookie);

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
            // {
            //     "set-cookie": [
            //         `access_token = null; domain = .webchat.com; HttpOnly; path = /;  max-age = 0;`,
            //         `refresh_token = null; domain = .webchat.com; HttpOnly; path = /;  max-age = 0;`,
            //     ]
            // }
        )
        .end("Forbidden 403");


};

// exports ================================================== //
export { proxing, notFound, getSetToForRequestProxy, checkAuth, parseCookie };