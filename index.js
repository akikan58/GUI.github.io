document.addEventListener('DOMContentLoaded', () => {
    const postBtn = document.getElementById('post-button');
    const memoInput = document.getElementById('memoinpt');

    if (postBtn) {
        postBtn.addEventListener('click', async () => {
            const memoContent = memoInput.value.trim();
            if (!memoContent) { alert("メモの内容を入力してください"); return; }

            try {
                // 1. 現在の全データを取得（既存のタスクを消さないため）
                const res = await fetch('/GUIver4/queue_input.json', { cache: 'no-store' });
                let currentQueue = await res.json();
                if (!Array.isArray(currentQueue)) currentQueue = [];

                // 2. ID生成
                const maxId = currentQueue.length > 0 
                    ? Math.max(...currentQueue.map(t => parseInt(t.id) || 0)) 
                    : 0;
                const newId = maxId + 1;

                // 3. メモ用アイテムの作成 (type: "memo" を付与)
                const newMemoItem = {
                    id: String(newId),
                    content: String(memoContent),
                    type: "memo", // 💡 これで区別
                    name: "共有メモ",
                    status: "waiting",
                    completed: false,
                    startedAt: null,
                    notify: false
                };

                // 4. 合体させて送信
                const updatedQueue = [...currentQueue, newMemoItem];
                const response = await fetch('/api/proxy_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedQueue)
                });

                if (response.ok) {
                    alert(`メモを共有しました`);
                    memoInput.value = "";
                    // 必要ならここにメモ一覧の再描画処理を追加
                }
            } catch (error) {
                console.error("送信エラー:", error);
            }
        });
    }
    function escapeHTML(str) {
        if (typeof str !== 'string') {
            return ''; 
        }
        
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }
    window.deleteMemo = async function(id) {
        const confirmed = window.confirm("このメモを削除しますか？");
        if (!confirmed) return;
    
        try {
            // 1. 最新のデータを取得
            const JSON_FILE_URL = '/GUIver4/queue_input.json';
            const res = await fetch(JSON_FILE_URL, { cache: "no-store" });
            const allData = await res.json();
    
            // 2. 指定されたIDのメモを除外する
            // 全体のリスト(allData)から、削除したいID以外のものを残す
            const updatedData = allData.filter(item => String(item.id) !== String(id));
    
            // 3. サーバーへ保存
            const response = await fetch('/api/proxy_update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
    
            if (response.ok) {
                // 4. 画面を即時更新
                syncMemosFromJSON();
            } else {
                alert("削除に失敗しました。");
            }
        } catch (error) {
            console.error("削除エラー:", error);
        }
    }
    async function syncMemosFromJSON() {
        // 💡 file:// ではなく http:// 経由でアクセスするように固定
        const JSON_FILE_URL = 'http://127.0.0.1:8000/GUIver4/queue_input.json';
        const memoListContainer = document.getElementById('memo-list');
    
        try {
            const response = await fetch(JSON_FILE_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("JSONファイルが見つかりません");
    
            const data = await response.json();
            
            // データの正規化
            const items = (Array.isArray(data) && Array.isArray(data[0])) 
                ? data[0] 
                : (Array.isArray(data) ? data : [data]);
    
            if (!memoListContainer) return;
    
            // type: "memo" のみを抽出
            const memos = items.filter(item => item.type === "memo");
    
            if (memos.length === 0) {
                memoListContainer.innerHTML = '<p class="no-memo-msg">現在、お知らせはありません。</p>';
                return;
            }
            
            memoListContainer.innerHTML = memos.slice().reverse().map(m => `
                <div class="memo-card">
                    <button class="memo-delete-btn" onclick="deleteMemo('${m.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <p class="memo-content">${escapeHTML(m.content)}</p>
                    <div class="memo-footer">
                        <span>管理番号: ${m.id}</span>
                    </div>
                </div>
            `).join('');
    
        } catch (error) {
            console.error("メモ取り込みエラー:", error);
        }
    }

    async function updateMemoBoard() {
        try {
            const res = await fetch('/GUIver4/queue_input.json', { cache: 'no-store' });
            const data = await res.json();
            const memoListContainer = document.getElementById('memo-list');
            if (!memoListContainer) return;
    
            // 💡 type: "memo" のものだけを抽出
            const memos = data.filter(item => item.type === "memo");
    
            memoListContainer.innerHTML = memos.slice().reverse().map(m => `
                <div class="memo-card">
                    <button class="memo-delete-btn" onclick="deleteMemo('${m.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <p class="memo-content">${escapeHTML(m.content)}</p>
                    <div class="memo-footer">
                        <span>管理番号: ${m.id}</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("メモ取得失敗", e);
        }
    }
    
    // 初回実行と定期更新
    updateMemoBoard();
    setInterval(updateMemoBoard, 5000);
});