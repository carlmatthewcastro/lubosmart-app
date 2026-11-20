// Isolated component fixture: never connects to the application database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

(async () => {
    const { build } = await import('vite');
    const { default: react } = await import('@vitejs/plugin-react');
    const { default: tailwind } = await import('@tailwindcss/vite');
    const output = path.resolve('../.tools/development-artifacts/storage-app/workflow-ui-check');
    fs.mkdirSync(output, { recursive: true });
    const fixture = path.join(output, 'fixture.tsx');
    fs.writeFileSync(
        fixture,
        `
import React from 'react';
import { createRoot } from 'react-dom/client';
import ProgressStepper from '@/components/shared/progress-stepper';
import '${path.resolve('resources/css/app.css').replaceAll('\\', '/')}';
const states = ['completed', 'current', 'pending', 'failed', 'cancelled'];
const stages = states.map((state, i) => ({ id: String(i), state, label: ['Completed preparation', 'In transit', 'Awaiting recipient', 'Delivery issue', 'Cancelled request'][i], description: 'Recorded workflow condition', motion: 'truck' }));
document.documentElement.classList.toggle('dark', location.search.includes('dark'));
createRoot(document.getElementById('root')).render(<main className="bg-background text-foreground p-4">
{['horizontal', 'vertical', 'responsive'].map(layout => <ProgressStepper key={layout} stages={stages} layout={layout} variant="detailed" label={layout} />)}
<ProgressStepper stages={stages.slice(0, 4)} label="compact" />
</main>);
setTimeout(() => {
 const root = document.documentElement;
 const node = document.querySelector('.workflow-node');
 node.focus();
 const focused = document.activeElement === node;
 setTimeout(() => parent.postMessage({ width: innerWidth, theme: root.className, overflow: root.scrollWidth > innerWidth, nodes: document.querySelectorAll('.workflow-node').length, focused, tooltip: !!document.querySelector('[role=tooltip]'), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, animation: getComputedStyle(document.querySelector('[data-state=current] .workflow-node'), '::before').animationName }, '*'), 350);
}, 100);
`,
    );
    await build({
        configFile: false,
        define: { 'process.env.NODE_ENV': JSON.stringify('production') },
        plugins: [react(), tailwind()],
        resolve: { alias: { '@/components': path.resolve('resources/views/components'), '@': path.resolve('resources/js') } },
        esbuild: { jsx: 'automatic' },
        build: {
            outDir: path.join(output, 'build'),
            emptyOutDir: false,
            lib: { entry: fixture, name: 'WorkflowFixture', cssFileName: 'fixture', formats: ['iife'], fileName: () => 'fixture.js' },
        },
    });
    const css = fs.readdirSync(path.join(output, 'build')).find((name) => name.endsWith('.css'));
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'text/html');
        if (req.url.startsWith('/fixture.js') || req.url.startsWith('/style.css')) {
            const isCss = req.url.startsWith('/style.css');
            res.setHeader('Content-Type', isCss ? 'text/css' : 'text/javascript');
            res.end(fs.readFileSync(path.join(output, 'build', isCss ? css : 'fixture.js')));
        } else if (req.url.startsWith('/frame')) {
            res.end(
                '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
            );
        } else {
            res.end(`<html><body><pre id="result">Pending</pre><script>
const results=[], plans=[];for(const width of [320,768,1440])for(const theme of ['light','dark'])plans.push({width,theme});
function next(){const plan=plans.shift();if(!plan){document.getElementById('result').textContent=JSON.stringify(results);return;} const frame=document.createElement('iframe');frame.style.width=plan.width+'px';frame.style.height='1600px';frame.src='/frame?'+plan.theme;document.body.append(frame);}
addEventListener('message',event=>{results.push(event.data);next()});next();
</script></body></html>`);
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(
        fs.existsSync,
    );
    assert.ok(browser, 'Chrome or Edge is required');
    try {
        for (const reduced of [false, true]) {
            const args = [
                '--headless=new',
                '--no-sandbox',
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions',
                '--disable-background-networking',
                '--dump-dom',
                '--virtual-time-budget=15000',
                `--user-data-dir=${path.join(output, reduced ? 'profile-reduced' : 'profile-normal')}`,
            ];
            if (reduced) args.push('--force-prefers-reduced-motion');
            args.push(`http://127.0.0.1:${server.address().port}`);
            const child = spawn(browser, args, { windowsHide: true });
            let html = '';
            child.stdout.on('data', (data) => (html += data));
            await new Promise((resolve, reject) => {
                child.on('error', reject);
                child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Browser exited ${code}`))));
            });
            fs.writeFileSync(path.join(output, reduced ? 'reduced.html' : 'normal.html'), html);
            const results = JSON.parse(html.match(/<pre id="result">(.*?)<\/pre>/s)?.[1] ?? 'null');
            assert.equal(results?.length, 6, 'All width/theme fixtures must report');
            for (const result of results) {
                assert.equal(result.overflow, false, JSON.stringify(result));
                assert.equal(result.nodes, 19);
                assert.equal(result.focused, true);
                assert.equal(result.tooltip, true);
                assert.equal(result.reduced, reduced);
                if (reduced) assert.equal(result.animation, 'none');
            }
            console.log(`${reduced ? 'Reduced' : 'Normal'} motion: 320/768/1440px, light/dark, no overflow, keyboard tooltip passed`);
        }
    } finally {
        server.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
