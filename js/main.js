/**
 * MTKB EC Plate Downloader - Main Logic
 */

let allPlates = [];
let i18n = {};

// 支持的語言列表
const supportedLangs = ['zh-tw', 'zh-cn', 'en'];

/**
 * 自動識別並獲取初始語言
 */
function getInitialLang() {
    // 1. 檢查用戶是否之前手動選過語言
    const savedLang = localStorage.getItem('lang');
    if (savedLang && supportedLangs.includes(savedLang)) {
        return savedLang;
    }

    // 2. 獲取瀏覽器語言
    const browserLang = navigator.language.toLowerCase();

    // 判斷邏輯
    if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
        return 'zh-tw';
    } else if (browserLang.startsWith('zh')) {
        return 'zh-cn';
    } else {
        // 預設語言：英文
        return 'en';
    }
}

// 設置當前語言
let currentLang = getInitialLang();

/**
 * 初始化應用
 */
async function initApp() {
    const spinner = document.getElementById('loading-spinner');
    const form = document.getElementById('config-form');

    try {
        // 同時獲取佈局數據與對應語言包
        const [cfgRes, langRes] = await Promise.all([
            fetch('config/cfg.json'),
            fetch(`i18n/${currentLang}.json`)
        ]);

        if (!cfgRes.ok) throw new Error(`Config load failed (${cfgRes.status})`);
        if (!langRes.ok) throw new Error(`Language pack load failed (${langRes.status})`);

        const cfgData = await cfgRes.json();
        allPlates = cfgData.plate;
        i18n = await langRes.json();

        // 1. 更新 UI 靜態文字 (從語言包讀取)
        updateStaticUI();

        // 2. 初始化 PCB 型號下拉選單
        const nameSelect = document.getElementById('plate-name-select');
        nameSelect.innerHTML = allPlates.map((p, index) => 
            `<option value="${index}">${p.name.toUpperCase()}</option>`
        ).join('');

        // 3. 監聽型號切換
        nameSelect.onchange = (e) => renderFields(allPlates[e.target.value]);

        // 4. 執行初始渲染（第一款型號）
        renderFields(allPlates[0]);

        // 顯示表單並隱藏載入動畫
        spinner.classList.add('hidden');
        form.classList.remove('hidden');

    } catch (err) {
        console.error("Initialization error:", err);
        spinner.innerHTML = `
            <div class="mdui-text-color-red">
                <i class="mdui-icon material-icons">error</i><br>
                ${err.message}<br>
                <button class="mdui-btn mdui-btn-raised mdui-m-t-2" onclick="location.reload()">Retry</button>
            </div>`;
    }
}

/**
 * 更新頁面靜態文字
 */
function updateStaticUI() {
    document.title = i18n.ui.title || "MTKB Downloader";
    
    const elements = {
        'ui-title': i18n.ui.title,
        'ui-plate-label': i18n.ui.plate_label,
        'ui-params-label': i18n.ui.params_label,
        'ui-download-btn': i18n.ui.download_btn
    };

    for (const [id, text] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            // 如果是按鈕且有圖標，保持圖標結構
            if (id === 'ui-download-btn') {
                el.innerHTML = `<i class="mdui-icon material-icons mdui-icon-left">file_download</i> ${text}`;
            } else {
                el.innerText = text;
            }
        }
    }
}

/**
 * 根據選擇的型號動態生成詳細參數表單
 */
function renderFields(plate) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    // 定義 JSON 中可能存在的按鍵 Key
    const fieldKeys = ['caps', 'bs', 'lshift', 'rshift', 'enter', 'bottom_row'];

    fieldKeys.forEach(key => {
        const item = plate[key];
        // 僅當該項目 enabled 為 true 時才渲染
        if (item && item.enabled) {
            const labelText = i18n.fields[key] || key;
            const div = document.createElement('div');
            div.className = 'option-item mdui-m-y-2';
            
            // 生成選項清單，優先使用語言包翻譯
            const optionsHtml = item.types.map(t => {
                const translatedOption = i18n.options[t] || t;
                return `<option value="${t}">${translatedOption}</option>`;
            }).join('');

            div.innerHTML = `
                <label class="mdui-typo-caption-track">${labelText}</label>
                <select class="mdui-select" data-key="${key}" style="width: 100%">
                    ${optionsHtml}
                </select>
            `;
            container.appendChild(div);
        }
    });

    // 重新渲染 MDUI 組件樣式
    mdui.mutation();
}

/**
 * 切換語言功能
 * @param {string} lang - 'zh-tw', 'zh-cn', 'en'
 */
window.changeLang = function(lang) {
    if (supportedLangs.includes(lang)) {
        localStorage.setItem('lang', lang);
        location.reload(); 
    }
};

/**
 * 下載配置 JSON
 */
window.downloadConfig = function() {
    const nameIdx = document.getElementById('plate-name-select').value;
    const plate = allPlates[nameIdx];
    
    // 構建輸出的 JSON 結構
    const output = {
        board_name: plate.name,
        export_time: new Date().toISOString(),
        language: currentLang,
        settings: {}
    };

    // 收集所有選擇的 select 值
    document.querySelectorAll('#options-container select').forEach(s => {
        const key = s.getAttribute('data-key');
        output.settings[key] = s.value;
    });

    // 執行下載
    const blob = new Blob([JSON.stringify(output, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTKB_Plate_${plate.name}_Config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 顯示成功提示
    mdui.snackbar({
        message: i18n.ui.download_btn + " OK",
        position: 'right-bottom'
    });
};

// 頁面加載完成後啟動應用
document.addEventListener('DOMContentLoaded', initApp);