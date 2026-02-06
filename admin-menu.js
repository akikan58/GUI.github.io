document.addEventListener('DOMContentLoaded', () => {
    const userTableContainer = document.getElementById('user-table-container');
    const searchButton = document.getElementById('user-search-button');
    const searchField = document.getElementById('search-field');
    const searchQuery = document.getElementById('search-query');
    const backToHomeButton = document.getElementById('back-to-home-button');

    // 実機APIのベースURL
    //const MAIN_MACHINE_IP = '172.21.23.57';
    //const MAIN_MACHINE_IP = '172.21.23.65';
    const MAIN_MACHINE_IP = '192.168.3.3'; 
    //const MAIN_MACHINE_IP = window.location.hostname;
    const BASE_API_URL = `http://${MAIN_MACHINE_IP}:5000/api`;


    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filterPanel = document.getElementById('filter-panel');
    const resetButton = document.getElementById('reset-button');

    // 💡 1. フィルターパネルの開閉
    filterToggleButton.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
    });

    // 💡 2. 検索実行
    searchButton.addEventListener('click', () => {
        fetchAndRenderUsers();
        // 検索後にパネルを閉じる場合は以下を有効に
        // filterPanel.classList.add('hidden');
    });

    // 💡 3. リセット機能
    resetButton.addEventListener('click', () => {
        searchField.value = 'user_id';
        searchQuery.value = '';
        fetchAndRenderUsers();
    });

    // キーワード入力欄でEnterキーが押されたときも検索
    searchQuery.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchAndRenderUsers();
        }
    });

    /**
     * ユーザーデータを取得してテーブルを描画する
     */
    async function fetchAndRenderUsers() {
        try {
            userTableContainer.innerHTML = '<p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin mr-2"></i>読み込み中...</p>';

            // 実機側の get_users_api が期待するパラメータを作成
            const params = new URLSearchParams();
            if (searchQuery.value) {
                params.append('field', searchField.value);
                params.append('query', searchQuery.value);
            }
            // 必要に応じてソート順も指定可能
            params.append('sort_by', 'user_id');
            params.append('order', 'ASC');

            const response = await fetch(`${BASE_API_URL}/users?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                renderUserTable(result.data);
            } else {
                userTableContainer.innerHTML = '<p class="text-center text-gray-500 py-10">ユーザーが見つかりませんでした。</p>';
            }

        } catch (error) {
            console.error('ユーザー取得エラー:', error);
            userTableContainer.innerHTML = '<p class="text-center text-red-500 py-10">データの取得に失敗しました。接続設定を確認してください。</p>';
        }
    }

    /**
     * テーブルHTMLの構築
     */
    /**
 * 実機の仕様（work-history.js / admin-menu.js）に合わせたテーブル描画
 */
    /**
 * ユーザー情報の描画（確定版）
 */
    function renderUserTable(users) {
        userTableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        
        table.innerHTML = `
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザーID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日時</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${users.map(user => {
                    // 💡 コンソールの結果に基づき 'full_name' を使用
                    const displayName = user.full_name || '---';

                    // 💡 コンソールの結果に基づき 'registered_at' を使用
                    // 文字列で届いているので、そのまま表示するかDateで変換します
                    let regDateStr = '---';
                    if (user.registered_at) {
                        const d = new Date(user.registered_at);
                        if (!isNaN(d.getTime())) {
                            regDateStr = d.toLocaleString('ja-JP', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                            });
                        } else {
                            // Date変換に失敗した場合は生の文字列から先頭部分だけ出す
                            regDateStr = user.registered_at.split('+')[0];
                        }
                    }

                    return `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.id || '-'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">${user.user_id}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${displayName}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                                    ${user.role || '一般'}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${regDateStr}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        userTableContainer.appendChild(table);
    }
    backToHomeButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // 検索ボタンクリック
    searchButton.addEventListener('click', fetchAndRenderUsers);

    // Enterキーでも検索できるように設定
    searchQuery.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchAndRenderUsers();
    });

    // 初回読み込み
    fetchAndRenderUsers();
});