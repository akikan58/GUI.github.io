// renderer.js

document.addEventListener('DOMContentLoaded', () => {
    if (document.title === 'ログイン') {
        initializeLoginPage();
    } else if (document.title === 'GUI Layout') {
        initializeMainPage();
    } else if (document.title === '作業履歴') {

    } else if (document.title === '管理者メニュー') {
        initializeAdminMenuPage();
    } else if (document.title === '作業開始') {
        initializeStartWorkPage();
    } else if (document.title === '設定') {
        initializeSettingPage();
    }
});

const isElectron = !!window.electronAPI;

// ------------------ Login Page ------------------

function initializeLoginPage() {
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    const keys = document.querySelectorAll('.key');
    const powerOffButton = document.getElementById('power-off-button');
    let activeInputField = usernameField;
    let isShiftActive = false;

    if (usernameField) {
        usernameField.focus();
        usernameField.addEventListener('focus', () => activeInputField = usernameField);
    }
    if (passwordField) {
        passwordField.addEventListener('focus', () => activeInputField = passwordField);
    }

    keys.forEach(key => {
        key.addEventListener('click', () => {
            if (!activeInputField) return;

            let keyValue = key.textContent;

            if (key.classList.contains('shift')) {
                isShiftActive = !isShiftActive;
            } else if (key.classList.contains('backspace')) {
                activeInputField.value = activeInputField.value.slice(0, -1);
            } else if (key.classList.contains('space')) {
                activeInputField.value += ' ';
            } else if (key.classList.contains('clear')) {
                activeInputField.value = '';
            } else if (key.classList.contains('enter')) {
                handleLogin();
            } else {
                if (isShiftActive) {
                    keyValue = keyValue.toUpperCase();
                }
                activeInputField.value += keyValue;
            }
        });
    });

    async function handleLogin() {
        const username = usernameField.value;
        const password = passwordField.value;

        if (isElectron && typeof window.electronAPI.authenticateUser === 'function') {
            try {
                const result = await window.electronAPI.authenticateUser(username, password);
                if (result.success) {
                    window.electronAPI.navigateTo('index');
                } else {
                    await showCustomModal(result.message, 'alert');
                }
            } catch (error) {
                console.error('Authentication failed:', error);
                await showCustomModal('認証中に予期せぬエラーが発生しました。', 'alert');
            }
        } else {
            // ブラウザ用ダミー認証
            if (username === 'admin' && password === 'password') {
                // 履歴に login.html を残さずに index.html へ遷移
                window.location.replace('/index.html');
                //location.href = 'index.html';
            } else {
                await showCustomModal('ユーザー名またはパスワードが違います。', 'alert');
            }
        }
    }

    if (powerOffButton) {
        powerOffButton.addEventListener('click', async () => {
            const confirmed = await showCustomModal('アプリケーションを終了しますか？', 'confirm');
            if (confirmed) {
                if (isElectron && typeof window.electronAPI.quitApp === 'function') {
                    window.electronAPI.quitApp();
                } else {
                    await showCustomModal('ブラウザではアプリケーションを終了できません。', 'alert');
                }
            }
        });
    }

    setupCustomModal();
}

// ------------------ Main Page ------------------

