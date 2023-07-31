import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  protocol,
  Menu,
  globalShortcut,
} from "electron";
import * as path from "path";
import * as url from "url";
import log from "electron-log";
import dayjs from "dayjs";
import ioHook from "iohook";
import { autoUpdater } from 'electron-updater';

let lastTrackedTime = dayjs();
let idleTime = 0;
let interval = 30;
let productivity = 0;
let isActive = false;
let isBreak = false;

ioHook.on("keydown", () => {
  if (!isActive) {
    isActive = true;
    idleTime = 0;
  }
});

process.on("SIGINT", () => {
  ioHook.stop();
  updateValues();
  process.exit(0);
});
ioHook.start();

// --------------------------------------------- IPC Events ---------------------------------------------
const args = process.argv.slice(1),
  serve = args.some((val) => val === "--serve");
let mainWindow = null;

function createWindow() {
  const size = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    x: 200,
    y: 200,
    width: 414,
    height: 761,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: false,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: true,
    },
  });
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setFullScreenable(false);
  mainWindow.setResizable(false);

  if (serve) {
    mainWindow.loadFile(path.join(__dirname, "./../src/index.html"));
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "./../src/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  mainWindow.on("close", () => {
    ioHook.stop();

    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    }
  });

  // Auto updater
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.allowRendererProcessReuse = false;

app.on("ready", async () => {
  try {
    globalShortcut.register("Control+Shift+I", () => {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    });

   
    const protocolName = "safe-file-protocol";

    // NEEDED FOR PROPER IMAGES LOADING
    protocol.registerFileProtocol(protocolName, (request, callback) => {
      const url = request.url.replace(`${protocolName}://`, "");
      try {
        return callback(decodeURIComponent(url));
      } catch (error) {
        log.error(error);
      }
    });

    createWindow();
  } catch (error) {
    log.error(error);
    ioHook.stop();
    app.quit();
  }
});
let devtools = null;

app.once("ready", () => {
  // TODO: FOR DEVTOOLS
  // devtools = new BrowserWindow();
  // mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
  // mainWindow.webContents.openDevTools({ mode: "detach" });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    ioHook.stop();
    app.quit();
  }
});


autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});