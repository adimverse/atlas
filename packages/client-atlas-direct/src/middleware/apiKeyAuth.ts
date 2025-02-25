import type { NextFunction, Request, Response, RequestHandler } from "express"

const apiKey = process.env.DIRECT_CLIENT_API_KEY as string | undefined
export function makeApiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestKey = req.headers["x-api-key"] as string | undefined

    // If no API key is set in the config, or if the request is against the health check route, skip checking
    if (!apiKey || req.url === '/hello') {
      next()
      return
    }

    // If the provided key does not match, respond with 401 Unauthorized
    if (!requestKey || requestKey !== apiKey) {
      res.status(401).json({ error: "Unauthorized: Invalid API key" })
      return
    }

    next()
    return
  }
