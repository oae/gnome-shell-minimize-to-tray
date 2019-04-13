# Minimize to Tray

Minimize any app to tray

![SS](https://i.imgur.com/5J7mstv.jpg)

## Requirements

Make sure you have `xdotool` and `xprop` tools are installed in your system.

## Installation

### From [Git](https://github.com/oae/gnome-shell-minimize-to-tray)

```bash
curl https://raw.githubusercontent.com/oae/gnome-shell-minimize-to-tray/master/installer.sh | bash
```

### From [Ego](extensions.gnome.org)

* You can install it from [here](about:blank)

## Usage

// TODO

## Debugging

* If you encounter a problem you can enable the debug logs with;

  ```sh
  busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'window.mtt.debug = true;'
  ```

* Then trace them with;

  ```sh
  journalctl /usr/bin/gnome-shell -f -o cat | grep "\[minimize-to-tray\]"
  ```

## Notes

* Currently only **Non-CSD** (Client Side Decoration) windows and applications that can be tracked by Gnome Shell is supported
