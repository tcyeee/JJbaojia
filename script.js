/**
 * Wall Painting Quote Tool - Logic V0
 *
 * Logic Points:
 * 1. Type unit price defaults in PRICES.type
 * 2. Area Discount: Unified per ㎡
 * 3. Scene Coeff: Outdoor=+20%, Ceiling=+20%, Ground=+30%
 * 4. Customer Coeff: Company=+30%
 * 5. Minimum Price: <=10m2 -> Min 5000
 */

// Constants
const PRICES = {
    type: {
        'line': 300,        // 线条简约
        'illustration': 450, // 插画设计
        'painterly': 650,   // 艺术肘理
        'realism': 900      // 写实/3D
    },
    scene: {
        'indoor': 1.0,
        'outdoor': 1.2,
        'ceiling': 1.2,
        'ground': 1.3
    }
};

const RULES = {
    minAreaThreshold: 10,
    minPrice: 5000,
    discountPerSqm: 50
};

const CAPTURE_SCALE = 6;

// DOM Elements
const inputs = {
    customerName: document.getElementById('customerName'),
    area: document.getElementById('areaInput'),
    types: document.getElementsByName('artType'),
    scenes: document.getElementsByName('scene'),
    typePrices: {
        line: document.getElementById('price-line'),
        illustration: document.getElementById('price-illustration'),
        painterly: document.getElementById('price-painterly'),
        realism: document.getElementById('price-realism')
    },
    discountFlat: document.getElementById('discount-flat-value'),
    discountMaterial: document.getElementById('discount-material-value')
};

const display = {
    price: document.getElementById('finalPrice'),
    badges: document.getElementById('logicBadges'),
    priceWarning: document.getElementById('final-price-warning')
};

// Helper: Get Checked Radio Value
function getRadioValue(nodeList) {
    for (const radio of nodeList) {
        if (radio.checked) return radio.value;
    }
    return null;
}

// Helper: Get type price with fallback to defaults
function getTypeUnitPrice(typeKey) {
    const input = inputs.typePrices?.[typeKey];
    if (!input) return PRICES.type[typeKey];

    const value = parseFloat(input.value);
    return Number.isFinite(value) && value > 0 ? value : PRICES.type[typeKey];
}

function getDiscountPerSqm() {
    const flat = parseFloat(inputs.discountFlat?.value);
    return Number.isFinite(flat) && flat >= 0 ? flat : RULES.discountPerSqm;
}

function getMaterialDiscount() {
    const material = parseFloat(inputs.discountMaterial?.value);
    return Number.isFinite(material) && material >= 0 ? material : 0;
}

