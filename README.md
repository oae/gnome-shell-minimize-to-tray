# Minimize to Tray

[![ts](https://badgen.net/badge/icon/typescript?icon=typescript&label)](#)
[![deps](https://img.shields.io/david/oae/gnome-shell-minimize-to-tray)](#)
[![opensource](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](#)
[![licence](https://badges.frapsoft.com/os/gpl/gpl.png?v=103)](https://github.com/oae/gnome-shell-minimize-to-tray/blob/master/LICENSE)
[![latest](https://img.shields.io/github/v/release/oae/gnome-shell-minimize-to-tray)](https://github.com/oae/gnome-shell-minimize-to-tray/releases/latest)
[![compare](https://img.shields.io/github/commits-since/oae/gnome-shell-minimize-to-tray/latest/master)](https://github.com/oae/gnome-shell-minimize-to-tray/compare)

Minimize any app to tray

![SS](https://i.imgur.com/Z9TnedC.png)

## Requirements

Make sure you have `xdotool`, `xwininfo`, `xprop`, `libwnck3` installed on your system.

## Installation

### From [Git](https://github.com/oae/gnome-shell-minimize-to-tray)

```bash
git clone https://github.com/oae/gnome-shell-minimize-to-tray.git
cd ./gnome-shell-minimize-to-tray
yarn install
yarn build
ln -s "$PWD/dist" "$HOME/.local/share/gnome-shell/extensions/minimize-to-tray@elhan.io"
```

### From [Ego](extensions.gnome.org)

- You can install it from link below
  https://extensions.gnome.org/extension/1750/minimize-to-tray/

## Usage

- From the extension settings, you can click add button and select any opened window to put them in to tray
- There are three options for each application.
  - **Change active status**: You can disable the minimization for specific application
  - **Minimize window on start**: Whenever a new window opens for the application, it will automatically hide and minimize to tray
  - **Keyboard shorcut support**: This adds global keybindings to application window visibility. It currently supports `<ctrl>`, `<alt>`, `<shift>` and `0-9`, `a-z` keys. If there are are more than one window for specific application, it will focus to last used window.
  
  ![SS](https://i.imgur.com/78JUYQI.png)

## Development

- This extension is written in Typescript and uses webpack to compile it into javascript.
- Most dependencies have auto completion support thanks to [this amazing project](https://github.com/sammydre/ts-for-gjs) by [@sammydre](https://github.com/sammydre)
- To start development, you need nodejs installed on your system;

  - Clone the project

    ```sh
    git clone https://github.com/oae/gnome-shell-minimize-to-tray.git
    cd ./gnome-shell-minimize-to-tray
    ```

  - Install dependencies and build it

    ```sh
    yarn install
    yarn build
    ```

  - During development you can use `yarn watch` command to keep generated code up-to-date.
