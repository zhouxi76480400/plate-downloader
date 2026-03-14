/**
 * MTKB EC Plate Downloader - Maintenance Version
 */

let allPlates = []
let allFirmwares = []
let i18n = {};
const supportedLangs = ['zh-tw', 'zh-cn', 'en'];

// 語系初始化
function getInitialLang() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && supportedLangs.includes(savedLang)) return savedLang;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) return 'zh-tw';
    if (browserLang.startsWith('zh')) return 'zh-cn';
    return 'en';
}

let currentLang = getInitialLang();

// 啟動 App
async function initApp() {
    const spinner = document.getElementById('loading-spinner');
    const form = document.getElementById('config-form');

    try {
        const [cfgRes, langRes] = await Promise.all([
            fetch('config/cfg.json'),
            fetch(`i18n/${currentLang}.json`)
        ]);

        if (!cfgRes.ok || !langRes.ok) throw new Error('Load failed');

        const cfgData = await cfgRes.json();
        allPlates = cfgData.plate;
        allFirmwares = cfgData.fw;
        i18n = await langRes.json();

        updateUI();
        addPlateOptions();
        addFirmwareItems();

        spinner.classList.add('hidden');
        form.classList.remove('hidden');
    } catch (err) {
        spinner.innerHTML = `<p class="mdui-text-color-red">Error: ${err.message}</p>`;
    }
}

function addPlateOptions() {
    const nameSelect = document.getElementById('plate-name-select');
    nameSelect.innerHTML = allPlates.map((p, index) =>
        `<option value="${index}">${p.name.toUpperCase()}</option>`
    ).join('');

    nameSelect.onchange = (e) => renderFields(allPlates[e.target.value]);
    renderFields(allPlates[0]);
}

function addFirmwareItems() {
    const listContainer = document.getElementById('firmware-list');
    for (let i = 0; i < allFirmwares.length; i++) {
        const fw = allFirmwares[i];
        listContainer.insertAdjacentHTML("beforeend", `
            <div class="mdui-list-item mdui-ripple" onclick="downloadFW(${i})">
                <i class="mdui-list-item-icon mdui-icon material-icons">layers</i>
                    <div class="mdui-list-item-content">
                        <div class="mdui-list-item-title">${fw.name}</div>
                        <div class="mdui-list-item-text">${fw.ver} / ${fw.updated}</div>
                    </div>
                <i class="mdui-icon material-icons">file_download</i>
            </div>
        `);
    }
}

function updateUI() {
    document.title = i18n.ui.title;
    document.getElementById('ui-tab-plate').innerText = i18n.ui.card_plate;
    document.getElementById('ui-title').innerText = i18n.ui.card_plate;
    document.getElementById('ui-plate-label').innerText = i18n.ui.plate_label;
    document.getElementById('ui-params-label').innerText = i18n.ui.params_label;
    document.getElementById('ui-download-btn').innerHTML =
        `<i class="mdui-icon material-icons mdui-icon-left">file_download</i> ${i18n.ui.download_btn}`;
    document.getElementById('ui-tab-fw').innerText = i18n.ui.card_fw;
    // document.getElementById('ui-title-fw').innerText = i18n.ui.card_fw;
}

// 渲染參數 (包含自動隱藏邏輯)
function renderFields(plate) {
    const container = document.getElementById('options-container');
    const paramsSection = document.getElementById('params-section');
    container.innerHTML = '';

    const fieldKeys = ['pcb', 'caps', 'bs', 'lshift', 'rshift', 'enter', 'bottom_row'];

    // 檢查有無啟用參數
    const hasOptions = fieldKeys.some(key => plate[key] && plate[key].enabled);

    if (!hasOptions) {
        paramsSection.classList.add('hidden');
    } else {
        paramsSection.classList.remove('hidden');
        fieldKeys.forEach(key => {
            const item = plate[key];
            if (item && item.enabled) {
                const div = document.createElement('div');
                div.className = 'option-item';
                div.innerHTML = `
                    <label>${i18n.fields[key] || key}</label>
                    <select class="mdui-select" data-key="${key}" style="width: 100%">
                        ${item.types.map(t => `<option value="${t}">${i18n.options[t] || t}</option>`).join('')}
                    </select>`;
                container.appendChild(div);
            }
        });
    }
    mdui.mutation();
}

// 下載 CAD 文件
window.downloadConfig = async function () {
    const nameIdx = document.getElementById('plate-name-select').value;
    const plate = allPlates[nameIdx];
    const plateName = plate.name.toLowerCase();

    const selects = document.querySelectorAll('#options-container select');
    const params = Array.from(selects).map(s => s.value);

    // 檔名：如果沒參數就叫 em60.dxf，有參數就拼起來
    const fileName = params.length > 0 ? `${plateName}_${params.join('_')}.dxf` : `${plateName}.dxf`;
    const filePath = `plate/${plateName}/${fileName}`;

    downloadCommom(fileName, filePath);
};

window.downloadFW = async function (fwIndex) {
    const fw = allFirmwares[fwIndex];
    const fileName = fw.file_name;
    const filePath = `fw/${fileName}`;
    downloadCommom(fileName, filePath);
}

window.downloadCommom = async function (fileName, filePath) {
    try {
        const check = await fetch(filePath, { method: 'HEAD' });
        if (!check.ok) {
            mdui.alert(i18n.ui.error_404 || "File not found.");
            return;
        }
        const a = document.createElement('a');
        a.href = filePath; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        mdui.snackbar({ message: 'OK: ' + fileName });
    } catch (e) {
        mdui.snackbar({ message: 'Error' });
    }
}

window.changeLang = (lang) => { localStorage.setItem('lang', lang); location.reload(); };
document.addEventListener('DOMContentLoaded', initApp);