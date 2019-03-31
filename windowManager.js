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

const GLib = imports.gi.GLib;

const {
  logger,
  matchWindow,
  hideWindow,
  showWindow,
  createWindow,
  setTimeout,
  diff
} = mtt.imports.utils;

const debug = logger("window-manager");

var WindowManager = class WindowManager {
  constructor() {
    this.hiddenWindows = [];
    this.managedWindows = [];
    this.managedAppRegex = ["spotify.desktop##Spotify"];
  }

  moveToTray(win) {
    const toBeHidden = createWindow(win);

    if (!this._shouldMoveToTray(toBeHidden)) {
      return;
    }

    debug(`hiding window ${toBeHidden.title}:${toBeHidden.idHex}`);

    hideWindow(toBeHidden);

    this.hiddenWindows.push(toBeHidden);

    this._createTray(toBeHidden);
  }

  removeFromTray(win) {
    showWindow(win);
    mtt.tray.removeTrayItem(win);
  }

  updateWindows() {
    const newWindows = global
      .get_window_actors()
      .map(win => {
        const matchedAny = this.managedAppRegex.filter(regex =>
          matchWindow(win, regex)
        );

        if (matchedAny.length) {
          return createWindow(win);
        }

        return undefined;
      })
      .filter(win => !!win);

    const toBeApplied = diff(newWindows, this.managedWindows);

    toBeApplied.forEach(win => this._applyChanges(win));

    this.managedWindows = newWindows;
  }

  enable() {
    this.updateWindows();
  }

  disable() {
    this.managedWindows.forEach(win => this._revertChanges(win));
    this.managedWindows = [];
    this.hiddenWindows.forEach(win => this.removeFromTray(win));
    this.hiddenWindows = [];
  }

  _shouldMoveToTray(win) {
    return (
      this.managedWindows.filter(mWin => win.idDec === mWin.idDec).length > 0
    );
  }

  _createTray(win) {
    mtt.tray.addTrayItem(win);
  }

  _applyChanges(win) {
    debug(`applying changes to ${win.wmClass}:${win.idHex}`);

    GLib.spawn_command_line_sync(
      `xprop -id ${
        win.idHex
      } -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "1,30"`
    );
  }

  _revertChanges(win) {
    debug(`reverting changes from ${win.wmClass}:${win.idHex}`);

    GLib.spawn_command_line_sync(
      `xprop -id ${win.idHex} -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS true`
    );
  }
};
