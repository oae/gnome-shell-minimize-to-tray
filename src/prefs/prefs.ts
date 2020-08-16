import { Settings } from '@imports/Gio-2.0';
import {
  Box,
  Builder,
  ListBoxRow,
  ListBox,
  Label,
  Button,
  Image,
  IconTheme,
  IconLookupFlags,
  Switch,
} from '@imports/Gtk-3.0';

import { Pixbuf, Colorspace } from '@imports/GdkPixbuf-2.0';
import { base64_encode, base64_decode } from '@imports/GLib-2.0';

import { logger, getWindowXid, getWindowClassName } from '../utils';
import { ShellExtension, getCurrentExtension, getCurrentExtensionSettings } from '../shell';
import { MttInfo } from '../index';

const debug = logger('prefs');

class Preferences {
  private extension: ShellExtension;
  private settings: Settings;
  private builder: Builder;
  private trackedClassesListBox: ListBox;
  private mttData: Array<MttInfo>;

  widget: Box;

  constructor() {
    this.mttData = [];
    this.extension = getCurrentExtension();
    this.settings = getCurrentExtensionSettings();

    // Create a parent widget
    this.widget = new Box();

    // Load ui from glade file
    this.builder = Builder.new_from_file(`${this.extension.path}/ui/prefs.glade`);

    // Connect all events
    this.builder.connect_signals_full((builder, object, signal, handler) => {
      object.connect(signal, this[handler].bind(this));
    });

    this.trackedClassesListBox = this.builder.get_object('tracked-classes-listbox') as ListBox;
    const settingsBox = this.builder.get_object('mtt-settings') as Box;

    this.widget.pack_start(settingsBox, true, true, 0);
    this.widget.get_parent_window()?.set_title(this.extension.metadata.name);

    // Initialize values
    this.initValues();
  }

  private initValues(): void {
    try {
      // Get the already saved data
      this.mttData = JSON.parse(this.settings.get_string('mtt-data'));
    } catch (_) {
      debug('could not parse the settings data, resetting it.');
      this.mttData = [];
    }

    // Create ui row for each item
    this.mttData.forEach((data) => {
      this.addRow(data.className, data.enabled, this.createIcon(data.icon));
    });
    debug('initialized values');
  }

  private async onAddApplication(): Promise<void> {
    try {
      // Get the window id and the window
      const windowId = await getWindowXid();

      // Get the class name
      const className = await getWindowClassName(windowId);

      // Check if class name is already included
      if (this.mttData.findIndex((data) => data.className === className) >= 0) {
        return;
      }

      // Get the icon
      const icon = this.getIconFromWindow(windowId);

      // Add row to list
      this.addRow(className, true, icon);

      // Add data to mttData
      this.mttData.push({
        className,
        enabled: true,
        icon: icon && base64_encode(icon.get_pixels()),
      });
    } catch (ex) {
      debug(`exception: ${ex}`);
    }
  }

  private onSave(): void {
    this.settings.set_string('mtt-data', JSON.stringify(this.mttData));
    this.onClose();
  }

  private onClose(): void {
    this.widget.get_toplevel().destroy();
  }

  private addRow(className: string, enabled: boolean, appIcon: Pixbuf | undefined): void {
    const rowBuilder = Builder.new_from_file(`${this.extension.path}/ui/row_template.glade`);

    // Get the template
    const row = rowBuilder.get_object('row-template') as ListBoxRow;

    // Set the class name
    const classNameLabel = rowBuilder.get_object('class-name-label') as Label;
    classNameLabel.set_text(className);

    // Set the icon
    if (appIcon) {
      const iconImage = rowBuilder.get_object('icon-image') as Image;
      iconImage.set_from_pixbuf(appIcon);
    }

    // Set the enabled switch
    const enabledSwitch = rowBuilder.get_object('enabled-switch') as Switch;
    enabledSwitch.set_active(enabled);

    // Connect to state set event for changes
    enabledSwitch.connect('state-set', (_, state) => {
      this.mttData.forEach((data) => {
        if (data.className === className) {
          data.enabled = state;
        }
      });
    });

    // Connect remove event
    const removeButton = rowBuilder.get_object('remove-button') as Button;
    removeButton.connect('clicked', () => {
      this.trackedClassesListBox.remove(row);
      this.mttData = this.mttData.filter((data) => data.className !== className);
    });

    // Add to existing list
    this.trackedClassesListBox.insert(row, 0);
  }

  private createIcon(iconBase64?: string): Pixbuf | undefined {
    if (iconBase64) {
      return Pixbuf.new_from_bytes(base64_decode(iconBase64), Colorspace.RGB, true, 8, 32, 32, 128);
    }
  }

  private getIconFromWindow(xid: string): Pixbuf | undefined {
    // TODO(alperen): get real icon
    debug(`getting icon for window ${xid}`);
    // Get the icon from window
    const defaulIcon = IconTheme.get_default().lookup_icon(
      'applications-system-symbolic',
      32,
      IconLookupFlags.USE_BUILTIN,
    );

    return defaulIcon?.load_icon();
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
