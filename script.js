/**
 * Wall Painting Quote Tool - Logic V0
 * 
 * Logic Constants:
 * 1. Type Median: A=400, B=800
 * 2. Complexity Median: Simple=150, Medium=400, Complex=1050
 * 3. Area Discounts: 150-300 = -50/m2, >300 = -100/m2
 * 4. Scene Coeff: Outdoor=+20%, Ceiling=+20%, Ground=+30%
 * 5. Customer Coeff: Company=+30%
 * 6. Minimum Price: <=10m2 -> Min 5000
 */

// Constants
const PRICES = {
    type: {
        'line': 300,        // 线条简约
        'illustration': 450, // 插画设计
        'painterly': 650,   // 艺术肘理
        'realism': 900      // 写实/3D
    },
    complexity: {
        'simple': 150,
        'medium': 400,
        'complex': 1050
    },
    scene: {
        'indoor': 1.0,
        'outdoor': 1.2,
        'ceiling': 1.2,
        'ground': 1.3
    },
    customer: {
        'individual': 1.0,
        'company': 1.3
    }
};

const RULES = {
    minAreaThreshold: 10,
    minPrice: 5000,
    discounts: [
        { min: 300, value: 100 }, // > 300
        { min: 150, value: 50 }   // 150 - 300
    ]
};

// DOM Elements
const inputs = {
    customerName: document.getElementById('customerName'),
    area: document.getElementById('areaInput'),
    types: document.getElementsByName('artType'),
    complexities: document.getElementsByName('complexity'),
    scenes: document.getElementsByName('scene'),
    customer: document.getElementById('customerToggle')
};

const display = {
    price: document.getElementById('finalPrice'),
    badges: document.getElementById('logicBadges')
};

// Helper: Get Checked Radio Value
function getRadioValue(nodeList) {
    for (const radio of nodeList) {
        if (radio.checked) return radio.value;
    }
    return null;
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
    const complexity = getRadioValue(inputs.complexities);
    const scene = getRadioValue(inputs.scenes);
    const isCompany = inputs.customer.checked;

    if (area <= 0) {
        display.price.textContent = '0';
        display.badges.innerHTML = '';
        return;
    }

    const typePrice = PRICES.type[type];
    const complexityPrice = PRICES.complexity[complexity];
    let baseUnit = typePrice + complexityPrice;

    // 3. Area Discount Logic
    let discount = 0;
    if (area > 300) {
        discount = 100;
    } else if (area >= 150) {
        discount = 50;
    }

    let discountedUnit = baseUnit - discount;

    // 4. Subtotal
    let subtotal = discountedUnit * area;

    // 5. Coefficients
    const sceneCoeff = PRICES.scene[scene] || 1.0;
    const customerCoeff = isCompany ? PRICES.customer.company : PRICES.customer.individual;

    let total = subtotal * sceneCoeff * customerCoeff;

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
    if (discount > 0) {
        badges.push(`<span class="badge discount">大面积优惠 -${discount}/㎡</span>`);
    }
    if (appliedRule) {
        badges.push(`<span class="badge boundary">${appliedRule} (¥${RULES.minPrice})</span>`);
    }

    if (display.badges) {
        display.badges.innerHTML = badges.join('');
    }

    // 8. Update Technical Breakdown (Removed in UI)
    // Code removed as elements no longer exist

    // 9. Update Sidebar Preview Card (Real-time)
    updatePreviewUI();
}

// Event Listeners
inputs.area.addEventListener('input', () => {
    localStorage.setItem('painting_area', inputs.area.value);
    calculate();
});
inputs.customer.addEventListener('change', calculate);

