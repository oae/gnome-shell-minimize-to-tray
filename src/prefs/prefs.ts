import { Colorspace, Pixbuf } from '@imports/GdkPixbuf-2.0';
import { Settings } from '@imports/Gio-2.0';
import { base64_decode, base64_encode } from '@imports/GLib-2.0';
import {
  Box,
  Builder,
  Button,
  CssProvider,
  IconLookupFlags,
  IconTheme,
  Image,
  Label,
  ListBox,
  ListBoxRow,
  STYLE_PROVIDER_PRIORITY_USER,
  Switch,
  StyleContext,
  ToggleButton,
  IconSize,
} from '@imports/Gtk-3.0';
import { Screen, Window } from '@imports/Wnck-3.0';
import { MttInfo } from '../index';
import { getCurrentExtension, getCurrentExtensionSettings, ShellExtension } from '../shell';
import { getWindowClassName, getWindowXid, logger } from '../utils';

const debug = logger('prefs');

class Preferences {
  extension: ShellExtension;
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
    this.mttData.forEach((data) => this.addRow(data));
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

      const mttInfo = {
        className,
        enabled: true,
        startHidden: false,
        icon: icon && base64_encode(icon.get_pixels()),
        keybinding: [],
      };

      // Add row to list
      this.addRow(mttInfo);

      // Add data to mttData
      this.mttData.push(mttInfo);
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

  private addRow(info: MttInfo): void {
    const rowBuilder = Builder.new_from_file(`${this.extension.path}/ui/row_template.glade`);

    // Get the template
    const row = rowBuilder.get_object('row-template') as ListBoxRow;

    // Set the class name
    const classNameLabel = rowBuilder.get_object('class-name-label') as Label;
    classNameLabel.set_text(info.className);

    // Set the icon
    if (info.icon) {
      const iconImage = rowBuilder.get_object('icon-image') as Image;
      iconImage.set_from_pixbuf(this.createIcon(info.icon));
    }

    // Set the enabled switch
    const enabledSwitch = rowBuilder.get_object('enabled-switch') as Switch;
    enabledSwitch.set_active(info.enabled);

    // Connect to state set event for changes
    enabledSwitch.connect('state-set', (_, state) => {
      const currentInfo = this.mttData.find((data) => data.className === info.className);
      if (currentInfo) {
        currentInfo.enabled = state;
      }
    });

    // Connect remove event
    const removeButton = rowBuilder.get_object('remove-button') as Button;
    removeButton.connect('clicked', () => {
      this.trackedClassesListBox.remove(row);
      this.mttData = this.mttData.filter((data) => data.className !== info.className);
    });

    // Add keybindings if exists
    const keybindingsContainer = rowBuilder.get_object('keybinding-container') as Box;
    const keybindingButton = rowBuilder.get_object('keybinding-button') as Button;
    const keybindingButtonImage = keybindingButton.get_child() as Image;
    if (info.keybinding && info.keybinding.length > 0) {
      info.keybinding.forEach((key) => {
        const label = new Label();
        keybindingButton.set_tooltip_text('Remove keyboard shortcut');
        keybindingButtonImage.set_from_icon_name('edit-undo-symbolic', IconSize.BUTTON);
        label.get_style_context().add_class('keycap');
        label.get_style_context().add_class('mtt-keybinding');
        label.set_text(key);
        label.show_all();
        keybindingsContainer.add_child(rowBuilder, label, null);
      });
    }
    keybindingButton.connect('clicked', () => {
      if (info.keybinding && info.keybinding.length > 0) {
        debug('removing keybinding');
        info.keybinding = [];
        keybindingsContainer.get_children().forEach((child) => child.destroy());
        keybindingButtonImage.set_from_icon_name('input-keyboard-symbolic', IconSize.BUTTON);
        keybindingButton.set_tooltip_text('Add keyboard shortcut');
      } else {
        debug('adding keybinding');
        // TODO(alperen): get shortcuts from user and check if they are available
        info.keybinding = ['Ctrl', 'Alt', 'S'];
        keybindingButton.set_tooltip_text('Remove keyboard shortcut');
        info.keybinding.forEach((key) => {
          const label = new Label();
          label.get_style_context().add_class('keycap');
          label.get_style_context().add_class('mtt-keybinding');
          label.set_text(key);
          keybindingButtonImage.set_from_icon_name('edit-undo-symbolic', IconSize.BUTTON);
          keybindingsContainer.add_child(rowBuilder, label, null);
          label.show_all();
        });
      }
    });

    // Set startHidden switch
    const startHiddenToggle = rowBuilder.get_object('start-hidden-toggle') as ToggleButton;
    startHiddenToggle.set_active(info.startHidden);
    startHiddenToggle.connect('toggled', () => {
      const currentInfo = this.mttData.find((data) => data.className === info.className);
      if (currentInfo) {
        currentInfo.startHidden = startHiddenToggle.get_active();
      }
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
    Screen.get_default()?.force_update();
    const window = Window.get(parseInt(xid));
    if (!window || window.get_icon_is_fallback()) {
      debug(`getting icon for window ${xid}`);
      // Get the icon from window
      const defaulIcon = IconTheme.get_default().lookup_icon(
        'applications-system-symbolic',
        32,
        IconLookupFlags.USE_BUILTIN,
      );

      return defaulIcon?.load_icon();
    }

    return window.get_icon();
  }
}

const init = (): void => {
  debug('prefs initialized');
};

const buildPrefsWidget = (): any => {
  const prefs = new Preferences();
  const styleProvider = new CssProvider();
  styleProvider.load_from_path(`${prefs.extension.path}/stylesheet.css`);
  StyleContext.add_provider_for_screen(prefs.widget.get_screen(), styleProvider, STYLE_PROVIDER_PRIORITY_USER);
  prefs.widget.show_all();

  return prefs.widget;
};

export default { init, buildPrefsWidget };
