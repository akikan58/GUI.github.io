// external_work_history.js (外部端末用)

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // ★ 修正ポイント1: 実機側のFlaskサーバーのIPアドレスとポート5000を指定
    // 【重要】'MAIN_MACHINE_IP' を実機がルーター/ネットワークに接続された際の実際のIPアドレスに置き換えてください。
    // 例: 'http://192.168.1.100:5000/api'
    const MAIN_MACHINE_API_URL = 'http://172.21.23.57:8000/api'; 
    // =========================================================================

    // 要素の取得
    const tableContainer = document.getElementById('history-table-container');
    const backButton = document.getElementById('back-to-home-button');
    const searchButton = document.getElementById('search-button');
    const userFilterSelect = document.getElementById('user-filter');
    
    // 年/月ドロップダウンの要素IDを取得
    const yearFromInput = document.getElementById('year-from-filter');
    const monthFromInput = document.getElementById('month-from-filter');
    const yearToInput = document.getElementById('year-to-filter');
    const monthToInput = document.getElementById('month-to-filter');
    
    // エラーチェック (省略...)

    // UNIXタイムスタンプを 'YYYY/MM/DD hh:mm:ss' 形式に変換 (省略...)
    function formatTimestamp(timestamp) {
        if (!timestamp || timestamp === 0) return '-';
        
        const numericTimestamp = parseFloat(timestamp);
        if (isNaN(numericTimestamp) || numericTimestamp < 0) {
            return '無効な日時';
        }

        let date;
        if (numericTimestamp > 1000000000000) { 
            date = new Date(numericTimestamp);
        } else {
            date = new Date(numericTimestamp * 1000);
        }

        const Y = date.getFullYear();
        const M = ('0' + (date.getMonth() + 1)).slice(-2);
        const D = ('0' + date.getDate()).slice(-2);
        const h = ('0' + date.getHours()).slice(-2);
        const m = ('0' + date.getMinutes()).slice(-2);
        const s = ('0' + date.getSeconds()).slice(-2);

        return `${Y}/${M}/${D} ${h}:${m}:${s}`;
    }

    // ユーザーIDのドロップダウンを埋める関数
    async function fetchUsersForFilter() {
        try {
            // ★ 修正ポイント2: 実機APIエンドポイントを使用
            const response = await fetch(`${MAIN_MACHINE_API_URL}/history_users`);
            if (!response.ok) throw new Error('ユーザーリストの取得に失敗しました。');
            
            const result = await response.json();
            if (result.success && result.data) {
                userFilterSelect.innerHTML = '<option value="">全てのユーザー</option>'; 
                
                result.data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.user_id;
                    
                    let displayName = `${user.user_id} (${user.full_name})`;
                    if (user.is_active === 0) {
                        displayName += ' (退会済み)';
                    }
    
                    option.textContent = displayName;
                    userFilterSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('ユーザーリスト取得エラー:', error);
        }
    }

    // 存在する年月のドロップダウンを埋める関数
    async function fetchAndSetDateFilters() {
        try {
            // ★ 修正ポイント3: 実機APIエンドポイントを使用
            const response = await fetch(`${MAIN_MACHINE_API_URL}/production_months`);
            if (!response.ok) throw new Error('年月リストの取得に失敗しました。');
            
            const result = await response.json();
            // ... (後続の処理は変更なし) ...
            if (result.success && result.data) {
                const monthsList = result.data; 
                // ... (年月のドロップダウンを埋める処理は変更なし) ...
                
                const years = [...new Set(monthsList.map(m => m.substring(0, 4)))].sort((a, b) => b - a);
                [yearFromInput, yearToInput].forEach(select => {
                    select.innerHTML = '<option value="">年</option>';
                    years.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = `${year}年`;
                        select.appendChild(option);
                    });
                });

                const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                [monthFromInput, monthToInput].forEach(select => {
                    select.innerHTML = '<option value="">月</option>';
                    allMonths.forEach(month => {
                        const option = document.createElement('option');
                        option.value = month;
                        option.textContent = `${month}月`;
                        select.appendChild(option);
                    });
                });
                
                // ページロード時に最新の年月にデフォルト設定する
                if (monthsList.length > 0) {
                    const latestMonth = monthsList[monthsList.length - 1]; 
                    const [latestYear, latestM] = latestMonth.split('-');
                    
                    yearFromInput.value = latestYear;
                    monthFromInput.value = latestM;
                    yearToInput.value = latestYear;
                    monthToInput.value = latestM;
                }
            }
        } catch (error) {
            console.error('年月フィルター設定エラー:', error);
        }
    }


    // 製造記録を取得し、テーブルとして描画する関数
    async function fetchAndRenderProductionLogs(params = {}) {
        tableContainer.innerHTML = '<p class="text-center text-xl text-indigo-500 p-8"><i class="fas fa-spinner fa-spin mr-2"></i> データを読み込み中...</p>';
        
        try {
            const queryString = new URLSearchParams(params).toString();
            // ★ 修正ポイント4: 実機APIエンドポイントを使用
            const url = `${MAIN_MACHINE_API_URL}/productionlogs?${queryString}`; 

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'サーバーエラーが発生しました。');
            }

            const logs = await response.json();
            
            if (logs.length === 0) {
                tableContainer.innerHTML = '<p class="text-center text-gray-500 p-8">条件に一致する作業履歴はありません。</p>';
                return;
            }

            // テーブルのHTML構築 (省略...)
            let tableHtml = `
                <table class="min-w-full divide-y divide-gray-300">
                    <thead class="bg-indigo-600">
                        <tr>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-white">作業者ID</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-white">記録日時</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-white">開始時刻</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-white">終了時刻</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-white">製造個数</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-white">不良数</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-white">不良率</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            logs.forEach(log => {
                let statusLabel = '';
                let userDisplayClass = 'text-gray-600'; 
                
                if (log.is_active === 0) {
                    userDisplayClass = 'text-red-600 font-bold'; 
                    statusLabel = '<span class="ml-2">(退会済み)</span>'; 
                }

                const isAbnormal = log.defective_rate < 0 || log.defective_rate > 1; 
                const rowClass = (log.defective_count > 0 || isAbnormal) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50';
                
                tableHtml += `
                    <tr class="${rowClass}">
                        <td class="px-4 py-3 whitespace-nowrap text-sm ${userDisplayClass}">${log.user_id}${statusLabel}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${formatTimestamp(log.produced_at)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${formatTimestamp(log.production_start)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${formatTimestamp(log.production_end)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">${log.quantity}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">${log.defective_count}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">${(log.defective_rate * 100).toFixed(2)}%</td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;

            tableContainer.innerHTML = tableHtml;

        } catch (error) {
            console.error('製造記録の取得に失敗:', error);
            tableContainer.innerHTML = `<p class="text-center text-red-600 p-8"><i class="fas fa-exclamation-triangle mr-2"></i> データ取得エラー: ${error.message}</p>`;
        }
    }

    
    //検索ボタンクリック時の処理 (省略...)
    searchButton.addEventListener('click', () => {
        const yearFrom = yearFromInput.value;
        const monthFrom = monthFromInput.value;
        const yearTo = yearToInput.value;
        const monthTo = monthToInput.value;
        const userId = userFilterSelect.value;
        
        const params = {};
        
        // Fromの日付を作成: YYYY-MM-01 を検索開始日とする
        if (yearFrom && monthFrom) {
            params.from_date = `${yearFrom}-${monthFrom.padStart(2, '0')}-01`;
        }
        
        // Toの日付を作成: その月の最終日を検索終了日とする
        if (yearTo && monthTo) {
            const year = parseInt(yearTo);
            const monthIndex = parseInt(monthTo) - 1; 
            
            const nextMonthFirstDay = new Date(year, monthIndex + 1, 1);
            nextMonthFirstDay.setDate(nextMonthFirstDay.getDate() - 1); 
            
            const Y = nextMonthFirstDay.getFullYear();
            const M = String(nextMonthFirstDay.getMonth() + 1).padStart(2, '0');
            const D = String(nextMonthFirstDay.getDate()).padStart(2, '0');
            
            params.to_date = `${Y}-${M}-${D}`;
        }
        
        if (userId) params.user_id = userId;
        
        fetchAndRenderProductionLogs(params);
    });
    
    // 初期ロード (省略...)
    fetchUsersForFilter(); 
    fetchAndSetDateFilters().then(() => {
        searchButton.click(); 
    }).catch(error => {
        console.error("初期ロードエラー:", error);
    });

    // ホームに戻るボタンのイベントリスナー
    backButton.addEventListener('click', () => {
        // ★ 修正ポイント5: ElectronAPIは使えないため、単純なページ遷移に修正
        window.location.href = 'index.html'; 
    });
});