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

window.mtt = {
  imports: imports.misc.extensionUtils.getCurrentExtension().imports,
  debug: true,
};

const { Gtk, Gdk, GObject, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { getSettings } = mtt.imports.convenience;

const { logger, setInterval, clearInterval } = mtt.imports.utils;
const debug = logger('prefs');

const AppListItem = GObject.registerClass(
  class AppListItem extends Gtk.ListBoxRow {
    _init(appName, state, onToggle, onRemove) {
      super._init({
        width_request: 100,
        height_request: 80,
      });

      this.appName = appName;
      this.onToggle = onToggle;
      this.onRemove = onRemove;

      const hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_left: 10,
        margin_right: 10,
        spacing: 20,
        can_focus: false,
      });
      this.add(hbox);

      const appLabel = new Gtk.Label({
        label: this.appName,
        ellipsize: Pango.EllipsizeMode.END,
        single_line_mode: true,
        tooltip_text: this.appName,
        can_focus: false,
      });
      appLabel.get_style_context().add_class('mtt-app-label');

      const toggleButton = new Gtk.Switch({
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        can_focus: false,
        active: state === 'enabled' ? true : false,
      });

      toggleButton.connect('state-set', () => {
        this.onToggle(this.appName, toggleButton.get_active() === true ? 'enabled' : 'disabled');
      });

      const removeButton = new Gtk.Button({
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        can_focus: false,
      });
      removeButton.get_style_context().add_class('mtt-button');
      removeButton.get_style_context().add_class('mtt-dangerous');
      removeButton.connect('clicked', () => {
        this._destroy();
      });

      const image = new Gtk.Image({ can_focus: false, icon_name: 'list-remove-symbolic' });
      removeButton.add(image);

      hbox.pack_start(toggleButton, false, true, 0);
      hbox.pack_start(appLabel, true, true, 1);
      hbox.pack_start(removeButton, false, true, 2);

      this.show_all();
    }

    _destroy() {
      this.onRemove(this.appName);
      super.destroy();
    }
  },
);

const Preferences = class Preferences {
  constructor() {
    this.apps = [];
    this.settings = getSettings('org.gnome.shell.extensions.minimize-to-tray');
    this.builder = Gtk.Builder.new_from_file(`${Me.dir.get_path()}/ui/settings.glade`);
    this.builder.connect_signals_full((builder, object, signal, handler) => {
      object.connect(signal, () => {
        this[handler]();
      });
    });

    this.widget = this.builder.get_object('settings-window');
    this.widget.connect('destroy', Gtk.main_quit);
    this.appList = this.builder.get_object('app-list');
    this.newAppPopover = this.builder.get_object('new-app-popover');
    this.newApp = this.builder.get_object('new-app-name');

    this.initValues();
  }

  onFocus() {
    const appNames = JSON.parse(this.settings.get_string('running-apps'));

    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    appNames.forEach(app => model.set(model.append(), [0], [app]));

    const completion = new Gtk.EntryCompletion({ model, minimum_key_length: 0 });
    completion.set_text_column(0);
    this.newApp.set_completion(completion);
  }

  addApp(appName, state) {
    const appState = state === undefined ? 'enabled' : state;
    const appListItem = new AppListItem(
      appName,
      appState,
      this.onToggle.bind(this),
      this.onRemove.bind(this),
    );
    this.appList.add(appListItem);
    this.apps.push({
      name: appName,
      state: appState,
    });
  }

  onAdd() {
    const appName = this.newApp.get_text().trim();
    const exists = this.apps.some(({ name }) => appName === name);
    if (appName.length > 0 && !exists) {
      this.addApp(appName);
      this.updateSettings();
    }
  }

  onRemove(appName) {
    this.apps = this.apps.filter(app => appName !== app.name);
    this.updateSettings();
  }

  onToggle(appName, state) {
    this.apps.forEach(app => {
      if (appName === app.name) {
        app.state = state;
      }
    });

    this.updateSettings();
  }

  onPopdown() {
    this.newAppPopover.popdown();
    this.newApp.set_text('');
  }

  onClose() {
    this.widget.destroy();
  }

  show() {
    this.widget.show_all();
  }

  updateSettings() {
    this.settings.set_string('apps', JSON.stringify(this.apps));
  }

  initValues() {
    const rawApps = JSON.parse(this.settings.get_string('apps'));
    rawApps.forEach(app => {
      this.addApp(app.name, app.state);
    });
  }
};

function init() {
  const provider = new Gtk.CssProvider();
  provider.load_from_path(`${Me.dir.get_path()}/stylesheet.css`);
  Gtk.StyleContext.add_provider_for_screen(
    Gdk.Screen.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
}

function buildPrefsWidget() {
  let prefs = new Preferences();
  prefs.show();
}
