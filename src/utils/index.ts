import { Subprocess, SubprocessFlags, AsyncResult } from '@imports/Gio-2.0';

export const logger = (prefix: string) => (content: string): void => log(`[mtt] [${prefix}] ${content}`);

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

export const getWindowId = async (): Promise<string> => {
  return execute('xdotool selectwindow');
};

export const getWindowClassName = async (): Promise<string> => {
  const windowId = await getWindowId();
  const xpropOut = await execute(`xprop -id ${windowId} WM_CLASS`);
  return xpropOut.split('=')[1].split(',')[0].trim().split('"')[1];
};
