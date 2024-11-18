// imoprts ================================================== //
// libs ----------------------------------------------------- //
import Router from "./router";
import { createServer } from "http";

// types ---------------------------------------------------- //
import type { RouterPath, RouterRules } from "./router";
import type { Server } from "http";
import type { ServerAction, ServerActionRequest } from "./types";

// main ===================================================== //
class ProxyServer {

  protected server: Server;
  protected isLaunch: boolean;
  protected router: Router;

  constructor(rulesRouter: RouterRules = {}) {
    this.server = createServer();
    this.isLaunch = false;
    this.router = new Router(rulesRouter);
  }

  proxy(from: string, to: string, authCallback?: ServerAction) {
    this.router.add("ALL", from, async (req, res) => {

      if (authCallback) await authCallback(req, res);

      if (!res.writableEnded && req.url) {

        const path = req.url.slice(from.lastIndexOf(".*") || from.length);
        const response_fetch = await fetch(
          to + path,
          {
            method: req.method,
            headers: req.headers as HeadersInit || undefined,
            body: req.body || undefined
          }
        );

        res.setHeaders(new Map(response_fetch.headers));
        res.writeHead(response_fetch.status);
        res.end(await response_fetch.text());

      }
    });
  }

  launch(ip: string, port: number) {
    if (!this.isLaunch) {

      this.isLaunch = true;

      console.log(`Server launch on: ${ip}:${port}`);

      this.server
        .listen(port, ip)
        .on("request", (req: ServerActionRequest, res) => {
          req.body = "";
          req
            .on("data", data => req.body += data.toString())
            .on("end", async () => await this.router.exec(req, res))
        })
        .on("close", () => console.log("Server is close"))
        .on("error", (error) => console.log(error));

    }
  }
  close() {
    if (this.isLaunch) {
      this.isLaunch = false;
      this.server.close();
    }
  }

}

// exports ================================================== //
export default ProxyServer;
export type { RouterPath, RouterRules };