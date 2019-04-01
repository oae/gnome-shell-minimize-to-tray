// Copyright (C) 2019 O. Alperen Elhan
//
// This file is part of Minimize to Tray.
//
// Minimize to Tray is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
//
// Minimize to Tray is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Minimize to Tray.  If not, see <http://www.gnu.org/licenses/>.

const Shell = imports.gi.Shell;
const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;

var getIdInDec = metaWindow => {
  const [result, stdout, stderr] = GLib.spawn_command_line_sync(
    `xdotool search --onlyvisible --maxdepth=2 --pid ${getPid(metaWindow)}`,
  );

  return ByteArray.toString(stdout).split('\n')[0];
};

var getIdInHex = metaWindow => {
  const idInDec = getIdInDec(metaWindow);

  return `0x0${parseInt(idInDec).toString(16)}`;
};

var getTitle = metaWindow => metaWindow.get_title();

var getWindowByPid = pid => {
  const app = Shell.WindowTracker.get_default().get_app_from_pid(pid);

  if (app) {
    return app.get_windows()[0];
  }
};

var getTitleByPid = pid => {
  const win = getWindowByPid(pid);

  if (win) {
    return win.get_title();
  }
};

var getApp = metaWindow => Shell.WindowTracker.get_default().get_window_app(metaWindow);

var getAppName = metaWindow => getApp(metaWindow).get_name();

var getIcon = metaWindow => getApp(metaWindow).create_icon_texture(20);

var getWmClass = metaWindow => metaWindow.get_wm_class();

var getPid = metaWindow => metaWindow.get_pid();

var windowExists = (pid, idInDec) => {
  const [result, stdout, stderr] = GLib.spawn_command_line_sync(
    `xdotool search --maxdepth=2 --pid ${pid}`,
  );

  const windowList = ByteArray.toString(stdout);

  return windowList.indexOf(idInDec) >= 0;
};

var showWindow = (idInDec, sync) => GLib.spawn_command_line_sync(`xdotool ${sync ? '--sync' : ''} windowmap ${idInDec}`);

var hideWindow = (idInDec, sync) => GLib.spawn_command_line_sync(`xdotool ${sync ? '--sync' : ''} windowunmap ${idInDec}`);