inputs.types.forEach(r => r.addEventListener('change', calculate));
inputs.complexities.forEach(r => r.addEventListener('change', calculate));
inputs.scenes.forEach(r => r.addEventListener('change', calculate));

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
            scale: 2, // High resolution for crisp text
            backgroundColor: '#ffffff',
            logging: false,
            // Use precise bounding rect dimensions
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height),
            // Don't modify the cloned element at all to preserve exact appearance
            onclone: (clonedDoc) => {
                const clonedTarget = clonedDoc.getElementById('sidebar-quote');
                // Hide the button
                const btn = clonedTarget.querySelector('.floating-copy-btn');
                if (btn) btn.style.display = 'none';

                // Fix object-fit: cover issue - html2canvas doesn't support it
                // Convert img to a div with background-image to simulate object-fit: cover
                const previewImg = clonedTarget.querySelector('.preview-img');
                if (previewImg && previewImg.src) {
                    const container = previewImg.parentElement;
                    const imgSrc = previewImg.src;

                    // Create a replacement div with background styling
                    const bgDiv = clonedDoc.createElement('div');
                    bgDiv.style.width = '100%';
                    bgDiv.style.height = '100%';
                    bgDiv.style.backgroundImage = `url(${imgSrc})`;
                    bgDiv.style.backgroundSize = 'cover';
                    bgDiv.style.backgroundPosition = 'center';
                    bgDiv.style.filter = 'grayscale(100%)';
                    bgDiv.style.opacity = '0.95';

                    // Replace the img with the div
                    container.replaceChild(bgDiv, previewImg);
                }
            }
        });

        canvas.toBlob(async (blob) => {
            try {
                if (navigator.clipboard && window.ClipboardItem) {
                    const data = [new ClipboardItem({ [blob.type]: blob })];
                    await navigator.clipboard.write(data);
                    copyBtn.textContent = '✅ 已成功复制到剪贴板';
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

/**
 * Update Preview UI (For Sidebar)
 */
function updatePreviewUI() {
    const area = parseFloat(inputs.area.value) || 0;
    const type = getRadioValue(inputs.types);
    const complexity = getRadioValue(inputs.complexities);
    const sceneValue = getRadioValue(inputs.scenes);
    const isCompany = inputs.customer.checked;
    const finalPriceText = display.price.textContent;

    // Internal mapping to Client-Friendly Names & References
    const packMapping = {
        'line-simple': { name: '线条简约', complexity: '简约', img: 'style_line_art_v1_1766837331698.png' },
        'line-medium': { name: '线条插画', complexity: '标准', img: 'style_line_art_v1_1766837331698.png' },
        'line-complex': { name: '精细线条', complexity: '复杂', img: 'style_line_art_v1_1766837331698.png' },
        'illustration-simple': { name: '简约插画', complexity: '简约', img: 'style_standard_illustration_v1_1766837354026.png' },
        'illustration-medium': { name: '现代插画', complexity: '标准', img: 'style_standard_illustration_v1_1766837354026.png' },
        'illustration-complex': { name: '精细插画', complexity: '复杂', img: 'style_standard_illustration_v1_1766837354026.png' },
        'painterly-simple': { name: '简约肘理', complexity: '简约', img: 'style_detailed_painterly_v1_retry_1766837387649.png' },
        'painterly-medium': { name: '艺术肘理', complexity: '标准', img: 'style_detailed_painterly_v1_retry_1766837387649.png' },
        'painterly-complex': { name: '精细肘理', complexity: '复杂', img: 'style_detailed_painterly_v1_retry_1766837387649.png' },
        'realism-simple': { name: '简约写实', complexity: '简约', img: 'style_3d_realism_wall_v1_retry_1766837410801.png' },
        'realism-medium': { name: '3D写实', complexity: '标准', img: 'style_3d_realism_wall_v1_retry_1766837410801.png' },
        'realism-complex': { name: '超写实', complexity: '复杂', img: 'style_3d_realism_wall_v1_retry_1766837410801.png' }
    };

    const key = `${type}-${complexity}`;
    const pack = packMapping[key] || packMapping['A-medium'];

    const sceneNames = {
        'indoor': '高品质室内',
        'outdoor': '商业外墙',
        'ceiling': '天顶艺术',
        'ground': '创意地面'
    };

    // Fees
    const typePrice = PRICES.type[type];
    const complexityPrice = PRICES.complexity[complexity];
    const baseUnit = typePrice + complexityPrice;

    let discount = 0;
    if (area > 300) discount = 100;
    else if (area >= 150) discount = 50;

    const sceneCoeff = PRICES.scene[sceneValue] || 1.0;
    const customerCoeff = isCompany ? PRICES.customer.company : PRICES.customer.individual;

    const baseFee = baseUnit * area;
    const discountFee = discount * area;
    const finalCoeff = (sceneCoeff * customerCoeff).toFixed(1);

    // Update Elements (Using shared IDs if present in both, or specific selectors)
    // For sidebar mode, we use the IDs in index.html directly
    const styleNameEl = document.getElementById('preview-style-name');
    if (styleNameEl) styleNameEl.textContent = pack.name;

    const complexityEl = document.getElementById('preview-complexity');
    if (complexityEl) complexityEl.textContent = pack.complexity;

    const areaEl = document.getElementById('preview-area');
    if (areaEl) areaEl.textContent = `${area} m²`;

    const sceneEl = document.getElementById('preview-scene');
    if (sceneEl) sceneEl.textContent = sceneNames[sceneValue];

    const baseFeeEl = document.getElementById('preview-base-fee');
    if (baseFeeEl) baseFeeEl.textContent = `¥${baseFee.toLocaleString()}`;

    const discountFeeEl = document.getElementById('preview-discount-fee');
    if (discountFeeEl) discountFeeEl.textContent = `- ¥${discountFee.toLocaleString()}`;

    const coeffFeeEl = document.getElementById('preview-coeff-fee');
    if (coeffFeeEl) coeffFeeEl.textContent = `x ${finalCoeff}`;

    const totalPriceRowEl = document.getElementById('preview-total-price-row');
    if (totalPriceRowEl) totalPriceRowEl.textContent = `¥${finalPriceText}`;

    const previewTotalPriceEl = document.getElementById('preview-total-price');
    if (previewTotalPriceEl) previewTotalPriceEl.textContent = finalPriceText;

    const previewImgEl = document.getElementById('preview-style-img');
    if (previewImgEl && pack.img) {
        // Use DataURL to prevent tainted canvas issue during screenshot
        getImageAsDataURL(pack.img).then(dataUrl => {
            previewImgEl.src = dataUrl;
        });
    }

    const previewDateEl = document.getElementById('preview-date');
    if (previewDateEl) previewDateEl.textContent = `Date: ${new Date().toLocaleDateString()}`;

    // Customer Name
    const customerNameEl = document.getElementById('preview-customer');
    const customerNameValue = inputs.customerName ? inputs.customerName.value.trim() : '';
    if (customerNameEl) {
        customerNameEl.textContent = customerNameValue ? `尊敬的 ${customerNameValue}` : '';
    }
}

// Load Cache
const cachedArea = localStorage.getItem('painting_area');
if (cachedArea) {
    inputs.area.value = cachedArea;
}

// Initial Calculation
calculate();

// Add global fade-in
document.body.style.opacity = 0;
window.onload = () => {
    document.body.style.transition = 'opacity 0.6s ease';
    document.body.style.opacity = 1;
    // Force initial preview update
    updatePreviewUI();
};
