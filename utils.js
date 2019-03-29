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

const Shell = imports.gi.Shell;

const logger = prefix => content => log(`[minimize-to-tray] [${prefix}] ${content}`);

const getApp = win => {
  const tracker = Shell.WindowTracker.get_default();
  return tracker.get_window_app(win.get_meta_window()).get_id();
};

const getTitle = win => {
  return win.get_meta_window().get_title();
};

const getWmClass = win => {
  return win.get_meta_window().get_wm_class();
};

const matchWindow = (win, regex) => {
  const appStr = `${getApp(win)}##${getWmClass(win)}##${getTitle(win)}`;

  return new RegExp(regex).test(appStr);
}
