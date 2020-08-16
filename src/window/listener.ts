import { logger, guessWindowXID, setTimeout } from '../utils';
import { Settings } from '@imports/Gio-2.0';
import { Icon as StIcon, Bin } from '@imports/St-1.0';
import { getCurrentExtensionSettings } from '../shell';
import { MttInfo, MttWindow } from '../index';
import { WindowTracker, Global } from '@imports/Shell-0.1';
import { Window, WindowType } from '@imports/Meta-6';
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
  private windowChangedListenerId?: number;
  private windowMinimizedListenerId?: number;

  constructor() {
    this.settings = getCurrentExtensionSettings();
    this.mttData = [];
    this.trackedWindows = [];

    // Initialize values
    this.initValues();
  }

  async enable(): Promise<void> {
    await this.initExtensionState();

    // Watch for settings changes
    this.settings.connect('changed::mtt-data', this.onSettingsChanged.bind(this));

    // Check for currently opened windows, if they match our data, we track the window
    const existingWindows = Global.get().get_window_actors();
    for (let i = 0; i < existingWindows.length; i++) {
      const window = existingWindows[i].get_meta_window();
      if (!window.get_wm_class_instance() || window.get_window_type() != WindowType.NORMAL) {
        continue;
      }
      const xid = await guessWindowXID(window);
      if (xid) {
        await this.trackWindow(xid, window);
      }
    }

    // Watch for window-opened events
    this.windowOpenedListenerId = Global.get().display.connect('window-created', async (_, window) => {
      if (window.get_window_type() !== WindowType.NORMAL || !window.get_wm_class_instance()) {
        return;
      }
      const xid = await guessWindowXID(window);
      if (xid) {
        debug(`new window opened for class: ${window.get_id()}/${window.get_wm_class_instance()}`);
        await this.trackWindow(xid, window);
      }
    });

    // Watch for window-closed events
    this.windowClosedListenerId = Global.get().window_manager.connect('destroy', async (_, windowActor) => {
      if (
        windowActor.get_meta_window().get_window_type() !== WindowType.NORMAL ||
        !windowActor.get_meta_window().get_wm_class_instance()
      ) {
        return;
      }
      const xid = await guessWindowXID(windowActor.get_meta_window());
      if (xid) {
        await this.unTrackWindow(xid);
        debug(`window closed for class: ${xid}/${windowActor.get_meta_window().get_wm_class_instance()}`);
      }
    });

    // Watch for window-changed events
    this.windowChangedListenerId = WindowTracker.get_default().connect('tracked-windows-changed', async () => {
      const existingWindows = Global.get().get_window_actors();
      for (let i = 0; i < existingWindows.length; i++) {
        const window = existingWindows[i].get_meta_window();
        if (!window.get_wm_class_instance() || window.get_window_type() != WindowType.NORMAL) {
          continue;
        }
        const xid = await guessWindowXID(window);
        if (xid) {
          await this.trackWindow(xid, window);
        }
      }
    });

    // Watch for window-closed events
    this.windowClosedListenerId = Global.get().window_manager.connect('minimize', async (_, windowActor) => {
      if (
        windowActor.get_meta_window().get_window_type() !== WindowType.NORMAL ||
        !windowActor.get_meta_window().get_wm_class_instance()
      ) {
        return;
      }
      const xid = await guessWindowXID(windowActor.get_meta_window());
      if (xid) {
        const window = this.trackedWindows.find((trackedWindow) => trackedWindow.xid === xid);
        if (window) {
          this.hideWindow(xid);
          debug(`window is minimized for class: ${xid}/${windowActor.get_meta_window().get_wm_class_instance()}`);
        }
      }
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
    // Dont watch for windows-changed event anymore
    if (this.windowChangedListenerId != undefined) {
      WindowTracker.get_default().disconnect(this.windowChangedListenerId);
      this.windowChangedListenerId = undefined;
    }
    // Dont watch for windows-minimized event anymore
    if (this.windowMinimizedListenerId != undefined) {
      Global.get().window_manager.disconnect(this.windowMinimizedListenerId);
      this.windowMinimizedListenerId = undefined;
    }

    // Save the state
    this.settings.set_string('extension-state', JSON.stringify(this.trackedWindows));

    // Untrack windows
    this.trackedWindows.forEach((trackedWindow) => this.unTrackWindow(trackedWindow.xid));
    debug('stopped listening for windows');
  }

  private async initExtensionState(): Promise<void> {
    try {
      const oldState: Array<MttWindow> = JSON.parse(this.settings.get_string('extension-state'));

      await new Promise((resolve) => setTimeout(resolve, 200));
      for (let i = 0; i < oldState.length; i++) {
        const oldWindowState = oldState[i];
        const window = await this.getWindow(oldWindowState.xid);
        if (!window || !window.get_wm_class_instance() || window.get_window_type() != WindowType.NORMAL) {
          continue;
        }

        debug(`restoring window: ${JSON.stringify(oldWindowState)}`);

        await this.trackWindow(oldWindowState.xid, window);

        if (oldWindowState.hidden) {
          this.hideWindow(oldWindowState.xid);
        } else {
          this.showWindow(oldWindowState.xid);
        }
      }
    } catch (ex) {
      debug(`failed to parse initial state: ${ex}`);
    }
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

  private async trackWindow(xid: string, metaWindow: Window): Promise<void> {
    // Get the class name
    const className = metaWindow.get_wm_class_instance();
    if (className == null) {
      debug(`className is null for xid: ${xid}`);
      return;
    }

    // Get the mtt infor from the data
    const mttInfo = this.mttData.find((data) => data.className === className);

    // Check if we have the class name in our mtt data
    if (mttInfo && mttInfo.enabled && this.trackedWindows.findIndex((trackedWindow) => trackedWindow.xid == xid) < 0) {
      // Find the app from pid
      const app = WindowTracker.get_default().get_window_app(metaWindow);

      if (app == null) {
        debug(`app is null for xid/className: ${xid}/${className}`);
        return;
      }

      // Get the icon
      const icon = app.create_icon_texture(16) as StIcon;
      this.addTray(xid, icon);

      // Add window info to tracked windows
      this.trackedWindows = [
        ...this.trackedWindows,
        {
          hidden: false,
          className,
          xid,
        },
      ];
      this.settings.set_string('extension-state', JSON.stringify(this.trackedWindows));
    }
  }

  private async unTrackWindow(xid: string): Promise<void> {
    // Get the tracked window
    const trackedWindow = this.trackedWindows.find((trackedWindow) => trackedWindow.xid === xid);
    // Check if tracked window exist
    if (trackedWindow) {
      const window = await this.getWindow(xid);
      if (window && trackedWindow.hidden == true) {
        this.showWindow(trackedWindow.xid);
      }
      this.removeTray(xid);
      this.trackedWindows = this.trackedWindows.filter((trackedWindow) => trackedWindow.xid !== xid);
    }
  }

  private async onSettingsChanged(): Promise<void> {
    this.initValues();

    const trackedClassNames = this.mttData
      .filter((mttInfo) => mttInfo.enabled === true)
      .map((mttInfo) => mttInfo.className);

    const nonExistingWindows = this.trackedWindows.filter(
      (trackedWindow) => trackedClassNames.indexOf(trackedWindow.className) < 0,
    );

    for (let i = 0; i < nonExistingWindows.length; i++) {
      const window = nonExistingWindows[i];
      await this.unTrackWindow(window.xid);
    }

    const existingWindows = Global.get().get_window_actors();
    for (let i = 0; i < existingWindows.length; i++) {
      const window = existingWindows[i].get_meta_window();
      if (window.get_window_type() !== WindowType.NORMAL || !window.get_wm_class_instance()) {
        continue;
      }
      const xid = await guessWindowXID(existingWindows[i].get_meta_window());
      if (xid) {
        await this.trackWindow(xid, existingWindows[i].get_meta_window());
      }
    }
  }

  private addTray(xid: string, icon: StIcon): any {
    // Create a new button from given window id
    const newButton = new Button(0, xid);

    const iconBox = new Bin({
      style_class: 'system-status-icon',
      y_align: ActorAlign.CENTER,
    });
    iconBox.set_child(icon);

    newButton.add_actor(iconBox);

    // Connect to click event for hiding/showing
    newButton.connect('button-press-event', () => {
      // Get the tracked window
      const trackedWindow = this.trackedWindows.find((trackedWindow) => trackedWindow.xid === xid);

      // Check if tracked window exist
      if (trackedWindow) {
        // If window is hiden, show it else hide it
        if (trackedWindow.hidden) {
          this.showWindow(trackedWindow.xid);
        } else {
          this.hideWindow(trackedWindow.xid);
        }
        this.settings.set_string('extension-state', JSON.stringify(this.trackedWindows));
      }
    });

    // Add actor to status area
    panel.addToStatusArea(xid, newButton);

    return newButton;
  }

  private removeTray(xid: string): void {
    // If actor exists in status area, destroy it
    if (panel.statusArea[xid]) {
      panel.statusArea[xid].destroy();
    }
  }

  private hideWindow(xid: string): void {
    // Get the window for given id
    const window = this.trackedWindows.find((mttWindow) => mttWindow.xid === xid);

    // Do nothing if window does not exists
    if (window == null) {
      return;
    }

    // Hide the window from user
    debug(`hiding window: ${window.xid}/${window.className}`);
    Screen.get_default()?.force_update();
    const wnckWindow = WnckWindow.get(parseInt(xid));
    if (wnckWindow) {
      wnckWindow.set_skip_pager(true);
      wnckWindow.set_skip_tasklist(true);
      wnckWindow.minimize();
      window.hidden = true;
    }
  }

  private showWindow(xid: string): void {
    // Get the window for given id
    const window = this.trackedWindows.find((mttWindow) => mttWindow.xid === xid);

    // Do nothing if window does not exists
    if (window == null) {
      return;
    }

    // Show the window to user
    debug(`showing window: ${window.xid}/${window.className}`);
    Screen.get_default()?.force_update();
    const wnckWindow = WnckWindow.get(parseInt(xid));
    if (wnckWindow) {
      wnckWindow.set_skip_pager(false);
      wnckWindow.set_skip_tasklist(false);
      wnckWindow.unminimize(Math.floor(Date.now() / 1000));
      window.hidden = false;
    }
  }

  private async getWindow(xid: string): Promise<Window | undefined> {
    const currentWindowsActors = Global.get().get_window_actors();
    for (let i = 0; i < currentWindowsActors.length; i++) {
      const currentWindow = currentWindowsActors[i].get_meta_window();
      const currentXid = await guessWindowXID(currentWindow);
      if (currentXid === xid) {
        return currentWindow;
      }
    }
  }
}
