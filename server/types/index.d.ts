declare module 'cookie-parser';

// Adding explicit type definitions for Express
declare module 'express' {
  import * as http from 'http';
  
  export interface Request extends http.IncomingMessage {
    body: any;
    cookies: { [key: string]: string };
    query: { [key: string]: string };
    params: { [key: string]: string };
  }
  
  export interface Response extends http.ServerResponse {
    json: (body: any) => Response;
    status: (code: number) => Response;
    send: (body: any) => Response;
    cookie: (name: string, value: string, options?: any) => Response;
  }
  
  export interface NextFunction {
    (err?: any): void;
  }
  
  export interface Express {
    use: (...args: any[]) => Express;
    get: (path: string, handler: (req: Request, res: Response, next?: NextFunction) => void) => Express;
    post: (path: string, handler: (req: Request, res: Response, next?: NextFunction) => void) => Express;
    put: (path: string, handler: (req: Request, res: Response, next?: NextFunction) => void) => Express;
    delete: (path: string, handler: (req: Request, res: Response, next?: NextFunction) => void) => Express;
  }
  
  export function json(): (req: Request, res: Response, next: NextFunction) => void;
  export function urlencoded(options: { extended: boolean }): (req: Request, res: Response, next: NextFunction) => void;
  export function static(root: string, options?: any): (req: Request, res: Response, next: NextFunction) => void;
  
  export default function(): Express;
};