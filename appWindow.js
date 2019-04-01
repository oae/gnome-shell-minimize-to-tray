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
const St = imports.gi.St;


const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const {
  getAppName,
  getWmClass,
  getTitleByPid,
  getIdInHex,
  getIdInDec,
  getPid,
  getWindowByPid,
  getIcon,
  windowExists,
  showWindow,
  hideWindow,
} = mtt.imports.windowUtils;

const { logger } = mtt.imports.utils;

const debug = logger('app-window');

var AppWindow = class AppWindow {
  constructor(metaWindow) {
    this._id = {
      idDec: getIdInDec(metaWindow),
      idHex: getIdInHex(metaWindow),
    };

    this._name = getAppName(metaWindow);
    this._icon = getIcon(metaWindow);
    this._wmClass = getWmClass(metaWindow);
    this._pid = getPid(metaWindow);
    this.button = null;
    this._hidden = false;
  }

  get idInDec() {
    return this._id.idDec;
  }

  get idInHex() {
    return this._id.idHex;
  }

  get title() {
    return getTitleByPid(this._pid);
  }

  get name() {
    return this._name;
  }

  get icon() {
    return this._icon;
  }

  get wmClass() {
    return this._wmClass;
  }

  set wmClass(wmClass) {
    this._wmClass = wmClass;
  }

  get pid() {
    return this._pid;
  }

  get hidden() {
    return this._hidden;
  }

  toggle() {
    if (!windowExists(this.pid, this.idInDec)) {
      return;
    }

    if (this.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  hide() {
    hideWindow(this.idInDec);
    this._hidden = true;
  }

  show() {
    showWindow(this.idInDec);
    this._hidden = false;
    const win = getWindowByPid(this.pid);
    if (win) {
      Main.activateWindow(win);
    }
  }

  removeCloseButton() {
    GLib.spawn_command_line_async(
      `xprop -id ${this.idInHex} -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "1,30"`,
    );
  }

  addCloseButton() {
    GLib.spawn_command_line_async(
      `xprop -id ${this.idInHex} -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS true`,
    );
  }

  addTray() {
    this.button = new PanelMenu.Button(1, `${this.idInDec}:${this.pid}:${this.name}`, true);

    const box = new St.BoxLayout();

    box.add(this.icon);
    this.button.actor.add_child(box);
    this.button.actor.connect('button-press-event', () => {
      this.toggle.call(this);
      mtt.windowListener.updateState();
    });

    Main.panel.addToStatusArea(`${this.idInDec}:${this.pid}:${this.name}`, this.button, 0, 'right');
  }

  removeTray() {
    this.button && this.button.destroy();
    this.button = null;
  }

  attach(hidden) {
    this.removeCloseButton();
    this.addTray();
    if (hidden) {
      this.hide();
    }
  }

  destroy() {
    this.show();
    this.removeTray();
    this.addCloseButton();
  }

  toString() {
    return `${this.name}:${this.pid}:${this.title}:${this.idInDec}:${this.idInHex}`;
  }
};
