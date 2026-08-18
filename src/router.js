function compile(path) {
  const keys = [];
  const escaped = path.split("/").map(part => {
    if (part.startsWith(":")) {
      keys.push(part.slice(1));
      return "([^/]+)";
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("/");
  return { re: new RegExp(`^${escaped}/?$`), keys };
}

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler) {
    const { re, keys } = compile(path);
    this.routes.push({ method: method.toUpperCase(), path, re, keys, handler });
    return this;
  }

  methodsFor(pathname) {
    return [...new Set(this.routes.filter(route => route.re.test(pathname)).map(route => route.method))];
  }

  async handle(request, ctx = {}) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = url.pathname.match(route.re);
      if (!match) continue;
      const params = {};
      try {
        route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
      } catch {
        return null;
      }
      return route.handler({ ...ctx, request, url, params });
    }
    return null;
  }
}
