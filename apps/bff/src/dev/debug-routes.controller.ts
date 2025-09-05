import { Controller, Get, Res } from '@nestjs/common';

@Controller('_debug')
export class DebugRoutesController {
  @Get('routes')
  list(@Res() res) {
    try {
      // Express adapter discovery
      const app = (global as any).__nest_app;
      const inst = app?.getHttpAdapter?.()?.getInstance?.();
      const stack = inst?._router?.stack || [];
      const routes = [];
      stack.forEach((l: any) => {
        if (l.route && l.route.path) {
          const methods = Object.keys(l.route.methods || {}).filter((k) => l.route.methods[k]);
          routes.push({ path: l.route.path, methods });
        } else if (Array.isArray(l.handle?.stack)) {
          l.handle.stack.forEach((s: any) => {
            if (s.route && s.route.path) {
              const methods = Object.keys(s.route.methods || {}).filter((k) => s.route.methods[k]);
              routes.push({ path: s.route.path, methods });
            }
          });
        }
      });
      return res.json({ ok: true, count: routes.length, routes });
    } catch (e) {
      return res.json({ ok: false, error: String(e) });
    }
  }
}
