# Minimize to Tray

Minimize any app to tray

![SS](https://i.imgur.com/cgJsgNT.png)

## Requirements

Make sure you have `xdotool` tool installed in your system.

## Installation

### From [Git](https://github.com/oae/gnome-shell-minimize-to-tray)

```bash
curl https://raw.githubusercontent.com/oae/gnome-shell-minimize-to-tray/master/installer.sh | bash
```

### From [Ego](extensions.gnome.org)

* You can install it from [here](https://extensions.gnome.org/extension/1750/minimize-to-tray/)

## Usage

* From extension settings add applications like below;
  
  ![SS](https://i.imgur.com/cbsHdMe.png)

* Currently running supported applications will be autocompleted as you type;

  ![SS](https://i.imgur.com/ewLfLfZ.png)

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

* Currently only applications that can be tracked by Gnome Shell is supported
