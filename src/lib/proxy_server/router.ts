// imports ================================================== //
import type { MiddlewareProxyServer } from "./types";

// types ==================================================== //
interface RouterRules {
    [key: string]: string
}
interface RouterPaths {
    GET: { [key: string]: MiddlewareProxyServer[] },
    POST: { [key: string]: MiddlewareProxyServer[] },
    DELETE: { [key: string]: MiddlewareProxyServer[] },
    PUT: { [key: string]: MiddlewareProxyServer[] },
    PATCH: { [key: string]: MiddlewareProxyServer[] },
    OPTIONS: { [key: string]: MiddlewareProxyServer[] },
    TRACE: { [key: string]: MiddlewareProxyServer[] },
    CONNECT: { [key: string]: MiddlewareProxyServer[] },
    HEAD: { [key: string]: MiddlewareProxyServer[] },
    ALL: { [key: string]: MiddlewareProxyServer[] },
}
type RouterMethod = keyof RouterPaths

// main ===================================================== //
// Маршрутизатор сервера - его задача записывать, хранить и
// отдавать middlewares (промежуточные обработчики запроса) в
// соответствии с указаным url и методом http-запроса. При
// этом url представляет собой регулярное выражение, которое
// упрощается засчёт правил задаваемых при инициализации роутера
class Router {

    protected rules: RouterRules;
    protected paths: RouterPaths = {
        GET: {},
        POST: {},
        DELETE: {},
        PUT: {},
        PATCH: {},
        OPTIONS: {},
        TRACE: {},
        CONNECT: {},
        HEAD: {},
        ALL: {},
    };

    constructor(rules: RouterRules) {
        this.rules = rules;
    }

    add(method: keyof RouterPaths, url: string, middlewares: MiddlewareProxyServer[] = []) {

        // 1. заменяем [name_rules] на правило нашего роутера
        let reqexp_url = url;
        for (let key in this.rules) {
            // @ts-ignore: key is keyof this.rules
            reqexp_url = reqexp_url.replace(`[${key}]`, this.rules[key]);
        }

        // 2. заносим url в нашу "таблицу маршрутизации"
        this.paths[method][`^${reqexp_url}$`] = middlewares;

    }

    get(url: string, method: keyof RouterPaths) {

        const searchMiddlewares = {
            ...this.paths[method],
            ...this.paths["ALL"]
        };

        const middlewares: MiddlewareProxyServer[] = []; 

        for (let rule in searchMiddlewares) {
            if (new RegExp(rule).test(url)) {
                middlewares.push(...searchMiddlewares[rule]);
                break;
            }
        }

        return middlewares;

    }

}

// exports ================================================== //
export default Router;
export type { RouterRules, RouterMethod }