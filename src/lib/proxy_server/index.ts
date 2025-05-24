// imoprts ================================================== //
// libs ----------------------------------------------------- //
import Router from "./router";
import { createServer } from "http";
import { getSetToMiddleware, notFound, proxing, checkAuth, parseCookie, debug } from "./auxiliaryMiddlewares";

// types ---------------------------------------------------- //
import type { RouterRules } from "./router";
import type { Server, ServerResponse } from "http";
import type { MiddlewareProxyServer, ProxyServerRequest, ConfigProxyServer } from "./types";

// main ===================================================== //
// Proxy-сервер - сервер, основной задачей которого является
// проксирование запросов, исходя из:
// 1. указываемых путях (from, to)
// 2. middlewares - промежуточных обработчиков запроса (есть
// как специлизированные, так и пользовательские)
//
// Принцип работы (упрощено):
// 1. Получаем запрос от клиента
// 2. Находим все связанные с получаемым запросом middlewares
// (PS: в их число входят "системные/серверные" обработчики,
// например: notFound, proxing и т.п.)
// 3. Выполняем все middlewares пока не закончатся или не 
// получим ответ на запрос от сервера или обработчика
// 4. Если дошли до этого пункта возращаем notFound: 404 code
// 
// PS: Запись обработчиков (middlewares) в "маршрутизатор сервер"
// происходит посредством метода proxy. Как вы можете заметить
// можно расширить функционал по добавлению, но пока нет в этом
// потребности
class ProxyServer {

  private server: Server;
  private isLaunch: boolean;
  private router: Router;
  private config: ConfigProxyServer = { mode: "production" };

  constructor(rulesRouter: RouterRules = {}, mainConfig: Partial<ConfigProxyServer>) {
    this.server = createServer();
    this.isLaunch = false;
    this.router = new Router(rulesRouter);
    this.config = Object.assign(this.config, mainConfig);
  }

  private requestProcessing(requestProxy: ProxyServerRequest, responseProxy: ServerResponse) {
    requestProxy.body = "";
    requestProxy
      .on("data", data => requestProxy.body += data.toString())
      .on("end", async () => {

        const routeMiddlewares = this.router.get(requestProxy.url, requestProxy.method);
        if (routeMiddlewares.length) {
          for (const middleware of [...routeMiddlewares, proxing]) {
            try {
              await middleware(requestProxy, responseProxy);
              if (responseProxy.writableEnded) return;
            } catch (error) {
              console.error(`Middleware error: ${error}`);
              responseProxy
                .writeHead(500)
                .end("Internal Server Error");
            }
          }
        }

        notFound(requestProxy, responseProxy);

      });
  }

  // работа с запросами
  public from(to: string) {

    return {
      listen: (from: string, userMiddlewares: MiddlewareProxyServer[] = []) => {
        this.listen(from, to, userMiddlewares);
        return this.from(to);
      }
    };

  }
  public listen(from: string, to: string, userMiddlewares: MiddlewareProxyServer[] = []) {
    const systemMiddlewares = [getSetToMiddleware(from, to), parseCookie];
    if (this.config.mode === "development") systemMiddlewares.unshift(debug);

    // PS: специальный символ обозначающий начало основного пути [>] убираем из from
    this.router.add("ALL", from.replace("[>]", ""), [...systemMiddlewares, ...userMiddlewares]);
  }

  // управление сервером
  public launch(hostname: string, port: number) {

    if (!this.isLaunch) {

      this.isLaunch = true;

      console.info(`Server running at http://${hostname}:${port}/`);

      this.server
        .listen(port, hostname)
        .on("request", (requestProxy: ProxyServerRequest, responseProxy) => { this.requestProcessing(requestProxy, responseProxy); })
        .on("close", () => console.info("Server is close"))
        .on("error", (error) => console.error(error));

    }

  }
  public close() {
    if (this.isLaunch) {
      this.isLaunch = false;
      this.server.close();
    }
  }

}

// exports ================================================== //
export default ProxyServer;
export type { RouterRules };
export { checkAuth };