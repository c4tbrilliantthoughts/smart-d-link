'use babel';

import path from 'path';
import fs from 'fs';
import url from 'url';
import { BufferedNodeProcess, CompositeDisposable, Disposable } from 'atom';
import { remote } from 'electron';
import JSON5 from 'json5';
import stripAnsi from 'strip-ansi';

const packageName = 'smart-d-link';
const packagePath = atom.packages.resolvePackagePath(packageName);
const liveServer = path.join(packagePath, '/node_modules/smart-live-server/live-server.js');

let serverProcess;
let disposeMenu;
let noBrowser;
let console = global.console;

function addStartMenu() {
  disposeMenu = atom.menu.add(
    [{
      label: 'Smart-D-Link',
      submenu : [{
        label: 'GO LIVE',
        submenu : [{
          label: 'Start smart-d-link',
          command: `atom-live-server:startServer`
        }]
      }]
    }]
  );
}

function usingDefaultConsole() {
  return console == global.console;
}

function safeStatus(status) {
  if(!usingDefaultConsole()) console.setStatus(status);
}

export default {
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-live-server:start-3000': () => this.startServer(3000),
      'atom-live-server:start-4000': () => this.startServer(4000),
      'atom-live-server:start-5000': () => this.startServer(5000),
      'atom-live-server:start-8000': () => this.startServer(8000),
      'atom-live-server:start-9000': () => this.startServer(9000),
      'atom-live-server:startServer': () => this.startServer(),
      'atom-live-server:stopServer': () => this.stopServer()
    }));

    addStartMenu();
  },

  deactivate() {
    this.stopServer();
    console.dispose();
    this.subscriptions.dispose();
  },

  consumeConsole(createConsole) {
    let mod = this;
    console = createConsole({
      id: 'atom-live-server',
      name: 'Live Server',
      start() { mod.startServer(); },
      stop() { mod.stopServer(); }
    });
    return new Disposable(() => { console = null; });
  },

  startServer(port = 5402) {
    if (serverProcess) {
      return;
    }

    safeStatus('starting');

    const targetPath = atom.project.getPaths()[0];

    if (!targetPath) {
      atom.notifications.addWarning('[Powered By C4TBT/SUMANTH.S] You haven\'t opened a Project, you must open one.')
      return;
    }

    noBrowser = false;
    const args = [];
    const stdout = output => {
      const strippedOutput = stripAnsi(output);

      if (strippedOutput.indexOf('Serving ') === 0) {
        const serverUrl = strippedOutput.split(' at ')[1];
        const port = url.parse(serverUrl).port;
        const disposeStartMenu = disposeMenu;
        disposeMenu = atom.menu.add(
          [{
            label: 'Smart-D-Link',
            submenu : [{
              label: 'GO LIVE',
              submenu : [{
                label: strippedOutput.replace('Serving ', 'Stop ').replace(/\r?\n|\r/g, ''),
                command: `atom-live-server:stopServer`
              }]
            }]
          }]
        );

        disposeStartMenu.dispose();
        safeStatus('running');

        if (noBrowser) {
          atom.notifications.addSuccess(`[Powered By C4TBT/SUMANTH.S] Smart-D-Link started at ${serverUrl}.`);
        }
      }

      if (usingDefaultConsole()) {
        console.log(`[Powered By C4TBT/SUMANTH.S] ${strippedOutput}`);
      } else {
        console.append({text: `[Powered By C4TBT/SUMANTH.S] ${output}`, level: 'log', format: 'ansi'});
      }

    };

    const exit = code => {
      console.info(`[Powered By C4TBT/SUMANTH.S] Exited with code ${code}`);
      this.stopServer();
    }

    fs.open(path.join(targetPath, '.atom-live-server.json'), 'r', (err, fd) => {
      if (!err) {
        const userConfig = JSON5.parse(fs.readFileSync(fd, 'utf8'));

        Object.keys(userConfig).forEach(key => {
          if (key === 'no-browser') {
            if (userConfig[key] === true) {
              args.push(`--${key}`);
              noBrowser = true;
            }
          }
          else if (key === 'root') {
              args.unshift(`${userConfig[key]}`)
            }
          else {
              args.push(`--${key}=${userConfig[key]}`);
          }
        });
      }

      if (!args.length) {
        args.push(`--port=${port}`);
      }

      serverProcess = new BufferedNodeProcess({
        command: liveServer,
        args,
        stdout,
        exit,
        options: {
          cwd: targetPath
        }
      });

      console.info(`[Powered By C4TBT/SUMANTH.S] Smart-D-Link ${args.join(' ')}`);
    });
  },

  stopServer() {
    try {
      serverProcess.kill();
    } catch (e) {
      console.error(e);
    }

    serverProcess = null;
    const disposeStopMenu = disposeMenu;
    addStartMenu();
    disposeStopMenu && disposeStopMenu.dispose();
    atom.notifications.addSuccess('[Powered By C4TBT/SUMANTH.S] Smart-D-Link is stopped.');
    console.info('[Powered By C4TBT/SUMANTH.S] Smart-D-Link is stopped.')
    safeStatus('stopped');
  }
};
