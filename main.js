const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920, // 1920x1080に幅を変更
        height: 1080, // 1920x1080に高さを変更
        kiosk: true, // kioskモードを有効化
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // セキュリティのためtrueに設定
            nodeIntegration: false, // レンダラープロセスでのNode.js無効化
        }
    });

    // アプリケーション起動時はlogin.htmlをロード
    mainWindow.loadFile('login.html');

    // 開発ツールを開く (開発時のみ有効にしてください)
    //mainWindow.webContents.openDevTools();
}

// Electronアプリの準備ができたときにウィンドウを作成
app.whenReady().then(() => {
    createWindow();

    // macOSの場合、ドックアイコンクリック時にウィンドウを再作成
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 全てのウィンドウが閉じられたときにアプリを終了 (macOS以外)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ======== IPC Main ハンドラ ========

// レンダラープロセスからの終了要求を受け取る
ipcMain.on('quit-app', () => {
    console.log('Received quit-app request. Quitting application...');
    app.quit(); // アプリケーションを終了
});

// 画面遷移リクエスト
ipcMain.on('navigate-to', (event, page) => {
    console.log(`Navigating to: ${page}`);
    let targetFile = '';
    switch (page) {
        case '管理者メニュー':
            targetFile = 'admin-menu.html';
            break;
        case '設定':
            targetFile = 'settings.html';
            break;
        case '作業履歴':
            targetFile = 'work-history.html';
            break;
        case '作業開始':
            targetFile = 'start-work.html';
            break;
        case 'index':
            targetFile = 'index.html';
            break;
        case 'login': // ログイン画面への遷移も許可
            targetFile = 'login.html';
            break;
        default:
            targetFile = 'index.html'; // Fallback to index if page is not recognized
            break;
    }
    const filePathToLoad = path.join(__dirname, targetFile);
    console.log(`Attempting to load: ${filePathToLoad}`);
    mainWindow.loadFile(filePathToLoad)
        .then(() => {
            console.log(`${targetFile} loaded successfully.`);
        })
        .catch(error => {
            console.error(`Failed to load ${targetFile}:`, error);
            mainWindow.webContents.send('show-alert', `ページの読み込みに失敗しました: ${targetFile}`);
        });
});

// 天気情報取得のIPCハンドラ
ipcMain.handle('get-weather', async () => {
    console.log('Fetching weather data...');
    // 実際のAPI呼び出しの代わりに、ダミーデータをすぐに返す
    const weather = ['晴れ', '曇り', '雨'][Math.floor(Math.random() * 3)];
    const temperature = `${(Math.random() * 15 + 10).toFixed(1)}°C`; // 10-25°C
    return { weather: weather, temperature: temperature };
});

// ログイン認証のIPCハンドラを追加
ipcMain.handle('authenticate-user', async (event, { username, password }) => {
    console.log(`Attempting to authenticate user: ${username}`);
    // ID: master, パスワード: 1111 で認証
    if (username === 'master' && password === '1111') {
        console.log('Authentication successful.');
        return { success: true };
    } else {
        console.log('Authentication failed.');
        return { success: false, message: 'IDまたはパスワードが間違っています。' };
    }
});