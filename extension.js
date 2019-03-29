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

window.mtt = {
  imports: imports.misc.extensionUtils.getCurrentExtension().imports
}

const { logger } = mtt.imports.utils;

const debug = logger('mtt');

function init() {
  debug('init');
}

function enable() {
  debug('enable');
}

function disable() {
  debug('disable');
}
