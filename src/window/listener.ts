import { logger } from '../utils';
import { Settings } from '@imports/Gio-2.0';
import { getCurrentExtensionSettings } from '../shell';
import { Screen, Window } from '@imports/Wnck-3.0';
import { WindowTracker } from '@imports/Shell-0.1';

const { Button } = imports.ui.panelMenu;
const { panel } = imports.ui.main;

const debug = logger('window-listener');

export class WindowListener {
  private settings: Settings;
  private screen: Screen | null;
  private trackedClassNames: {
    [key: string]: {
      [key: number]: any;
    };
  };
  private windowOpenedListener: number | undefined;
  private windowClosedListener: number | undefined;

  constructor() {
    this.settings = getCurrentExtensionSettings();
    this.trackedClassNames = {};
    this.settings.connect('changed::tracked-classnames', this.updateTrackedClassNames.bind(this));
    this.screen = Screen.get_default();
  }

  startListening(): void {
    this.trackedClassNames = this.getTrackedClassNamesFromSettings();
    this.getWindows()?.forEach((w) => this.markWindow(w));
    this.windowOpenedListener = this.screen?.connect('window-opened', (_, window) => {
      debug(`new window opened for class: ${window.get_class_instance_name()}`);
      this.markWindow(window);
    });
    this.windowClosedListener = this.screen?.connect('window-closed', (_, window) => {
      debug(`window closed for class: ${window.get_class_instance_name()}`);
      this.unMarkWindowForXid(window.get_class_instance_name(), window.get_xid().toString());
    });
    debug('started listening for windows');
  }

  stopListening(): void {
    if (this.windowOpenedListener) {
      this.screen?.disconnect(this.windowOpenedListener);
    }
    if (this.windowClosedListener) {
      this.screen?.disconnect(this.windowClosedListener);
    }
    Object.keys(this.trackedClassNames).forEach((className) => this.unMarkWindowsForClassName(className));
    debug('stopped listening for windows');
  }

  private markWindow(window: Window): void {
    const xid = window.get_xid().toString();
    const className = window.get_class_instance_name();
    // We are tracking this class
    if (Object.keys(this.trackedClassNames).indexOf(className) >= 0) {
      debug(`got new window with class ${window.get_class_instance_name()}`);
      // Check if we already tracking this window
      const trackedWindows = this.trackedClassNames[className];
      if (Object.keys(trackedWindows).indexOf(xid) < 0) {
        const app = WindowTracker.get_default().get_app_from_pid(window.get_pid());
        const icon = app.create_icon_texture(16);
        trackedWindows[xid] = this.addTray(xid, icon);
      }
    }
  }

  private unMarkWindowsForClassName(className: string): void {
    debug(`unmarking window: ${className}`);
    Object.keys(this.trackedClassNames[className]).forEach((tXid) => {
      this.removeTray(tXid);
      const window = Window.get(parseInt(tXid));
      if (null != window) {
        this.showWindow(window);
      }
    });
    this.trackedClassNames[className] = {};
  }

  private unMarkWindowForXid(className: string, xid: string): void {
    // We are tracking this class
    if (Object.keys(this.trackedClassNames).indexOf(className) >= 0) {
      debug(`unmarking window with class ${className}`);
      // Check if we already tracking this window
      const trackedWindows = this.trackedClassNames[className];
      if (Object.keys(trackedWindows).indexOf(xid) >= 0) {
        this.removeTray(xid);
        delete trackedWindows[xid];
      }
    }
  }

  private updateTrackedClassNames(): void {
    debug(`old: ${JSON.stringify(Object.keys(this.trackedClassNames))}`);
    const newTrackedClassNames = this.getTrackedClassNamesFromSettings();

    // Unmark windows for removed class names
    Object.keys(this.trackedClassNames).forEach(
      (className) =>
        Object.keys(newTrackedClassNames).indexOf(className) < 0 && this.unMarkWindowsForClassName(className),
    );

    this.trackedClassNames = Object.keys(this.trackedClassNames)
      .filter((className) => Object.keys(newTrackedClassNames).indexOf(className) >= 0)
      .reduce((acc, className) => {
        return {
          ...acc,
          ...this.trackedClassNames[className],
        };
      }, {});

    const addedClassNames = Object.keys(newTrackedClassNames)
      .map((className) => {
        if (Object.keys(this.trackedClassNames).indexOf(className) < 0) {
          return {
            [className]: {},
          };
        }
      })
      .filter((obj) => obj != null)
      .reduce((acc, obj) => {
        return {
          ...acc,
          ...obj,
        };
      }, {});
    this.trackedClassNames = {
      ...this.trackedClassNames,
      ...addedClassNames,
    };
    debug(`new: ${JSON.stringify(Object.keys(this.trackedClassNames))}`);

    this.getWindows()?.forEach((w) => this.markWindow(w));
  }

  private addTray(xid: string, icon: any): any {
    const newButton = new Button(0, xid);
    newButton.icon = icon;
    newButton.shown = true;
    newButton.add_actor(newButton.icon);
    newButton.connect('button-press-event', () => {
      const window = Window.get(parseInt(xid));

      if (window == null) {
        return;
      }

      if (newButton.shown == true) {
        this.hideWindow(window);
      } else {
        this.showWindow(window);
      }

      newButton.shown = !newButton.shown;
    });

    panel.addToStatusArea(xid, newButton);

    return newButton;
  }

  private removeTray(xid: string): void {
    if (panel.statusArea[xid]) {
      panel.statusArea[xid].destroy();
    }
  }

  private hideWindow(window: Window): void {
    debug(`hiding window: ${window.get_xid()}/${window.get_name()}${window.get_class_instance_name()}`);
    window.set_skip_pager(true);
    window.set_skip_tasklist(true);
    window.minimize();
  }

  private showWindow(window: Window): void {
    debug(`showing window: ${window.get_xid()}/${window.get_name()}${window.get_class_instance_name()}`);
    window.set_skip_pager(false);
    window.set_skip_tasklist(false);
    window.unminimize(Math.floor(Date.now() / 1000));
  }

  private getWindows(): Array<Window> | undefined {
    this.screen?.force_update();
    return this.screen?.get_windows();
  }

  private getTrackedClassNamesFromSettings(): any {
    return Object.keys(JSON.parse(this.settings.get_string('tracked-classnames'))).reduce((acc, key) => {
      return {
        ...acc,
        [key]: {},
      };
    }, {});
  }
}
