// imoprts ================================================== //
// libs ----------------------------------------------------- //
import Router from "./router";
import { createServer } from "http";
import { getSetToForRequestProxy, notFound, proxing, checkAuth, parseCookie } from "./auxiliaryMiddlewares";

// types ---------------------------------------------------- //
import type { RouterRules } from "./router";
import type { Server, ServerResponse } from "http";
import type { MiddlewareProxyServer, ProxyServerRequest } from "./types";

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

  constructor(rulesRouter: RouterRules = {}) {
    this.server = createServer();
    this.isLaunch = false;
    this.router = new Router(rulesRouter);
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

  public proxy(from: string, to: string, middlewares: MiddlewareProxyServer[] = []) {
    const setToMiddleware = getSetToForRequestProxy(from, to);
    this.router.add("ALL", from, [parseCookie, setToMiddleware, ...middlewares]);
  }
  public launch(ip: string, port: number) {
    if (!this.isLaunch) {

      this.isLaunch = true;

      console.info(`Server running at http://${ip}:${port}/`);

      this.server
        .listen(port, ip)
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