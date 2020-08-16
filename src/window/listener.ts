import { logger, guessWindowXID } from '../utils';
import { Settings } from '@imports/Gio-2.0';
import { Icon as StIcon, Bin } from '@imports/St-1.0';
import { getCurrentExtensionSettings } from '../shell';
import { MttInfo, MttWindow } from '../index';
import { WindowTracker, Global } from '@imports/Shell-0.1';
import { Window } from '@imports/Meta-6';
import { Screen, Window as WnckWindow } from '@imports/Wnck-3.0';
import { ActorAlign } from '@imports/Clutter-6';

const { Button } = imports.ui.panelMenu;
const { panel } = imports.ui.main;

const debug = logger(_('window-listener'));

export class WindowListener {
  private settings: Settings;
  private mttData: Array<MttInfo>;
  private trackedWindows: Array<MttWindow>;
  private windowOpenedListenerId?: number;
  private windowClosedListenerId?: number;

  constructor() {
    this.settings = getCurrentExtensionSettings();
    this.mttData = [];
    this.trackedWindows = [];

    // Initialize values
    this.initValues();
  }

  enable(): void {
    // Watch for settings changes
    this.settings.connect('changed', this.onSettingsChanged.bind(this));

    // Check for currently opened windows, if they match our data, we track the window
    Global.get()
      .get_window_actors()
      .forEach((actor) => {
        this.trackWindow(actor.get_meta_window().get_id().toString());
      });

    // Watch for window-opened events
    this.windowOpenedListenerId = Global.get().display.connect('window-created', (_, window) => {
      this.trackWindow(window.get_id().toString());
      debug(`new window opened for class: ${window.get_id()}/${window.get_wm_class_instance()}`);
    });

    // Watch for window-closed events
    this.windowClosedListenerId = Global.get().window_manager.connect('destroy', (_, windowActor) => {
      const id = windowActor.get_meta_window().get_id().toString();
      this.unTrackWindow(id);
      debug(`window closed for class: ${id}/${windowActor.get_meta_window().get_wm_class_instance()}`);
    });

    debug('started listening for windows');
  }

  disable(): void {
    // Dont watch for window-opened event anymore
    if (this.windowOpenedListenerId != undefined) {
      Global.get().display.disconnect(this.windowOpenedListenerId);
      this.windowOpenedListenerId = undefined;
    }
    // Dont watch for window-closed event anymore
    if (this.windowClosedListenerId != undefined) {
      Global.get().window_manager.disconnect(this.windowClosedListenerId);
      this.windowClosedListenerId = undefined;
    }

    // Untrack windows
    this.trackedWindows.forEach((trackedWindow) => this.unTrackWindow(trackedWindow.id));
    debug('stopped listening for windows');
  }

  private initValues(): void {
    try {
      // Get the already saved data
      this.mttData = JSON.parse(this.settings.get_string('mtt-data'));
    } catch (_) {
      debug('could not parse the settings data, resetting it.');
      this.mttData = [];
    }
  }

  private trackWindow(id: string): void {
    const window = this.getWindow(id);
    // Check if window exists
    if (window == null) {
      return;
    }

    // Get the class name
    const className = window.get_wm_class_instance();
    if (className == null) {
      return;
    }

    // Get the mtt infor from the data
    const mttInfo = this.mttData.find((data) => data.className === className);

    // Check if we have the class name in our mtt data
    if (mttInfo && mttInfo.enabled && this.trackedWindows.findIndex((trackedWindow) => trackedWindow.id == id) < 0) {
      // Find the app from pid
      const app = WindowTracker.get_default().get_app_from_pid(window.get_pid());

      if (app == null) {
        return;
      }

      // Get the icon
      const icon = app.create_icon_texture(16) as StIcon;

      // Add window info to tracked windows
      this.trackedWindows = [
        ...this.trackedWindows,
        {
          hidden: false,
          className,
          id,
          tray: this.addTray(id, icon),
        },
      ];
    }
  }

