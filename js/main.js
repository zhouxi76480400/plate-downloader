/**
 * MTKB EC Plate Downloader - Final Static Version
 */

let allPlates = [];
let i18n = {};
const supportedLangs = ['zh-tw', 'zh-cn', 'en'];

/**
 * 自動識別並獲取語言設定
 */
function getInitialLang() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && supportedLangs.includes(savedLang)) return savedLang;

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) return 'zh-tw';
    if (browserLang.startsWith('zh')) return 'zh-cn';
    return 'en';
}

let currentLang = getInitialLang();

/**
 * 啟動 App
 */
async function initApp() {
    const spinner = document.getElementById('loading-spinner');
    const form = document.getElementById('config-form');

    try {
        const [cfgRes, langRes] = await Promise.all([
            fetch('config/cfg.json'),
            fetch(`i18n/${currentLang}.json`)
        ]);

        if (!cfgRes.ok || !langRes.ok) throw new Error('Load failed');

        allPlates = (await cfgRes.json()).plate;
        i18n = await langRes.json();

        // 更新 UI
        document.title = i18n.ui.title;
        document.getElementById('ui-title').innerText = i18n.ui.title;
        document.getElementById('ui-plate-label').innerText = i18n.ui.plate_label;
        document.getElementById('ui-params-label').innerText = i18n.ui.params_label;
        document.getElementById('ui-download-btn').innerHTML = 
            `<i class="mdui-icon material-icons mdui-icon-left">file_download</i> ${i18n.ui.download_btn}`;

        // 初始化型號下拉選單
        const nameSelect = document.getElementById('plate-name-select');
        nameSelect.innerHTML = allPlates.map((p, index) => 
            `<option value="${index}">${p.name.toUpperCase()}</option>`
        ).join('');

        nameSelect.onchange = (e) => renderFields(allPlates[e.target.value]);
        renderFields(allPlates[0]);

        spinner.classList.add('hidden');
        form.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        document.getElementById('loading-spinner').innerHTML = `<p class="mdui-text-color-red">Error: ${err.message}</p>`;
    }
}

/**
 * 生成配置項
 */
function renderFields(plate) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    // 依照順序渲染欄位
    const keys = ['caps', 'bs', 'lshift', 'rshift', 'enter', 'bottom_row'];

    keys.forEach(key => {
        const item = plate[key];
        if (item && item.enabled) {
            const div = document.createElement('div');
            div.className = 'option-item';
            
            const optionsHtml = item.types.map(t => 
                `<option value="${t}">${i18n.options[t] || t}</option>`
            ).join('');

            div.innerHTML = `
                <label class="mdui-typo-caption-track">${i18n.fields[key] || key}</label>
                <select class="mdui-select" data-key="${key}" style="width: 100%">
                    ${optionsHtml}
                </select>
            `;
            container.appendChild(div);
        }
    });
    mdui.mutation();
}

/**
 * 執行下載 (包含 404 檢查與翻譯)
 */
window.downloadConfig = async function() {
    const nameIdx = document.getElementById('plate-name-select').value;
    const plate = allPlates[nameIdx];
    const plateName = plate.name.toLowerCase();

    // 拼接文件名：型號_參數1_參數2...
    const selects = document.querySelectorAll('#options-container select');
    const params = Array.from(selects).map(s => s.value);
    const fileName = `${plateName}_${params.join('_')}.dxf`;
    const filePath = `plate/${plateName}/${fileName}`;

    try {
        // HEAD 請求檢查文件是否存在
        const checkRes = await fetch(filePath, { method: 'HEAD' });
        
        if (!checkRes.ok) {
            // 從 i18n 讀取報錯提示，若無則顯示預設
            const msg = i18n.ui.error_404 || "File not found.";
            mdui.alert(msg);
            return;
        }

        // 下載文件
        const a = document.createElement('a');
        a.href = filePath;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        mdui.snackbar({ message: 'OK: ' + fileName, position: 'right-bottom' });

    } catch (e) {
        mdui.snackbar({ message: 'Error accessing server', position: 'right-bottom' });
    }
};

window.changeLang = function(lang) {
    localStorage.setItem('lang', lang);
    location.reload();
};

document.addEventListener('DOMContentLoaded', initApp);