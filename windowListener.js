// Copyright (C) 2019 O. Alperen Elhan
//
// This file is part of Minimize to Tray.
//
// Minimize to Tray is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
//
// Minimize to Tray is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Minimize to Tray.  If not, see <http://www.gnu.org/licenses/>.

const Shell = imports.gi.Shell;

const { logger, debounce } = mtt.imports.utils;
const { getApp, windowExists, showWindow, hideWindow } = mtt.imports.windowUtils;
const { AppWindow } = mtt.imports.appWindow;

const debug = logger('window-listener');

var WindowListener = class WindowListener {
  constructor() {
    debug('initialized');
    this.apps = [];
    this.appWindows = [];
  }

  enable() {
    this.apps = JSON.parse(mtt.settings.get_string('apps'));
    mtt.settings.connect('changed::apps', this._settingsChanged.bind(this));
    this.loadState();
    this._onUpdate();
    const onUpdate = debounce(this._onUpdate.bind(this), 250);

    this.windowMinimizeHandler = global.window_manager.connect('minimize', (_, win) =>
      this._onWindowMinimize.call(this, win.metaWindow),
    );
    this.windowDestroyHandler = global.window_manager.connect('destroy', onUpdate);
    this.windowCreateHandler = global.display.connect('window-created', onUpdate);
    this.windowChangeHandler = Shell.WindowTracker.get_default().connect(
      'tracked-windows-changed',
      onUpdate,
    );
  }

  disable() {
    Shell.WindowTracker.get_default().disconnect(this.windowChangeHandler);
    global.display.disconnect(this.windowCreateHandler);
    global.window_manager.disconnect(this.windowDestroyHandler);
    global.window_manager.disconnect(this.windowMinimizeHandler);
    this.appWindows.forEach(appWindow => appWindow.destroy());
    this.appWindows = [];
  }

  loadState() {
    debug('loading initial state');
    const initialState = JSON.parse(mtt.settings.get_string('current-state'));

    debug(`initial state: ${JSON.stringify(initialState)}`);

    initialState.forEach(({ pid, idInDec, hidden }) => {
      if (windowExists(pid, idInDec)) {
        showWindow(idInDec);
      }
    });
  }

  updateState() {
    debug('updating current state');
    const currentState = this.appWindows.map(appWin => ({
      pid: appWin.pid,
      idInDec: appWin.idInDec,
      hidden: appWin.hidden,
    }));
    debug(`new state: ${JSON.stringify(currentState)}`);
    mtt.settings.set_string('current-state', JSON.stringify(currentState));
  }

  _onUpdate() {
    const currentState = JSON.parse(mtt.settings.get_string('current-state'));
    this._cleanupWindows();
    let windows = global.get_window_actors();
    for (let i = 0; i < windows.length; i++) {
      let metaWindow = windows[i].metaWindow;

      let app = getApp(metaWindow);

      if (
        app !== null &&
        !app.is_window_backed() &&
        this.apps.some(curr => curr.name === app.get_name() && curr.state === 'enabled') &&
        this.appWindows.filter(appWin => metaWindow.get_pid() === appWin.pid).length === 0
      ) {
        const appWindow = new AppWindow(metaWindow);
        const isHidden = currentState.some(
          ({ pid, idInDec, hidden }) => metaWindow.get_pid() === pid && hidden === true,
        );
        if (isHidden) {
          appWindow.hidden = true;
        }
        this.appWindows.push(appWindow);
        debug(`added new window: ${appWindow}`);
        appWindow.attach();
        this.updateState();
      }
    }

    this._updateRunningApps();
  }

  _updateRunningApps() {
    const appNames = global
      .get_window_actors()
      .map(w => {
        const app = Shell.WindowTracker.get_default().get_window_app(w.metaWindow);
        if (app && app.get_name() && w.metaWindow.get_pid() !== -1) {
          return app.get_name();
        }
      })
      .filter(app => !!app);
    mtt.settings.set_string('running-apps', JSON.stringify([...new Set(appNames)]));
  }

  _onWindowMinimize(metaWindow) {
    const matchingWindows = this.appWindows.filter(appWin => metaWindow.get_pid() === appWin.pid);

    if (matchingWindows.length == 0) {
      return;
    }

    const foundWindow = matchingWindows[0];
    foundWindow.hide();
    this.updateState();
  }

  _cleanupWindows() {
    let shouldUpdateState = false;
    this.appWindows = this.appWindows.filter(appWin => {
      if (
        !windowExists(appWin.pid, appWin.idInDec) ||
        !this.apps.some(app => app.name === appWin.name && app.state === 'enabled')
      ) {
        debug(`removing window: ${appWin}`);
        shouldUpdateState = true;
        appWin.destroy();

        return false;
      }

      return true;
    });

    if (shouldUpdateState) {
      this.updateState();
    }
  }

  _settingsChanged(key) {
    debug(`settings changed.`);

    this.apps = JSON.parse(mtt.settings.get_string('apps'));
    debug(`apps: ${JSON.stringify(this.apps)}`);

    this._onUpdate();
  }
};
