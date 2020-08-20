import { Subprocess, SubprocessFlags, AsyncResult } from '@imports/Gio-2.0';
import { Window } from '@imports/Meta-6';
import { timeout_add, PRIORITY_DEFAULT, Source, find_program_in_path } from '@imports/GLib-2.0';

const REQUIRED_PROGRAMS = ['xwininfo', 'xdotool', 'xprop'];

export const getMissingDeps = (): Array<string> => {
  return REQUIRED_PROGRAMS.filter((program) => find_program_in_path(program) === null);
};

export const logger = (prefix: string) => (content: string): void => log(`[mtt] [${prefix}] ${content}`);

export const setInterval = (func: () => any, millis: number): number => {
  const id = timeout_add(PRIORITY_DEFAULT, millis, () => {
    func();

    return true;
  });

  return id;
};

export const clearInterval = (id: number): boolean => Source.remove(id);

export const setTimeout = (func: () => any, millis: number): number => {
  return timeout_add(PRIORITY_DEFAULT, millis, () => {
    func();

    return false;
  });
};

export const clearTimeout = (id: number): boolean => Source.remove(id);

export const execute = async (command: string): Promise<string> => {
  const process = new Subprocess({
    argv: ['bash', '-c', command],
    flags: SubprocessFlags.STDOUT_PIPE,
  });

  process.init(null);

  return new Promise((resolve, reject) => {
    process.communicate_utf8_async(null, null, (_, result: AsyncResult) => {
      const [, stdout, stderr] = process.communicate_utf8_finish(result);
      if (stderr) {
        reject(stderr);
      } else if (stdout) {
        resolve(stdout.trim());
      } else {
        resolve();
      }
    });
  });
};

export const getWindowClassName = async (xid: string): Promise<string | undefined> => {
  if (xid) {
    const xpropOut = await execute(`xprop -id ${xid} WM_CLASS`);
    if (xpropOut != null) {
      return xpropOut.split('=')[1].split(',')[0].trim().split('"')[1];
    }
  }
};

export const getWindowXid = async (): Promise<string> => {
  return execute('xdotool selectwindow');
};

/**
 * Taken from pixel saver extension. https://github.com/pixel-saver/pixel-saver
 *
 * Guesses the X ID of a window.
 */
export const guessWindowXID = async (window: Window): Promise<string | undefined> => {
  // We cache the result so we don't need to redetect.
  // if (window._mttWindowId) {
  //   return window._mttWindowId;
  // }

  /**
   * If window title has non-utf8 characters, get_description() complains
   * "Failed to convert UTF-8 string to JS string: Invalid byte sequence in conversion input",
   * event though get_title() works.
   */
  try {
    const m = window.get_description().match(/0x[0-9a-f]+/);
    if (m && m[0]) {
      // return (win._pixelSaverWindowID = m[0]);
      return m[0];
    }
  } catch (err) {}

  // use xwininfo, take first child.
  const act = window.get_compositor_private();
  const xwindow = act && act['x-window'];
  if (xwindow) {
    const xwininfo = await execute(`xwininfo -children -id 0x${xwindow}`);
    if (xwininfo[0]) {
      const str = xwininfo[1].toString();

      /**
       * The X ID of the window is the one preceding the target window's title.
       * This is to handle cases where the window has no frame and so
       * act['x-window'] is actually the X ID we want, not the child.
       */
      const regexp = new RegExp(`(0x[0-9a-f]+) +"${window.title}"`);
      let m = str.match(regexp);
      if (m && m[1]) {
        // return (win._pixelSaverWindowID = m[1]);
        return m[1];
      }

      // Otherwise, just grab the child and hope for the best
      m = str.split(/child(?:ren)?:/)[1].match(/0x[0-9a-f]+/);
      if (m && m[0]) {
        // return (win._pixelSaverWindowID = m[0]);
        return m[0];
      }
    }
  }

  // Try enumerating all available windows and match the title. Note that this
  // may be necessary if the title contains special characters and `x-window`
  // is not available.
  const result = await execute('xprop -root _NET_CLIENT_LIST');
  if (result[0]) {
    const str = result[1].toString();

    // Get the list of window IDs.
    const windowList = str.match(/0x[0-9a-f]+/g);

    if (windowList) {
      // For each window ID, check if the title matches the desired title.
      for (let i = 0; i < windowList.length; ++i) {
        const result = await execute(`xprop -id "${windowList[i]}" _NET_WM_NAME`);

        if (result[0]) {
          const output = result[1].toString();

          const title = output.match(/_NET_WM_NAME(\(\w+\))? = "(([^\\"]|\\"|\\\\)*)"/);

          // Is this our guy?
          if (title && title[2] == window.title) {
            return windowList[i];
          }
        }
      }
    }
  }
};
