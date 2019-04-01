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
const { getApp, windowExists, showWindow } = mtt.imports.windowUtils;
const { AppWindow } = mtt.imports.appWindow;

const debug = logger('window-listener');

var WindowListener = class WindowListener {
  constructor() {
    debug('initialized');
    this.apps = [];
    this.appWindows = [];
    this.loadState();
  }

  enable() {
    this.apps = mtt.settings.get_strv('supported-apps');
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
    this.updateState();
  }

  loadState() {
    debug('loading initial state');
    const initialState = mtt.settings.get_strv('current-state');

    debug(`initial state: ${initialState}`);

    initialState.map(state => state.split(':')).forEach(([ pid, idInDec, hidden ]) => {
      if(windowExists(pid, idInDec)) {
        showWindow(idInDec);
      }
    });
  }

  updateState() {
    debug('updating current state');
    const currentState = this.appWindows.map(
      appWin => `${appWin.pid}:${appWin.idInDec}:${appWin.hidden}`,
    );
    debug(`new state: ${currentState}`);
    mtt.settings.set_strv('current-state', currentState);
  }

  _onUpdate() {
    this._cleanupWindows();
    let windows = global.get_window_actors();
    for (let i = 0; i < windows.length; i++) {
      let metaWindow = windows[i].metaWindow;

      let app = getApp(metaWindow);

      if (
        app != null &&
        !app.is_window_backed() &&
        this.apps.indexOf(app.get_name()) >= 0 &&
        this.appWindows.filter(appWin => metaWindow.get_pid() === appWin.pid).length === 0
      ) {
        const appWindow = new AppWindow(metaWindow);
        this.appWindows.push(appWindow);
        debug(`added new window: ${appWindow}`);
        appWindow.attach();
        this.updateState();
      }
    }
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
      if (!windowExists(appWin.pid, appWin.idInDec)) {
        debug(`removing window: ${appWin}`);
        shouldUpdateState = true;
        appWin.destroy();

        return false;
      }

      return true;
    });

    if(shouldUpdateState) {
      this.updateState();
    }

  }
};
