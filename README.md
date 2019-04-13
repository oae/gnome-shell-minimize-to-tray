# Minimize to Tray

Minimize any app to tray

![SS](https://i.imgur.com/cgJsgNT.png)

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

* From extension settings add applications like below;
  
  ![SS](https://i.imgur.com/cbsHdMe.png)

* You can get the list of currently running application names with following bash command;

    ```sh
    d=`date "+%Y-%m-%d %H:%M:%S"` && busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'global.get_window_actors().forEach(w => {const app = Shell.WindowTracker.get_default().get_window_app(w.metaWindow); if(app) log(`app-names:${app.get_name()}`)});' > /dev/null  2>&1 && journalctl /usr/bin/gnome-shell --since "`echo $d`" -o cat | grep 'app-names' | cut -f 2 -d ':'
    ```

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

* Currently only **Non-CSD** (Non Client Side Decorated) windows and applications that are tracked by Gnome Shell is supported
