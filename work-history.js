// work-history.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const historyTableContainer = document.getElementById('history-table-container');
    const backToHomeButton = document.getElementById('back-to-home-button');
    const searchButton = document.getElementById('search-button');
    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filterPanel = document.getElementById('filter-panel');
    
    // フィルター要素
    const yearFromFilter = document.getElementById('year-from-filter');
    const monthFromFilter = document.getElementById('month-from-filter');
    const yearToFilter = document.getElementById('year-to-filter');
    const monthToFilter = document.getElementById('month-to-filter');
    const userFilter = document.getElementById('user-filter');

    // ★ 実機の Flask サーバーの IP アドレス
    //const MAIN_MACHINE_IP = '172.21.23.57'; 
    const MAIN_MACHINE_IP = '192.168.3.3'; 
    const BASE_API_URL = `http://${MAIN_MACHINE_IP}:5000/api`;
    //const BASE_API_URL = `/api`;

    /**
     * 1. フィルターオプション（作業者リストなど）を取得して設定する
     */
    async function setupFilters() {
        try {
            const response = await fetch(`${BASE_API_URL}/history_users`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();

            // サーバーから返ってくる {"data": [...], "success": true} の形式に対応
            if (result.success && result.data) {
                const users = result.data;
                
                // 作業者プルダウンを追加
                users.forEach(user => {
                    const userId = user.user_id || user; // オブジェクトか文字列か両方に対応
                    userFilter.add(new Option(userId, userId));
                });
                
                // 年月の選択肢（2023-2025をデフォルトで作成）
                const currentYear = new Date().getFullYear();
                for (let y = currentYear; y >= 2023; y--) {
                    yearFromFilter.add(new Option(y, y));
                    yearToFilter.add(new Option(y, y));
                }

                // 月の選択肢
                for (let i = 1; i <= 12; i++) {
                    const month = String(i).padStart(2, '0');
                    monthFromFilter.add(new Option(month, month));
                    monthToFilter.add(new Option(month, month));
                }
            }
        } catch (error) {
            console.error('フィルター設定エラー:', error);
        }
    }

    /**
     * 2. 履歴データを取得して描画する
     */
    async function filterHistoryData() {
        try {
            // 検索条件の取得
            const params = new URLSearchParams();
            
            // --- 💡 パラメータ名を Python 側の期待(request.args.get)に合わせる ---
            if (userFilter.value) {
                params.append('user_id', userFilter.value);
            }
            
            // 開始条件
            if (yearFromFilter.value) params.append('year_from', yearFromFilter.value);
            if (monthFromFilter.value) params.append('month_from', monthFromFilter.value);
            
            // 終了条件
            if (yearToFilter.value) params.append('year_to', yearToFilter.value);
            if (monthToFilter.value) params.append('month_to', monthToFilter.value);

            // もし start_date 形式も必要なら残しますが、Python側を見る限り上記で十分です
            // -----------------------------------------------------------

            historyTableContainer.innerHTML = '<p class="text-center text-gray-500">読み込み中...</p>';

            // 💡 ルーター経由の場合は、プロキシ用のパス '/api/proxy_logs' などを使っているか確認してください
            // もし直接実機を叩くならこのままでOKですが、CORSエラーが出る場合はプロキシ経由にします
            const response = await fetch(`${BASE_API_URL}/productionlogs2?${params.toString()}`);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                renderHistoryTable(data);
            } else {
                historyTableContainer.innerHTML = '<p class="text-center text-gray-500">条件に一致するデータが見つかりませんでした。</p>';
            }

        } catch (error) {
            console.error('履歴取得エラー:', error);
            historyTableContainer.innerHTML = '<p class="text-center text-red-500">データの読み込みに失敗しました。接続設定を確認してください。</p>';
        }
    }

    /**
     * 3. データをテーブル形式でHTMLに表示する
     */
    function renderHistoryTable(logs) {
        historyTableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        
        // ヘッダー部分の作成
        table.innerHTML = `
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">作業者ID</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">記録日時</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">開始時刻</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">終了時刻</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">製函数</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">不良数</th>
                    <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">不良率</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${logs.map(item => {
                    // 時刻のフォーマット用ヘルパー
                    const formatTime = (ts) => ts ? new Date(ts).toLocaleString('ja-JP', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }) : '-';

                    const defectRate = (item.defective_rate * 100).toFixed(1);
                    
                    return `
                        <tr>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">${item.id || '-'}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-900">${item.user_id}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-600">${formatTime(item.produced_at)}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-600">${formatTime(item.production_start)}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-600">${formatTime(item.production_end)}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-bold">${item.quantity}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-right text-red-600">${item.defective_count}</td>
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-right font-semibold">${defectRate}%</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        historyTableContainer.appendChild(table);
    }

    // ボタンのイベント設定
    filterToggleButton.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
    });

    searchButton.addEventListener('click', filterHistoryData);

    backToHomeButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // 初期実行
    setupFilters();
    filterHistoryData(); // 最初は全データを表示
});