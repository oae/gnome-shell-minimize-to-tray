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

const { logger, debounce } = mtt.imports.utils;

const debug = logger("window-listener");

var WindowListener = class WindowListener {
  constructor() {
    debug("initialized");
  }

  enable() {
    this.windowCreateHandler = global.display.connect(
      "window-created",
      debounce(() => this._onWindowCreate(), 250)
    );
    this.windowMinimizeHandler = global.window_manager.connect(
      "minimize",
      (_, win) => this._onWindowMinimize(win)
    );
    this.windowDestroyHandler = global.window_manager.connect(
      "destroy",
      debounce(() => this._onWindowClose(), 250)
    );
  }

  disable() {
    global.window_manager.disconnect(this.windowDestroyHandler);
    global.window_manager.disconnect(this.windowMinimizeHandler);
    global.display.disconnect(this.windowCreateHandler);
  }

  _onWindowCreate() {
    mtt.wm.updateWindows();
  }

  _onWindowMinimize(win) {
    mtt.wm.moveToTray(win);
  }

  _onWindowClose() {
    mtt.wm.updateWindows();
  }
};
