// imports ================================================== //
import type { ServerResponse, IncomingMessage, Server } from "http";
import type { ServerAction } from "./types";

// types ==================================================== //
interface RouterRules {
    [key: string]: RegExp
}
interface RouterPath {
    GET: { [key: string]: ServerAction },
    POST: { [key: string]: ServerAction },
    DELETE: { [key: string]: ServerAction },
    PUT: { [key: string]: ServerAction },
    PATCH: { [key: string]: ServerAction },
    OPTIONS: { [key: string]: ServerAction },
    TRACE: { [key: string]: ServerAction },
    CONNECT: { [key: string]: ServerAction },
    HEAD: { [key: string]: ServerAction },
    ALL: { [key: string]: ServerAction },
}

// main ===================================================== //
class Router {

    protected rules: RouterRules;
    protected paths: RouterPath = {
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

    add(method: keyof RouterPath, url: string, callback: ServerAction) {

        // 1. заменяем [name_rules] на правило нашего роутера
        let reqexp_url = url;
        for (let key in this.rules) {
            // @ts-ignore: key is keyof this.rules
            reqexp_url = reqexp_url.replace(`[${key}]`, this.rules[key]);
        }

        // 2. заносим url в нашу "таблицу маршрутизации"
        this.paths[method][`^${reqexp_url}$`] = callback;

    }

    async exec(req: IncomingMessage, res: ServerResponse) {

        const { url, method } = req;

        let action = this.notFound;

        let urls = {
            ...this.paths[method as keyof typeof this.paths],
            ...this.paths["ALL"]
        };

        for (let reqexp_url in urls) {
            if (url && new RegExp(reqexp_url).test(url)) {
                action = urls[reqexp_url];
                break;
            }
        }

        // @ts-ignore
        res.notFound = this.notFound;
        await action(req, res);

    }

    notFound(req: IncomingMessage, res: ServerResponse) {
        res
            .writeHead(404)
            .end();
    }

}

// exports ================================================== //
export default Router;
export type { RouterRules, RouterPath }