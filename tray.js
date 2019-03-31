// Copyright (C) 2018 O. Alperen Elhan
//
// This file is part of Extensions Sync.
//
// Extensions Sync is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
//
// Extensions Sync is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Extensions Sync.  If not, see <http://www.gnu.org/licenses/>.
//

const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;

const Me = ExtensionUtils.getCurrentExtension();

var Tray = class Tray {
  constructor() {
    Gtk.IconTheme.get_default().append_search_path(
      imports.misc.extensionUtils
        .getCurrentExtension()
        .dir.get_child("icons")
        .get_path()
    );

    this.buttons = {};
  }

  addTrayItem(win, onPress) {
    const button = new PanelMenu.Button(1, win.app, true);

    let box = new St.BoxLayout();
    let gIcon = Gio.icon_new_for_string(`${Me.path}/icons/${win.app}.png`);

    let icon = new St.Icon({
      gicon: gIcon,
      style_class: "system-status-icon"
    });

    box.add(icon);
    button.actor.add_child(box);
    button.actor.connect("button-press-event", () =>
      mtt.wm.removeFromTray(win)
    );

    this.buttons[win.app] = button;

    Main.panel.addToStatusArea(win.app, button, 0, "right");
  }

  removeTrayItem(win) {
    this.buttons[win.app].destroy();
    delete this.buttons[win.app];
  }

  enable() {}

  disable() {
    Object.keys(this.buttons).forEach(app => this.buttons[app].destroy());
    this.buttons = {};
  }
};
