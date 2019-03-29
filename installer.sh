#!/bin/bash

rm -rf /tmp/gnome-shell-minimize-to-tray
git clone https://github.com/oae/gnome-shell-minimize-to-tray.git /tmp/gnome-shell-minimize-to-tray
cd /tmp/gnome-shell-minimize-to-tray
make install
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")'