  private unTrackWindow(id: string): void {
    // Get the tracked window
    const trackedWindow = this.trackedWindows.find((trackedWindow) => trackedWindow.id === id);
    // Check if tracked window exist
    if (trackedWindow) {
      const window = this.getWindow(id);
      if (window && trackedWindow.hidden == true) {
        this.showWindow(id);
      }
      this.removeTray(id);
      this.trackedWindows = this.trackedWindows.filter((trackedWindow) => trackedWindow.id !== id);
    }
  }

  private onSettingsChanged(): void {
    this.initValues();

    const trackedClassNames = this.mttData
      .filter((mttInfo) => mttInfo.enabled === true)
      .map((mttInfo) => mttInfo.className);

    this.trackedWindows
      .filter((trackedWindow) => trackedClassNames.indexOf(trackedWindow.className) < 0)
      .forEach((trackedWindow) => this.unTrackWindow(trackedWindow.id));
    // Check for currently opened windows, if they match our data, we track the window
    Global.get()
      .get_window_actors()
      .forEach((actor) => {
        this.trackWindow(actor.get_meta_window().get_id().toString());
      });
  }

  private addTray(id: string, icon: StIcon): any {
    // Create a new button from given window id
    const newButton = new Button(0, id);

    const iconBox = new Bin({
      style_class: 'system-status-icon',
      y_align: ActorAlign.CENTER,
    });
    iconBox.set_child(icon);

    newButton.add_actor(iconBox);

    // Connect to click event for hiding/showing
    newButton.connect('button-press-event', () => {
      // Get the tracked window
      const trackedWindow = this.trackedWindows.find((trackedWindow) => trackedWindow.id === id);

      // Check if tracked window exist
      if (trackedWindow) {
        // If window is hiden, show it else hide it
        if (trackedWindow.hidden) {
          this.showWindow(id);
        } else {
          this.hideWindow(id);
        }

        // Toggle hidden flag
        trackedWindow.hidden = !trackedWindow.hidden;
      }
    });

    // Add actor to status area
    panel.addToStatusArea(id, newButton);

    return newButton;
  }

  private removeTray(id: string): void {
    // If actor exists in status area, destroy it
    if (panel.statusArea[id]) {
      panel.statusArea[id].destroy();
    }
  }

  private async hideWindow(id: string): Promise<void> {
    // Get the window for given id
    const window = this.getWindow(id);

    // Do nothing if window does not exists
    if (window == null) {
      return;
    }

    // Hide the window from user
    const xid = await guessWindowXID(window);
    if (xid) {
      debug(`hiding window: ${window.get_id()}/${window.get_wm_class_instance()}`);
      Screen.get_default()?.force_update();
      const wnckWindow = WnckWindow.get(parseInt(xid));
      if (wnckWindow) {
        wnckWindow.set_skip_pager(true);
        wnckWindow.set_skip_tasklist(true);
        wnckWindow.minimize();
      }
    }
  }

  private async showWindow(id: string): Promise<void> {
    // Get the window for given id
    const window = this.getWindow(id);

    // Do nothing if window does not exists
    if (window == null) {
      return;
    }

    // Show the window to user
    const xid = await guessWindowXID(window);
    if (xid) {
      debug(`showing window: ${window.get_id()}/${window.get_wm_class_instance()}`);
      Screen.get_default()?.force_update();
      const wnckWindow = WnckWindow.get(parseInt(xid));
      if (wnckWindow) {
        wnckWindow.set_skip_pager(false);
        wnckWindow.set_skip_tasklist(false);
        wnckWindow.unminimize(Math.floor(Date.now() / 1000));
      }
    }
  }

  private getWindow(id: string): Window | undefined {
    return Global.get()
      .get_window_actors()
      .find((window) => window.get_meta_window().get_id() == parseInt(id))
      ?.get_meta_window();
  }
}