// Helper: Toggle visible price input by selected type
function updateTypePriceVisibility() {
    const selected = getRadioValue(inputs.types);
    Object.entries(inputs.typePrices).forEach(([type, input]) => {
        const item = input?.closest('.custom-price-item');
        if (!item) return;
        if (type === selected) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// Format Currency
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0
});

// Animation: Count Up
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = currencyFormatter.format(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Core Calculation Logic
function calculate() {
    // 1. Get Inputs
    const area = parseFloat(inputs.area.value) || 0;
    // 2. Base Unit Price from Type & Complexity
    const type = getRadioValue(inputs.types);
    const scene = getRadioValue(inputs.scenes);

    if (area <= 0) {
        display.price.textContent = '0';
        display.badges.innerHTML = '';
        return;
    }

    const typePrice = getTypeUnitPrice(type);

    // 3. Area Discount Logic
    const discountPerSqm = getDiscountPerSqm();
    const materialDiscount = getMaterialDiscount();

    let discountedUnit = typePrice - discountPerSqm;

    // 4. Subtotal
    let subtotal = discountedUnit * area;

    // 5. Coefficients
    const sceneCoeff = PRICES.scene[scene] || 1.0;

    let total = subtotal * sceneCoeff;

    // 6. Material discount on total
    total -= materialDiscount;

    // Ensure non-negative before boundary checks
    total = Math.max(total, 0);

    // 6. Boundary Rules (Min Price)
    let appliedRule = null;
    if (area <= RULES.minAreaThreshold) {
        if (total < RULES.minPrice) {
            total = RULES.minPrice;
            appliedRule = '起步价保护';
        }
    }

    // 7. Update UI
    const finalPrice = Math.round(total);

    const currentDisplayed = parseInt(display.price.textContent.replace(/,/g, '')) || 0;
    if (currentDisplayed !== finalPrice) {
        animateValue(display.price, currentDisplayed, finalPrice, 400);
    }

    // Badges
    const badges = [];
    if (discountPerSqm > 0) {
        badges.push(`<span class="badge discount">大面积优惠 -${discountPerSqm}/㎡</span>`);
    }
    if (materialDiscount > 0) {
        badges.push(`<span class="badge discount">材料减免 -¥${materialDiscount}</span>`);
    }
    if (appliedRule) {
        badges.push(`<span class="badge boundary">${appliedRule} (¥${RULES.minPrice})</span>`);
    }

    if (display.badges) {
        display.badges.innerHTML = badges.join('');
    }

    // Price warning
    if (display.priceWarning) {
        if (appliedRule) {
            display.priceWarning.textContent = `${appliedRule}，按 ¥${RULES.minPrice.toLocaleString()} 计价`;
            display.priceWarning.classList.remove('hidden');
        } else {
            display.priceWarning.classList.add('hidden');
        }
    }

    // 8. Update Technical Breakdown (Removed in UI)
    // Code removed as elements no longer exist

    // 9. Update Sidebar Preview Card (Real-time) - pass computed total to avoid animation delay mismatch
    updatePreviewUI(finalPrice);
}

// Event Listeners
inputs.area.addEventListener('input', () => {
    localStorage.setItem('painting_area', inputs.area.value);
    calculate();
});
const handleTypeChange = () => {
    updateTypePriceVisibility();
    calculate();
};

inputs.types.forEach(r => r.addEventListener('change', handleTypeChange));
inputs.scenes.forEach(r => r.addEventListener('change', calculate));
Object.values(inputs.typePrices).forEach(input => {
    if (input) input.addEventListener('input', calculate);
});
if (inputs.discountFlat) {
    inputs.discountFlat.addEventListener('input', calculate);
}
if (inputs.discountMaterial) {
    inputs.discountMaterial.addEventListener('input', calculate);
}

// Customer Name Event
inputs.customerName.addEventListener('input', () => {
    updatePreviewUI();
});

// Copy Image Event
const copyBtn = document.getElementById('copy-quote-btn');

copyBtn.addEventListener('click', async () => {
    const target = document.getElementById('sidebar-quote');
    const originalText = copyBtn.innerHTML;

    try {
        copyBtn.textContent = '正在生成并复制...';
        copyBtn.disabled = true;

        // Add capturing class to hide button from screenshot
        target.classList.add('capturing');

        // Wait for fonts to load to ensure icons are captured
        await document.fonts.ready;

        // Get the actual rendered dimensions
        const rect = target.getBoundingClientRect();

        const canvas = await html2canvas(target, {
            useCORS: true,
            allowTaint: true,
            scale: CAPTURE_SCALE,
            backgroundColor: '#ffffff',
            logging: false,
            width: rect.width,
            height: rect.height,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            onclone: (clonedDoc) => {
                const clonedTarget = clonedDoc.getElementById('sidebar-quote');
                const btn = clonedTarget.querySelector('.floating-copy-btn');
                if (btn) btn.style.display = 'none';
            }
        });

        canvas.toBlob(async (blob) => {
            try {
                if (navigator.clipboard && window.ClipboardItem) {
                    const data = [new ClipboardItem({ [blob.type]: blob })];
                    await navigator.clipboard.write(data);
                    copyBtn.textContent = `✅ ${Math.round(rect.width)}px -> ${canvas.width}px`;
                } else {
                    throw new Error('Clipboard API unavailable');
                }
            } catch (clipboardErr) {
                console.warn('Clipboard write failed, downloading instead:', clipboardErr);
                // Fallback: Trigger download
                const link = document.createElement('a');
                link.download = `姐姐墙绘报价_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL();
                link.click();
                copyBtn.textContent = '💾 已触发下载 (权限限制)';
            }

            target.classList.remove('capturing');
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.disabled = false;
            }, 2000);
        });
    } catch (err) {
        console.error('Copy failed:', err);
        target.classList.remove('capturing');
        copyBtn.textContent = '❌ 复制失败，请重试';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 2000);
    }
});

// Helper: Convert Image to DataURL to avoid tainted canvas (using Canvas for better file:// support)
const imageCache = new Map();
function getImageAsDataURL(url) {
    if (imageCache.has(url)) return Promise.resolve(imageCache.get(url));

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            imageCache.set(url, dataURL);
            resolve(dataURL);
        };
        img.onerror = () => {
            console.warn('Failed to load image for DataURL:', url);
            resolve(url);
        };
        img.src = url;
    });
}

function getImageCoverDataURL(url, targetW, targetH, scale = 1) {
    const key = `${url}|${targetW}|${targetH}|${scale}`;
    if (imageCache.has(key)) return Promise.resolve(imageCache.get(key));
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const iw = img.width;
            const ih = img.height;
            const rw = targetW / iw;
            const rh = targetH / ih;
            const r = Math.max(rw, rh);
            const sw = Math.min(iw, Math.round(targetW / r));
            const sh = Math.min(ih, Math.round(targetH / r));
            const sx = Math.max(0, Math.round((iw - sw) / 2));
            const sy = Math.max(0, Math.round((ih - sh) / 2));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(targetW * scale));
            canvas.height = Math.max(1, Math.round(targetH * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/png');
            imageCache.set(key, dataURL);
            resolve(dataURL);
        };
        img.onerror = () => {
            resolve(url);
        };
        img.src = url;
    });
}

/**
 * Update Preview UI (For Sidebar)
 */
function updatePreviewUI(finalPriceValue) {
    const area = parseFloat(inputs.area.value) || 0;
    const type = getRadioValue(inputs.types);
    const sceneValue = getRadioValue(inputs.scenes);
    const finalPriceText = typeof finalPriceValue === 'number'
        ? currencyFormatter.format(finalPriceValue)
        : display.price.textContent;

    // Internal mapping to Client-Friendly Names & References
    // 使用本地已有的参考图，确保 file:// 或本地服务器均可加载
    const packMapping = {
        'line': { name: '线条简约', img: './public/type_1.png' },
        'illustration': { name: '现代插画', img: './public/type_2.jpg' },
        'painterly': { name: '创意涂鸦', img: './public/type_3.jpg' },
        'realism': { name: '3D写实', img: './public/type_4.JPG' } // 与写实共用现有素材
    };

    const pack = packMapping[type] || packMapping['illustration'];

    const sceneNames = {
        'indoor': '高品质室内',
        'outdoor': '商业外墙',
        'ceiling': '天顶艺术',
        'ground': '创意地面'
    };

    // Fees
    const discountPerSqm = getDiscountPerSqm();
    const materialDiscount = getMaterialDiscount();
    const discountFee = discountPerSqm * area + materialDiscount;

    // Update Elements (Using shared IDs if present in both, or specific selectors)
    // For sidebar mode, we use the IDs in index.html directly
    const styleNameEl = document.getElementById('preview-style-name');
    if (styleNameEl) styleNameEl.textContent = pack.name;

    const areaEl = document.getElementById('preview-area');
    if (areaEl) areaEl.textContent = `${area} m²`;

    const sceneEl = document.getElementById('preview-scene');
    if (sceneEl) sceneEl.textContent = sceneNames[sceneValue];

    const discountFeeEl = document.getElementById('preview-discount-fee');
    if (discountFeeEl) discountFeeEl.textContent = `- ¥${discountFee.toLocaleString()}`;

    const totalPriceRowEl = document.getElementById('preview-total-price-row');
    if (totalPriceRowEl) totalPriceRowEl.textContent = `¥${finalPriceText}`;

    const previewImgEl = document.getElementById('preview-style-img');
    if (previewImgEl && pack.img) {
        const container = document.querySelector('.quote-visual-ref');
        const w = Math.max(1, Math.round(container ? container.offsetWidth : previewImgEl.offsetWidth));
        const h = Math.max(1, Math.round(container ? container.offsetHeight : previewImgEl.offsetHeight));
        getImageCoverDataURL(pack.img, w, h, CAPTURE_SCALE).then(dataUrl => {
            previewImgEl.src = dataUrl;
        });
    }

    const previewDateEl = document.getElementById('preview-date');
    if (previewDateEl) previewDateEl.textContent = `Date: ${new Date().toLocaleDateString()}`;

    // Customer Name
    const customerNameEl = document.getElementById('preview-customer');
    const customerNameValue = inputs.customerName ? inputs.customerName.value.trim() : '';
    if (customerNameEl) {
        if (customerNameValue) {
            customerNameEl.textContent = `尊敬的 ${customerNameValue}`;
            customerNameEl.classList.remove('hidden');
        } else {
            customerNameEl.textContent = '';
            customerNameEl.classList.add('hidden');
        }
    }
}

// Load Cache
const cachedArea = localStorage.getItem('painting_area');
if (cachedArea) {
    inputs.area.value = cachedArea;
}

// Initial Calculation
updateTypePriceVisibility();
calculate();

// Add global fade-in
document.body.style.opacity = 0;
window.onload = () => {
    document.body.style.transition = 'opacity 0.6s ease';
    document.body.style.opacity = 1;
    // Force initial preview update
    updatePreviewUI();
};
