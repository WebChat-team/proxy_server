// imports ================================================== //
import type { IncomingMessage, ServerResponse } from "http";

// main ===================================================== //
type ServerActionRequest = IncomingMessage & { body?: string } 
type ServerAction = (req: ServerActionRequest, res: ServerResponse) => Promise<any>

// exports ================================================== //
export type { ServerAction, ServerActionRequest };