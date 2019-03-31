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

window.mtt = {
  imports: imports.misc.extensionUtils.getCurrentExtension().imports,
  debug: true,
};

const { logger } = mtt.imports.utils;

const { WindowListener } = mtt.imports.windowListener;

const debug = logger('mtt');

function init() {
  debug('init');
  mtt.wl = new WindowListener();
}

function enable() {
  debug('enable');
  mtt.wl.enable();
}

function disable() {
  debug('disable');
  mtt.wl.disable();
}
