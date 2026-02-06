document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('external-add-button');
    const countInput = document.getElementById('box-count-input');
    const workQueueList = document.getElementById('work-queue-list');
    const startWorkButton = document.getElementById('start-work-button');
    const START_TASK_API_BASE_URL = '/api/proxy_start';
    let workQueue = [];




    window.showCustomModal = function(message, type = 'alert') {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-modal');
            const modalMessage = document.getElementById('modal-message');
            const okButton = document.getElementById('modal-ok-button');
            const cancelButton = document.getElementById('modal-cancel-button');
    
            modalMessage.textContent = message;
            modal.classList.remove('hidden');
    
            if (type === 'confirm') {
                cancelButton.classList.remove('hidden');
            } else {
                cancelButton.classList.add('hidden');
            }
    
            const handleOk = () => {
                modal.classList.add('hidden');
                okButton.removeEventListener('click', handleOk);
                resolve(true);
            };
    
            const handleCancel = () => {
                modal.classList.add('hidden');
                cancelButton.removeEventListener('click', handleCancel);
                resolve(false);
            };
    
            okButton.addEventListener('click', handleOk);
            cancelButton.addEventListener('click', handleCancel);
        });
    };
    
    // --- 1. JSONファイルを読み込んで画面を更新する関数 ---
    async function syncWithJSON() {
        try {
            // flask_app4.py (8000番) 経由で JSON を取得
            const response = await fetch('/GUIver4/queue_input.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('同期に失敗しました');

            const data = await response.json();
            
            // dataが [[...]] の二重リストだった場合でも正しく展開し、要素を補完する
            const rawItems = (Array.isArray(data) && Array.isArray(data[0])) ? data[0] : (Array.isArray(data) ? data : []);

            // 実機側とのデータ構造の不一致を防ぐためのマッピング
            workQueue = rawItems.map(item => {
                const countNum = parseInt(item.boxCount || item.count) || 0;
                const timeNum = parseInt(item.estimatedTime) || 0;
                return {
                    id: item.id || Math.floor(Date.now() + Math.random()),
                    name: item.name || item.material || "N式段ボール",
                    boxCount: countNum,
                    count: countNum,
                    estimatedTime: timeNum,
                    remainingTime: item.remainingTime !== undefined ? item.remainingTime : timeNum,
                    status: item.status || 'waiting',
                    completed: item.completed || false,
                    startedAt: item.startedAt || null,
                    notify: item.notify || false
                };
            });

            renderQueue();
            console.log("同期完了:", workQueue);
        } catch (error) {
            console.error("Sync Error:", error);
            // 読み込みエラー時は警告を出す（初回起動時などは無視してOK）
        }
    }

    async function startTaskOnServer(taskId, userId, quantity) {
        const API_START_URL = `${START_TASK_API_BASE_URL}/${taskId}`;
        
        const payload = {
            user_id: userId,
            quantity: quantity,
            // Python側の期待に合わせてキー名を start_time_ts に統一
            start_time_ts: new Date().getTime() / 1000 
        };
    
        try {
            const response = await fetch(API_START_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            // ★まず中身を一度だけテキストとして取り出す
            const responseText = await response.text();
            
            if (!response.ok) {
                // サーバーからの具体的なエラーメッセージを表示
                console.error("サーバー側エラー内容:", responseText);
                throw new Error(`HTTP Error! Status: ${response.status} - ${responseText}`);
            }
            
            // 成功時はテキストをJSONオブジェクトに変換
            const resultData = JSON.parse(responseText);
            console.log(`タスク ${taskId} の開始を記録しました。`, resultData);
            
            return resultData.startedAt;
    
        } catch (error) {
            console.error('タスク開始時刻の記録に失敗しました:', error);
            // モーダル表示
            await window.showCustomModal(`エラー: ${error.message}`, 'alert');
            return null;
        }
    }

    // --- 2. リストを画面に描画する関数 ---
    function renderQueue() {
        if (!workQueueList) return;
        workQueueList.innerHTML = '';
        const displayTasks = workQueue.filter(item => item.type !== "memo");

        if (workQueue.length === 0) {
            workQueueList.innerHTML = '<p class="text-center text-gray-500 mt-4">作業はありません。</p>';
            return;
        }

        workQueue.forEach((item) => {
            const div = document.createElement('div');
            div.className = `queue-item ${item.completed ? 'opacity-50' : ''}`;
            const displayCount = item.boxCount || item.count || 0;
            
            // 状態によって表示テキストを変える
            let statusText = '待機中';
            if (item.completed) statusText = '完了';
            else if (item.startedAt) statusText = '実行中';

            div.innerHTML = `
                <div class="queue-item-details p-4 border-b border-gray-200">
                    <p class="font-bold text-lg">${item.name} (${displayCount}枚)</p>
                    <p class="text-sm ${item.startedAt ? 'text-blue-600 font-bold' : 'text-gray-600'}">
                        ステータス: ${statusText}
                    </p>
                </div>
            `;
            workQueueList.appendChild(div);
        });
    }

    // --- 3. 「追加」ボタンの処理 (全件送信) ---
    if (addButton) {
        addButton.addEventListener('click', async () => {
            const count = parseInt(countInput.value) || 0;
            if (count <= 0) { alert("枚数を入力してください"); return; }

            // --- ID生成ロジックの修正 ---
            // 現在のworkQueueの中から最大のIDを取得して+1する。空なら1から開始。
            const maxId = workQueue.length > 0 
                ? Math.max(...workQueue.map(t => parseInt(t.id) || 0)) 
                : 0;
            const newId = maxId + 1;
            // -------------------------

            const estimatedTime = count * 90; // 1枚90秒計算

            // 【完全統一】実機側が必要とする全プロパティをセット
            const newTask = {
                id: String(newId), // サーバー側の比較処理(str)に合わせるため文字列に変換
                name: "N式段ボール",
                boxCount: count,
                count: count,
                estimatedTime: estimatedTime,
                remainingTime: estimatedTime, 
                notify: false,                
                completed: false,             
                startedAt: null,              
                status: 'waiting'
            };

            // 今のリストの末尾に新しいタスクを追加した「全リスト」を作成
            const updatedQueue = [...workQueue, newTask];

            try {
                const response = await fetch('/api/proxy_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedQueue) // 全リストで上書き送信
                });

                if (response.ok) {
                    alert(`追加しました(ID: ${newId})。実機と同期されます。`);
                    countInput.value = "0";
                    await syncWithJSON(); // 画面を更新
                }
            } catch (error) {
                console.error("送信エラー:", error);
                alert("送信に失敗しました。");
            }
        });
    }
    
    // 5. ホームに戻るボタンイベント
    document.getElementById('back-to-home-button').addEventListener('click', function() {
        window.location.href = 'index.html';
    });


    startWorkButton?.addEventListener('click', async () => {
        const firstUncompletedTask = workQueue.find(t => !t.completed);

        if (!firstUncompletedTask) {
            await window.showCustomModal('現在、開始できる未完了のタスクはありません。', 'alert');
            //stopTimer();
            return;
        }
        
        if (firstUncompletedTask.startedAt) {
            await window.showCustomModal('既に作業は開始され、実行中です。', 'alert');
            //startTimer(); 
            return;
        }

        // queueで送信するデータの取得 
        const currentUserId = 'operator005';
        const boxCount = firstUncompletedTask.boxCount; // 数量はタスクデータから取得
        const startedAt = await startTaskOnServer(
            firstUncompletedTask.id,
            currentUserId, 
            boxCount
        );
        
        if (startedAt) {
            firstUncompletedTask.startedAt = startedAt;
            //startTimer(); 
            await window.showCustomModal(`${firstUncompletedTask.name} の作業を開始しました。`, 'alert');
        } else {
            await window.showCustomModal('作業の開始時刻記録に失敗しました。', 'alert');
        }
        
        
        renderQueue(); 
    });
   

    // 初回実行：ページを開いたときに自動で同期
    syncWithJSON();
    setInterval(() => {
        syncWithJSON();
    }, 3000);
});