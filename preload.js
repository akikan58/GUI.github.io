// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('quit-app'),
    navigateTo: (page) => ipcRenderer.send('navigate-to', page),
    getWeather: () => ipcRenderer.invoke('get-weather'),
    onShowAlert: (callback) => ipcRenderer.on('show-alert', callback),
    // ログイン認証用の新しいAPIを追加
    authenticateUser: (username, password) => ipcRenderer.invoke('authenticate-user', { username, password })
});