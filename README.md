# Minimize to Tray

Minimize any app to tray on close

![SS](https://i.imgur.com/5J7mstv.jpg)

## TODO

- [ ] Create a preference page for users to enable/disable supported apps
- [x] Listen all window related events to map user's apps

  ```js
  handler = global.window_manager.connect('minimize', (_, win) => {
    if(matchWindow(win, 'spotify.*##Spotify##Spotify')) {
      // TODO: hide window, put tray icon
    }
  });
  handler = global.window_manager.connect('destroy', (_, win) => {
    if(matchWindow(win, 'spotify.*##Spotify##Spotify')) {
      // TODO: on destroy
    }
  });
  global.display.connect('window-created', () => log('new window created'));
  ```

- [x] Remove close button from window with following command

  ```sh
  xprop -id (wmctrl -l | grep Spotify | cut -d' '  -f1) -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "1,30"
  ```

- [x] Hide window with

  ```sh
  windowId=`xdotool search --onlyvisible --name '^Spotify$'`
  xdotool windowunmap ${windowId}
  ```

- [x] Show appropriate icons for each minimized app in tray
- [x] Save state of the windows incase of shell reload/crash

## Notes

- xdotool id to xprop id `0x0${windowId.toString(16)}`
