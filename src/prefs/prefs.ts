import { Settings } from '@imports/Gio-2.0';
import { Box, Builder, ListBoxRow, ListBox, Label, Button, Image, IconTheme, IconLookupFlags } from '@imports/Gtk-3.0';

import { logger, getWindowId } from '../utils';
import { ShellExtension, getCurrentExtension, getCurrentExtensionSettings } from '../shell';
import { Window, Screen } from '@imports/Wnck-3.0';
import { Pixbuf, Colorspace } from '@imports/GdkPixbuf-2.0';
import { base64_encode, base64_decode } from '@imports/GLib-2.0';

const debug = logger('prefs');

class Preferences {
  private extension: ShellExtension;
  private settings: Settings;
  private builder: Builder;
  private trackedAppListBox: ListBox;
  private trackedAppList: {
    [key: string]: string;
  };

  widget: Box;

  constructor() {
    this.trackedAppList = {};
    this.extension = getCurrentExtension();
    this.settings = getCurrentExtensionSettings();
    this.widget = new Box();
    this.builder = Builder.new_from_file(`${this.extension.path}/ui/prefs.glade`);
    this.builder.connect_signals_full((builder, object, signal, handler) => {
      object.connect(signal, this[handler].bind(this));
    });

    this.trackedAppListBox = this.builder.get_object('tracked-app-listbox') as ListBox;
    const settingsBox = this.builder.get_object('mtt-settings') as Box;

    if (null !== settingsBox) {
      this.widget.pack_start(settingsBox, true, true, 0);
    }
    this.widget.get_parent_window()?.set_title(this.extension.metadata.name);

    this.initValues();
  }

  private initValues(): void {
    const initialApps = JSON.parse(this.settings.get_string('tracked-classnames'));
    Object.keys(initialApps).forEach((className) => {
      const icon = Pixbuf.new_from_bytes(base64_decode(initialApps[className]), Colorspace.RGB, true, 8, 32, 32, 128);

      this.addNewApp(className, icon);
    });
    debug('initialized values');
  }

  private async onAddApplication(): Promise<void> {
    try {
      if (Screen.get_default() == null) {
        debug('screen is null');
        return;
      }
      Screen.get_default()?.force_update();

      const windowId = await getWindowId();
      const appWindow = Window.get(parseInt(windowId));

      const appClassName = appWindow.get_class_instance_name();
      let appIcon = appWindow.get_icon();
      if (appWindow.get_icon_is_fallback()) {
        debug('could not get icon, using default icon');
        const fallbackIcon = IconTheme.get_default().lookup_icon(
          'applications-system-symbolic',
          32,
          IconLookupFlags.USE_BUILTIN,
        );

        if (fallbackIcon) {
          appIcon = fallbackIcon.load_icon();
        }
      }

      if (this.trackedAppList[appClassName]) {
        return;
      }
      this.addNewApp(appClassName, appIcon);
    } catch (ex) {
      debug(`exception: ${ex}`);
    }
  }

  private onSave(): void {
    this.settings.set_string('tracked-classnames', JSON.stringify(this.trackedAppList));
    this.onClose();
  }

  private onClose(): void {
    this.widget.get_toplevel().destroy();
  }

  private addNewApp(appClassName: string, appIcon: Pixbuf): void {
    this.trackedAppListBox.insert(this.createAppRow(appClassName, appIcon), 0);
    this.trackedAppList[appClassName] = base64_encode(appIcon.get_pixels());
  }

  private removeApp(className: string, appRow: ListBoxRow): void {
    this.trackedAppListBox.remove(appRow);
    delete this.trackedAppList[className];
  }

  private createAppRow(className: string, appIcon: Pixbuf): ListBoxRow {
    const appRowBuilder = Builder.new_from_file(`${this.extension.path}/ui/app_row.glade`);

    const appRow = appRowBuilder.get_object('app-row') as ListBoxRow;
    const appNameLabel = appRowBuilder.get_object('app-name-label') as Label;
    appNameLabel.set_text(className);

    const appIconImage = appRowBuilder.get_object('app-icon-image') as Image;
    appIconImage.set_from_pixbuf(appIcon);

    const appRemoveButton = appRowBuilder.get_object('app-remove-button') as Button;
    appRemoveButton.connect('clicked', () => {
      this.removeApp(className, appRow);
    });

    return appRow;
  }
}

const init = (): void => {
  debug('prefs initialized');
};

const buildPrefsWidget = (): any => {
  const prefs = new Preferences();
  prefs.widget.show_all();

  return prefs.widget;
};

export default { init, buildPrefsWidget };
