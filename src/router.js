function compile(path) {
  const keys = [];
  const escaped = path.split("/").map(part => {
    if (part.startsWith(":")) { keys.push(part.slice(1)); return "([^/]+)"; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("/");
  return { re: new RegExp(`^${escaped}/?$`), keys };
}

export class Router {
  constructor() { this.routes = []; }
  add(method, path, handler) {
    const { re, keys } = compile(path);
    this.routes.push({ method: method.toUpperCase(), re, keys, handler });
    return this;
  }
  async handle(request, ctx = {}) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = url.pathname.match(route.re);
      if (!m) continue;
      const params = {};
      route.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
      return route.handler({ ...ctx, request, url, params });
    }
    return null;
  }
}
