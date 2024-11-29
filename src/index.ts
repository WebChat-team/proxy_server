// imports ================================================== //
import ProxyServer, { checkAuth } from "./lib/proxy_server";

// main ===================================================== //
const server = new ProxyServer({ "*": ".*" });
const { IP, PORT , AUTH_SERVER_ADDRESS, USER_SERVER_ADDRESS} = process.env;

server
    .from(USER_SERVER_ADDRESS!)
        .listen("/user/[>](register|login)")
        .listen("/user/[>][*]", [checkAuth]);

server.listen("/auth/[>][*]", AUTH_SERVER_ADDRESS!);

server.launch(IP!, Number(PORT!));