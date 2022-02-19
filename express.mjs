import fs from 'fs';
import path from 'path';
import express from 'express';
import ServeStatic from 'serve-static';
import {createServer as createViteServer} from 'vite';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

export async function createServer(root = process.cwd(), isProd = process.env.NODE_ENV === 'production') {
  const resolve = (p) => path.resolve(__dirname, p)

  const indexProd = isProd ? fs.readFileSync(resolve('dist/index.html'), 'utf-8') : ''

  const app = express()

  const range = (start, end) => new Array(end - start).fill(0).map((_, idx) => start + idx);

  // TODO - Move to router file
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const listeners = [];
  app.get('/api/foo', async (req, res) => {
    const listener = {req: req, res: res};
    listeners.push(listener);
    req.once('close', function () {
      console.log('done request');
      listeners.splice(listeners.indexOf(listener), 1);
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    res.write("start\0");
    for (const seconds of range(0, 60)) {
      await sleep(seconds * 1000);
      res.write(seconds + " seconds later\0");
    }
    res.write("end\0");

    res.end()
  });

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite
  if (!isProd) {
    vite = await createViteServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: 'ssr',
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100
        }
      }
    })
    // use vite's connect instance as middleware
    app.use(vite.middlewares)

    app.use('*', async (req, res) => {
      try {
        const url = req.originalUrl

        let template, render
        if (!isProd) {
          // always read fresh template in dev
          template = fs.readFileSync(resolve('index.html'), 'utf-8')
          template = await vite.transformIndexHtml(url, template)
          render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render
        } else {
          template = indexProd
          render = (await import('./dist/server/entry-server.js')).render
        }

        const context = {}
        const appHtml = render(url, context)

        if (context.url) {
          // Somewhere a `<Redirect>` was rendered
          return res.redirect(301, context.url)
        }

        const html = template.replace(`<!--app-html-->`, appHtml)

        res.status(200).set({'Content-Type': 'text/html'}).end(html)
      } catch (e) {
        !isProd && vite.ssrFixStacktrace(e)
        console.log(e.stack)
        res.status(500).end(e.stack)
      }
    })
  } else {
    app.use(new ServeStatic('./dist', {index: 'index.html'}))
  }

  return {app, vite}
}

if (!isTest) {
  createServer().then(({app}) => {
    const port = process.env.PORT || 3000
    return app.listen(port, () => {
      console.log('http://localhost:' + port)
    })
  })
}

