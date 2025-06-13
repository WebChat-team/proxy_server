// imports ================================================== //
import ProxyServer, { checkAuth } from "./lib/proxy_server";

// main ===================================================== //
const { HOST, PORT , AUTH_SERVER_ADDRESS, USER_SERVER_ADDRESS, MODE, S3_STORAGE_ADDRESS } = process.env;
const server = new ProxyServer({ "*": ".*" }, { mode: MODE });

server
    .from(USER_SERVER_ADDRESS!)
        .listen("/user/[>](register|login)")
        .listen("/user/[>][*]", [checkAuth]);

server
    .from(S3_STORAGE_ADDRESS!)
        .listen("/video/[>][*]");

server.listen("/auth/[>][*]", AUTH_SERVER_ADDRESS!);

// @ts-ignore
server.launch(HOST, PORT);