function initializeMainPage() {
    const datetimeElement = document.getElementById('datetime');
    const backToLoginButton = document.getElementById('back-to-login-button');
    const workHistoryButton = document.getElementById('work-history-button');
    const adminMenuButton = document.getElementById('admin-menu-button');
    const settingButton = document.getElementById('setting-button');
    const startWorkButton = document.getElementById('start-work-button');
    const powerButton = document.getElementById('power-off-button');

    function updateDateTime() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        datetimeElement.textContent = new Intl.DateTimeFormat('ja-JP', options).format(now);
        if (datetimeElement) {
            datetimeElement.textContent = formattedDateTime;
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    async function fetchWeather() {
        if (isElectron && typeof window.electronAPI.getWeather === 'function') {
            try {
                const data = await window.electronAPI.getWeather();
                document.getElementById('weather-info').textContent = `天気: ${data.weather}`;
                document.getElementById('temperature-info').textContent = `気温: ${data.temperature}`;
            } catch {
                document.getElementById('weather-info').textContent = '天気: 取得失敗';
                document.getElementById('temperature-info').textContent = '気温: 取得失敗';
            }
        } else {
            document.getElementById('weather-info').textContent = '天気: 晴れ';
            document.getElementById('temperature-info').textContent = '気温: 28°C';
        }
    }
    fetchWeather();

    if (backToLoginButton) {
        backToLoginButton.addEventListener('click', async () => {
            const confirmed = await showCustomModal('ログイン画面に戻りますか？', 'confirm');
            if (confirmed) {
                isElectron ? window.electronAPI.navigateTo('login') : location.href = 'login.html';
            }
        });
    }

    if (workHistoryButton) {
        workHistoryButton.addEventListener('click', () => {
            isElectron ? window.electronAPI.navigateTo('work-history') : location.href = 'work-history.html';
        });
    }

    if (adminMenuButton) {
        adminMenuButton.addEventListener('click', () => {
            isElectron ? window.electronAPI.navigateTo('admin-menu') : location.href = 'admin-menu.html';
        });
    }

    if (settingButton) {
        settingButton.addEventListener('click', () => {
            showCustomModal('設定へ遷移', 'alert');
        });
    }

    if (startWorkButton) {
        startWorkButton.addEventListener('click', () => {
            showCustomModal('作業開始', 'alert');
        });
    }

    if (powerButton) {
        powerButton.addEventListener('click', async () => {
            const confirmed = await showCustomModal('アプリケーションを終了しますか？', 'confirm');
            if (confirmed) {
                if (isElectron && typeof window.electronAPI.quitApp === 'function') {
                    window.electronAPI.quitApp();
                } else {
                    await showCustomModal('ブラウザではアプリケーションを終了できません。', 'alert');
                }
            }
        });
    }

    setupCustomModal();
}

// ------------------ Work History Page ------------------

async function initializeWorkHistoryPage() {
    // const historyData = [
    //     { id: 1, date: '2025/06/25 10:00', category: '箱作成', operation: 'ダンボールA (10個)', result: '完了' },
    //     { id: 2, date: '2025/06/24 15:30', category: 'メンテナンス', operation: 'エラー処理', result: '完了' },
    //     { id: 3, date: '2025/06/23 09:00', category: '箱作成', operation: 'ダンボールB (50個)', result: '完了' },
    //     { id: 4, date: '2025/06/23 11:45', category: '箱作成', operation: 'ダンボールB (50個)', result: '完了' },
    //     { id: 5, date: '2025/06/22 14:00', category: '箱作成', operation: 'ダンボールA (20個)', result: '失敗' },
    // ];

    let sortColumn = 'date';
    let sortDirection = 'desc';

    let historyData =[];

    try {
        const response = await fetch('/work-history');
        historyData = await response.json();
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        document.getElementById('history-table-container').textContent = 'データの取得に失敗しました。';
        return;
    }

    function renderTable() {
        const tableContainer = document.getElementById('history-table-container');
        const sorted = [...historyData].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];
            return (aVal < bVal ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
        });

        tableContainer.innerHTML = `
            <table class="table-history">
                <thead>
                    <tr>
                        <th data-column="date">日時</th>
                        <th data-column="category">カテゴリ</th>
                        <th data-column="operation">作業内容</th>
                        <th data-column="result">結果</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(item => `
                        <tr>
                            <td>${item.date}</td>
                            <td>${item.category}</td>
                            <td>${item.operation}</td>
                            <td class="${item.result === '完了' ? 'text-green-600' : 'text-red-600'}">${item.result}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.table-history th').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.column;
                sortDirection = (sortColumn === col && sortDirection === 'asc') ? 'desc' : 'asc';
                sortColumn = col;
                renderTable();
            });
        });
    }

    renderTable();

    const backToHomeButton = document.getElementById('back-to-home-button');
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            isElectron ? window.electronAPI.navigateTo('index') : location.href = 'index.html';
        });
    }

    setupCustomModal();
}

// ------------------ Admin Menu Page ------------------

function initializeAdminMenuPage() {
    const usersData = [
        { id: 1, userId: 'admin', userName: '管理者', lastLogin: '2025/06/25 10:00', employeeNumber: '001' },
        { id: 2, userId: 'user01', userName: 'ユーザーA', lastLogin: '2025/06/24 15:30', employeeNumber: '002' },
        { id: 3, userId: 'user02', userName: 'ユーザーB', lastLogin: '2025/06/23 09:00', employeeNumber: '003' },
        { id: 4, userId: 'guest', userName: 'ゲスト', lastLogin: '2025/06/23 11:45', employeeNumber: '999' },
    ];

    const tableContainer = document.getElementById('user-table-container');

    function renderTable() {
        tableContainer.innerHTML = `
            <table class="table-users">
                <thead>
                    <tr>
                        <th>ユーザーID</th>
                        <th>ユーザー名</th>
                        <th>最終ログイン</th>
                        <th>社員番号</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersData.map(user => `
                        <tr>
                            <td>${user.userId}</td>
                            <td>${user.userName}</td>
                            <td>${user.lastLogin}</td>
                            <td>${user.employeeNumber}</td>
                            <td>
                                <button class="edit-button" data-id="${user.id}">編集</button>
                                <button class="delete-button" data-id="${user.id}">削除</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.edit-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                showCustomModal(`ユーザーID ${id} の編集機能を実装してください。`, 'alert');
            });
        });

        document.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                showCustomModal(`ユーザーID ${id} の削除機能を実装してください。`, 'alert');
            });
        });
    }

    renderTable();

    document.getElementById('add-user-button')?.addEventListener('click', () => {
        showCustomModal('新しいユーザー追加機能を実装してください。', 'alert');
    });

    document.getElementById('back-to-home-button')?.addEventListener('click', () => {
        isElectron ? window.electronAPI.navigateTo('index') : location.href = 'index.html';
    });

    setupCustomModal();
}

// ------------------ Custom Modal ------------------

function setupCustomModal() {
    const modal = document.getElementById('custom-alert-modal');
    const message = document.getElementById('custom-alert-message');
    const okBtn = document.getElementById('custom-alert-ok-button');
    const cancelBtn = document.getElementById('custom-alert-cancel-button');
    let resolveFn;

    window.showCustomModal = (msg, type = 'alert') => {
        return new Promise(resolve => {
            message.textContent = msg;
            modal.classList.remove('hidden');
            resolveFn = resolve;

            if (type === 'confirm') {
                cancelBtn.classList.remove('hidden');
            } else {
                cancelBtn.classList.add('hidden');
            }
        });
    };

    okBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
        resolveFn?.(true);
    });

    cancelBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
        resolveFn?.(false);
    });
}

// ------------------ Start Work Page ---------------

function initializeStartWorkPage() {

}
// ------------------ Setting Page ------------------

function initializeSettingPage() {

}