// ============================================
// TIDDIS TAPIS — Storefront Logic
// منطق المتجر الرئيسي (العرض، البحث، الفلاتر، الطلب، PDF)
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// المتغيرات العامة
// ============================================
let allProducts = [];
let filteredProducts = [];
let categories = [];
let deliveryRates = {};
let storeSettings = {};
let currentFilter = 'all';
let currentProductForOrder = null;
let currentVariantForOrder = null;
let wilayaList = [];

// ============================================
// عناصر DOM الأساسية
// ============================================
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const productCount = document.getElementById('product-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('order-modal');
const modalClose = document.getElementById('modal-close');
const orderForm = document.getElementById('order-form');
const wilayaSelect = document.getElementById('wilaya-select');
const modalSubtotal = document.getElementById('modal-subtotal');
const modalDelivery = document.getElementById('modal-delivery');
const modalTotal = document.getElementById('modal-total');
const customSizeGroup = document.getElementById('custom-size-group');
const customSizeInput = document.getElementById('custom-size');
const orderStatus = document.getElementById('order-status');
const aboutText = document.getElementById('about-text');
const contactIcons = document.getElementById('contact-icons');
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

// ============================================
// قائمة الولايات الـ 58 الجزائرية
// ============================================
const WILAYAS = [
    { code: '01', name: 'أدرار' },
    { code: '02', name: 'الشلف' },
    { code: '03', name: 'الأغواط' },
    { code: '04', name: 'أم البواقي' },
    { code: '05', name: 'باتنة' },
    { code: '06', name: 'بجاية' },
    { code: '07', name: 'بسكرة' },
    { code: '08', name: 'بشار' },
    { code: '09', name: 'البليدة' },
    { code: '10', name: 'البويرة' },
    { code: '11', name: 'تمنراست' },
    { code: '12', name: 'تبسة' },
    { code: '13', name: 'تلمسان' },
    { code: '14', name: 'تيارت' },
    { code: '15', name: 'تيزي وزو' },
    { code: '16', name: 'الجزائر' },
    { code: '17', name: 'الجلفة' },
    { code: '18', name: 'جيجل' },
    { code: '19', name: 'سطيف' },
    { code: '20', name: 'سعيدة' },
    { code: '21', name: 'سكيكدة' },
    { code: '22', name: 'سيدي بلعباس' },
    { code: '23', name: 'عنابة' },
    { code: '24', name: 'قالمة' },
    { code: '25', name: 'قسنطينة' },
    { code: '26', name: 'المدية' },
    { code: '27', name: 'مستغانم' },
    { code: '28', name: 'المسيلة' },
    { code: '29', name: 'معسكر' },
    { code: '30', name: 'ورقلة' },
    { code: '31', name: 'وهران' },
    { code: '32', name: 'البيض' },
    { code: '33', name: 'إليزي' },
    { code: '34', name: 'برج بوعريريج' },
    { code: '35', name: 'بومرداس' },
    { code: '36', name: 'الطارف' },
    { code: '37', name: 'تندوف' },
    { code: '38', name: 'تيسمسيلت' },
    { code: '39', name: 'الوادي' },
    { code: '40', name: 'خنشلة' },
    { code: '41', name: 'سوق أهراس' },
    { code: '42', name: 'تيبازة' },
    { code: '43', name: 'ميلة' },
    { code: '44', name: 'عين الدفلى' },
    { code: '45', name: 'النعامة' },
    { code: '46', name: 'عين تموشنت' },
    { code: '47', name: 'غرداية' },
    { code: '48', name: 'غليزان' },
    { code: '49', name: 'تميمون' },
    { code: '50', name: 'برج باجي مختار' },
    { code: '51', name: 'أولاد جلال' },
    { code: '52', name: 'بني عباس' },
    { code: '53', name: 'إن صالح' },
    { code: '54', name: 'إن قزام' },
    { code: '55', name: 'توقرت' },
    { code: '56', name: 'جانت' },
    { code: '57', name: 'المغير' },
    { code: '58', name: 'المنيعة' }
];

// ============================================
// 1. تحميل البيانات من Firebase
// ============================================

// تحميل المنتجات
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        filteredProducts = [...allProducts];
        renderProducts(filteredProducts);
        updateProductCount();
        return allProducts;
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<div class="empty-state">Unable to load products. Please refresh the page.</div>';
        return [];
    }
}

// تحميل أسعار التوصيل
async function loadDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            deliveryRates = docSnap.data();
        } else {
            // إنشاء قائمة افتراضية للولايات
            const defaultRates = {};
            WILAYAS.forEach(w => {
                defaultRates[w.code] = { price: 500, free: false };
            });
            deliveryRates = defaultRates;
            await setDoc(docRef, defaultRates);
        }
        return deliveryRates;
    } catch (error) {
        console.error('Error loading delivery rates:', error);
        return {};
    }
}

// تحميل إعدادات المتجر
async function loadStoreSettings() {
    try {
        const docRef = doc(db, 'settings', 'storeSettings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            storeSettings = docSnap.data();
        } else {
            storeSettings = {
                aboutText: 'Tiddis Tapis is inspired by the deep-rooted history and ancient heritage of Constantine. We transform this timeless legacy into modern rugs.',
                logoUrl: '',
                contacts: []
            };
            await setDoc(docRef, storeSettings);
        }
        applyStoreSettings();
        return storeSettings;
    } catch (error) {
        console.error('Error loading store settings:', error);
        return {};
    }
}

// تحميل الفئات
async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        categories = [];
        querySnapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        return categories;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// ============================================
// 2. عرض المنتجات في الشبكة
// ============================================

function renderProducts(products) {
    if (!products || products.length === 0) {
        productsGrid.innerHTML = '<div class="empty-state">No products available right now. Check back soon!</div>';
        return;
    }

    productsGrid.innerHTML = '';
    products.forEach((product, index) => {
        const card = createProductCard(product, index);
        productsGrid.appendChild(card);
    });
}

function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    // تحديد الصورة الافتراضية والمتغير الأول
    const hasVariants = product.variants && product.variants.length > 0;
    const firstVariant = hasVariants ? product.variants[0] : null;
    const defaultImage = (firstVariant && firstVariant.image) ? firstVariant.image : (product.imageUrl || '');
    const defaultPrice = (firstVariant && firstVariant.price) ? firstVariant.price : (product.basePrice || 0);

    // جمع كل الصور (الصورة الرئيسية + صور المتغيرات)
    let allImages = [];
    if (product.imageUrl) allImages.push(product.imageUrl);
    if (product.additionalImages) {
        allImages = allImages.concat(product.additionalImages);
    }
    if (product.variants) {
        product.variants.forEach(v => {
            if (v.image && !allImages.includes(v.image)) {
                allImages.push(v.image);
            }
        });
    }
    // إزالة الصور المكررة
    allImages = [...new Set(allImages)];
    const hasMultipleImages = allImages.length > 1;

    // بناء قائمة المتغيرات
    let variantOptionsHtml = '';
    if (hasVariants) {
        variantOptionsHtml = `
            <select class="variant-select" data-product-id="${product.id}">
                ${product.variants.map((v, idx) => `
                    <option value="${idx}" data-price="${v.price || product.basePrice}" 
                            data-image="${v.image || product.imageUrl || ''}"
                            ${idx === 0 ? 'selected' : ''}>
                        ${v.size ? v.size : ''} ${v.color ? '- ' + v.color : ''}
                    </option>
                `).join('')}
            </select>
        `;
    }

    // بناء HTML البطاقة
    card.innerHTML = `
        <div class="product-image-wrap" data-product-id="${product.id}">
            <img src="${defaultImage}" alt="${product.name || 'KSOR Rug'}" 
                 class="product-main-image" loading="eager">
            ${hasMultipleImages ? `
                <button class="image-nav-btn prev" data-dir="-1">‹</button>
                <button class="image-nav-btn next" data-dir="1">›</button>
                <div class="image-dots">
                    ${allImages.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            ` : ''}
        </div>
        <div class="product-body">
            <div class="product-info-row">
                <div class="product-details">
                    <span class="product-name">${product.name || 'KSOR Classic'}</span>
                    <span class="product-size">${firstVariant?.size || product.size || '200x280 cm'}</span>
                    <span class="product-price" data-base-price="${defaultPrice}">${defaultPrice} DZD</span>
                </div>
                ${variantOptionsHtml}
                <button class="order-btn" data-product-id="${product.id}">ORDER</button>
            </div>
        </div>
    `;

    // ---- معالجة الصور المتعددة (Slider) ----
    if (hasMultipleImages) {
        let currentImageIndex = 0;
        const img = card.querySelector('.product-main-image');
        const dots = card.querySelectorAll('.image-dots span');
        const prevBtn = card.querySelector('.image-nav-btn.prev');
        const nextBtn = card.querySelector('.image-nav-btn.next');

        function updateImage(index) {
            if (index < 0) index = allImages.length - 1;
            if (index >= allImages.length) index = 0;
            currentImageIndex = index;
            img.src = allImages[index];
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateImage(currentImageIndex - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateImage(currentImageIndex + 1);
            });
        }
        // حفظ مرجع للـ updateImage في البطاقة لاستخدامه عند تغيير المتغير
        card._updateImage = updateImage;
        card._allImages = allImages;
    }

    // ---- معالجة المتغيرات (Variant Selection) ----
    const variantSelect = card.querySelector('.variant-select');
    if (variantSelect) {
        variantSelect.addEventListener('change', function(e) {
            const selectedOption = this.options[this.selectedIndex];
            const newPrice = parseInt(selectedOption.getAttribute('data-price')) || 0;
            const newImage = selectedOption.getAttribute('data-image');

            // تحديث السعر
            const priceEl = this.closest('.product-body').querySelector('.product-price');
            if (priceEl) {
                priceEl.textContent = newPrice + ' DZD';
                priceEl.dataset.basePrice = newPrice;
            }

            // تحديث الصورة
            const img = this.closest('.product-card').querySelector('.product-main-image');
            if (img && newImage) {
                img.src = newImage;
                // إذا كان هناك Slider، إعادة تعيين المؤشر
                const cardEl = this.closest('.product-card');
                if (cardEl._allImages) {
                    const imgIndex = cardEl._allImages.indexOf(newImage);
                    if (imgIndex !== -1 && cardEl._updateImage) {
                        cardEl._updateImage(imgIndex);
                    }
                }
            }

            // تحديث المقاس المعروض
            const sizeEl = this.closest('.product-body').querySelector('.product-size');
            if (sizeEl) {
                const sizeText = selectedOption.textContent.trim();
                sizeEl.textContent = sizeText;
            }
        });
    }

    // ---- معالجة زر ORDER ----
    const orderBtn = card.querySelector('.order-btn');
    orderBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const productId = this.dataset.productId;
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            // تحديد المتغير المختار حالياً
            const select = this.closest('.product-card').querySelector('.variant-select');
            let selectedVariant = null;
            let selectedIndex = 0;
            if (select) {
                selectedIndex = parseInt(select.value);
                selectedVariant = product.variants[selectedIndex] || null;
            }
            openOrderModal(product, selectedVariant, selectedIndex);
        }
    });

    return card;
}

// ============================================
// 3. البحث والفلترة
// ============================================

function updateProductCount() {
    if (productCount) {
        productCount.textContent = `${filteredProducts.length} products`;
    }
}

function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    filteredProducts = allProducts.filter(product => {
        // فلترة حسب التصنيف (Category)
        if (currentFilter !== 'all' && product.category !== currentFilter) {
            return false;
        }

        // فلترة حسب البحث
        if (searchTerm) {
            const searchable = [
                product.name || '',
                product.size || '',
                product.category || '',
                ...(product.variants ? product.variants.map(v => `${v.size || ''} ${v.color || ''}`) : [])
            ].join(' ').toLowerCase();
            return searchable.includes(searchTerm);
        }

        return true;
    });

    renderProducts(filteredProducts);
    updateProductCount();
}

// ============================================
// 4. نافذة الطلب المنبثقة (Order Modal)
// ============================================

function openOrderModal(product, selectedVariant, variantIndex) {
    currentProductForOrder = product;
    currentVariantForOrder = selectedVariant;

    // تعبئة البيانات في النافذة
    const price = selectedVariant?.price || product.basePrice || 0;
    modalSubtotal.textContent = price + ' DZD';
    modalTotal.textContent = price + ' DZD';
    modalDelivery.textContent = '0 DZD';

    // إظهار/إخفاء حقل المقاس المخصص
    if (product.customizableSize) {
        customSizeGroup.style.display = 'block';
    } else {
        customSizeGroup.style.display = 'none';
        customSizeInput.value = '';
    }

    // إعادة تعيين حالة الطلب
    orderStatus.textContent = '';
    orderStatus.style.color = '';

    // تعبئة قائمة الولايات
    populateWilayaSelect();

    // فتح النافذة
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function populateWilayaSelect() {
    wilayaSelect.innerHTML = '<option value="">-- Select your wilaya --</option>';
    WILAYAS.forEach(w => {
        const option = document.createElement('option');
        option.value = w.code;
        option.textContent = `${w.code} - ${w.name}`;
        wilayaSelect.appendChild(option);
    });

    // إضافة مستمع لتحديث رسوم التوصيل
    wilayaSelect.onchange = function() {
        updateDeliveryFee();
    };
}

function updateDeliveryFee() {
    const wilayaCode = wilayaSelect.value;
    const price = parseInt(modalSubtotal.textContent) || 0;

    if (!wilayaCode) {
        modalDelivery.textContent = '0 DZD';
        modalTotal.textContent = price + ' DZD';
        return;
    }

    const rate = deliveryRates[wilayaCode] || { price: 0, free: false };
    const deliveryPrice = rate.free ? 0 : (rate.price || 0);
    const total = price + deliveryPrice;

    modalDelivery.textContent = deliveryPrice + ' DZD';
    modalTotal.textContent = total + ' DZD';
}

// إغلاق النافذة
function closeOrderModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    orderStatus.textContent = '';
}

modalClose.addEventListener('click', closeOrderModal);
modal.addEventListener('click', function(e) {
    if (e.target === this) closeOrderModal();
});

// ============================================
// 5. إرسال الطلب إلى Google Sheets
// ============================================

orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const wilayaCode = wilayaSelect.value;
    const customSize = customSizeInput.value.trim();

    if (!name || !phone || !wilayaCode) {
        orderStatus.textContent = '⚠️ Please fill in all required fields.';
        orderStatus.style.color = '#c0392b';
        return;
    }

    // الحصول على سعر المنتج
    const price = parseInt(modalSubtotal.textContent) || 0;
    const deliveryRate = deliveryRates[wilayaCode] || { price: 0, free: false };
    const deliveryPrice = deliveryRate.free ? 0 : (deliveryRate.price || 0);
    const total = price + deliveryPrice;

    // الحصول على اسم الولاية
    const wilayaName = WILAYAS.find(w => w.code === wilayaCode)?.name || wilayaCode;

    // بناء بيانات الطلب
    const orderData = {
        productName: currentProductForOrder?.name || 'Unknown',
        productSize: currentVariantForOrder?.size || currentProductForOrder?.size || 'N/A',
        productColor: currentVariantForOrder?.color || 'N/A',
        customSize: customSize || 'N/A',
        price: price,
        deliveryPrice: deliveryPrice,
        total: total,
        customerName: name,
        customerPhone: phone,
        wilayaCode: wilayaCode,
        wilayaName: wilayaName,
        timestamp: new Date().toISOString(),
        productId: currentProductForOrder?.id || ''
    };

    // إرسال إلى Google Sheets
    const sheetsUrl = storeSettings.googleSheetsUrl || '';
    if (!sheetsUrl) {
        orderStatus.textContent = '⚠️ Store is not configured for orders yet. Please contact admin.';
        orderStatus.style.color = '#c0392b';
        return;
    }

    try {
        const submitBtn = this.querySelector('.order-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        orderStatus.textContent = '';

        const response = await fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        // بما أننا نستخدم no-cors، لا يمكننا قراءة الرد
        // لكننا نفترض أن الطلب تم إرساله بنجاح
        orderStatus.textContent = '✅ Order placed successfully! We will contact you shortly.';
        orderStatus.style.color = '#27ae60';
        submitBtn.textContent = 'Order Confirmed ✓';

        // إعادة تعيين النموذج بعد 3 ثوانٍ
        setTimeout(() => {
            closeOrderModal();
            this.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
        }, 3000);

    } catch (error) {
        console.error('Error sending order:', error);
        orderStatus.textContent = '⚠️ Error sending order. Please try again or contact us directly.';
        orderStatus.style.color = '#c0392b';
        const submitBtn = this.querySelector('.order-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Order';
    }
});

// ============================================
// 6. إنشاء ملف PDF التقني
// ============================================

window.generateProductPDF = async function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        alert('Product not found.');
        return;
    }

    // تحديد الصورة المخصصة للـ PDF (إذا تم تحديدها)
    let pdfImage = product.pdfImage || product.imageUrl || '';
    if (product.variants && product.variants.length > 0 && !pdfImage) {
        pdfImage = product.variants[0].image || product.imageUrl || '';
    }

    // بناء المحتوى
    const pdfContent = document.createElement('div');
    pdfContent.style.cssText = `
        width: 600px;
        padding: 40px;
        background: #faf9f6;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1a1a1a;
    `;

    // الشعار
    const logoUrl = storeSettings.logoUrl || '';
    const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="TIDDIS TAPIS" style="max-height:50px; margin-bottom:20px;">` :
        `<div style="font-family: 'Fraunces', Georgia, serif; font-size:28px; font-weight:600; letter-spacing:4px; color:#1a1a1a;">TIDDIS</div>
         <div style="font-family: 'Fraunces', Georgia, serif; font-size:14px; font-weight:300; letter-spacing:6px; color:#4E1A1D; margin-top:2px;">TAPIS</div>`;

    pdfContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #4E1A1D; padding-bottom:16px; margin-bottom:24px;">
            <div>${logoHtml}</div>
            <div style="text-align:right; font-family:'Space Mono', monospace; font-size:12px; color:#6b6b6b;">
                <div>COLLECTION: ${product.category || 'KSOR'}</div>
                <div>BRAND: TIDDIS TAPIS</div>
                <div>REF: ${product.id || 'N/A'}</div>
            </div>
        </div>

        <div style="text-align:center; margin-bottom:24px;">
            <h1 style="font-family:'Fraunces', Georgia, serif; font-size:22px; font-weight:400; letter-spacing:2px; color:#1a1a1a; margin:0;">
                ${product.name || 'KSOR Classic'}
            </h1>
        </div>

        ${pdfImage ? `
            <div style="text-align:center; margin-bottom:24px;">
                <img src="${pdfImage}" alt="${product.name}" 
                     style="max-width:100%; max-height:400px; object-fit:cover; border:1px solid #e2e0d8; border-radius:4px;">
            </div>
        ` : ''}

        <div style="margin-bottom:24px;">
            <h3 style="font-family:'Space Mono', monospace; font-size:14px; letter-spacing:1px; color:#4E1A1D; margin-bottom:12px; border-bottom:1px solid #e2e0d8; padding-bottom:8px;">
                SPECIFICATIONS
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; font-family:'Space Mono', monospace; font-size:12px; color:#6b6b6b;">Sizes Available</td>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; text-align:right;">
                        ${product.variants && product.variants.length > 0 ? 
                            product.variants.map(v => v.size).filter(s => s).join(', ') : 
                            (product.size || '200x280 cm')}
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; font-family:'Space Mono', monospace; font-size:12px; color:#6b6b6b;">Customizable Size</td>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; text-align:right;">
                        ${product.customizableSize ? '✅ Yes' : '❌ No'}
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 0; font-family:'Space Mono', monospace; font-size:12px; color:#6b6b6b;">Price</td>
                    <td style="padding:8px 0; text-align:right; font-weight:700; color:#4E1A1D;">
                        ${product.basePrice || 0} DZD
                    </td>
                </tr>
            </table>
        </div>

        <div style="text-align:center; padding:16px 0; border-top:1px solid #e2e0d8; border-bottom:1px solid #e2e0d8; margin-bottom:20px;">
            <div id="qrcode-container" style="display:inline-block; background:#fff; padding:8px; border-radius:4px;"></div>
            <p style="font-family:'Space Mono', monospace; font-size:11px; color:#6b6b6b; margin-top:8px;">
                Scan to view this product online
            </p>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:13px; color:#6b6b6b; font-family:'Space Mono', monospace;">
            <div>
                📞 <a href="tel:${storeSettings.contacts?.find(c => c.platform === 'phone')?.value || '0559615658'}" 
                      style="color:#1a1a1a; text-decoration:none;">
                    ${storeSettings.contacts?.find(c => c.platform === 'phone')?.value || '0559615658'}
                </a>
            </div>
            <div>
                ✉️ <a href="mailto:${storeSettings.contacts?.find(c => c.platform === 'email')?.value || 'support@tiddis.com'}" 
                      style="color:#1a1a1a; text-decoration:none;">
                    ${storeSettings.contacts?.find(c => c.platform === 'email')?.value || 'support@tiddis.com'}
                </a>
            </div>
        </div>
        <div style="text-align:center; margin-top:12px; font-size:11px; color:#999; font-family:'Space Mono', monospace; border-top:1px solid #e2e0d8; padding-top:12px;">
            TIDDIS TAPIS — Inspired by the history of Constantine
        </div>
    `;

    // إضافة الـ PDF إلى الصفحة مؤقتاً
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:600px;';
    tempDiv.appendChild(pdfContent);
    document.body.appendChild(tempDiv);

    // إنشاء QR Code داخل المحتوى
    try {
        const qrContainer = tempDiv.querySelector('#qrcode-container');
        if (qrContainer && typeof QRCode !== 'undefined') {
            const productUrl = `${window.location.origin}/?product=${product.id}`;
            new QRCode(qrContainer, {
                text: productUrl,
                width: 100,
                height: 100,
                colorDark: '#1a1a1a',
                colorLight: '#faf9f6',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    } catch (e) {
        console.warn('QR Code generation failed:', e);
    }

    // استخدام html2canvas لتحويل المحتوى إلى صورة ثم PDF
    try {
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#faf9f6',
            width: 600,
            height: tempDiv.scrollHeight
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${product.name || 'product'}-technical-sheet.pdf`);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        document.body.removeChild(tempDiv);
    }
};

// ============================================
// 7. تطبيق إعدادات المتجر
// ============================================

function applyStoreSettings() {
    // تطبيق نص "من نحن"
    if (aboutText && storeSettings.aboutText) {
        aboutText.textContent = storeSettings.aboutText;
    }

    // تطبيق جهات التواصل
    if (contactIcons && storeSettings.contacts) {
        renderContactIcons(storeSettings.contacts);
    }

    // تطبيق الشعار (سيتم في الـ CSS أو في الهيدر)
    if (storeSettings.logoUrl) {
        const logoElements = document.querySelectorAll('.brand-main, .mobile-brand .brand-main');
        logoElements.forEach(el => {
            // إذا كان الشعار صورة، نستبدل النص بصورة
            // نترك هذا للتطبيق المستقبلي
        });
    }
}

function renderContactIcons(contacts) {
    if (!contacts || contacts.length === 0) {
        contactIcons.innerHTML = '<span style="color:#6b6b6b; font-size:13px;">No contacts configured</span>';
        return;
    }

    const iconMap = {
        phone: '📞',
        email: '✉️',
        whatsapp: '💬',
        instagram: '📷',
        facebook: '👍',
        tiktok: '🎵',
        pinterest: '📌'
    };

    contactIcons.innerHTML = contacts.map(contact => {
        const icon = iconMap[contact.platform] || '🔗';
        const href = contact.platform === 'phone' ? `tel:${contact.value}` :
                     contact.platform === 'email' ? `mailto:${contact.value}` :
                     contact.value;
        return `<a href="${href}" target="${contact.platform === 'phone' || contact.platform === 'email' ? '_self' : '_blank'}" 
                      style="font-family:'Space Mono', monospace; font-size:13px; color:#1a1a1a; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <span style="font-size:18px;">${icon}</span>
            ${contact.value}
        </a>`;
    }).join('');
}

// ============================================
// 8. التنقل والهامبورجر
// ============================================

// تبديل القائمة الجانبية في الهواتف
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        this.classList.toggle('active');
    });
}

// إغلاق القائمة عند النقر على رابط
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;
        // إزالة الفعالية من جميع الروابط
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // التمرير إلى القسم المطلوب
        if (section === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (section === 'products') {
            document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
        } else if (section === 'about') {
            document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
        } else if (section === 'contact') {
            document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
        }

        // إغلاق القائمة على الهواتف
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
            hamburgerBtn?.classList.remove('active');
        }
    });
});

// ============================================
// 9. الفلاتر والبحث (مستمعات الأحداث)
// ============================================

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        filterProducts();
    });
});

if (searchInput) {
    searchInput.addEventListener('input', function() {
        filterProducts();
    });
}

// ============================================
// 10. التحميل الأولي (Initialization)
// ============================================

async function initStore() {
    try {
        // تحميل البيانات من Firebase
        await loadStoreSettings();
        await loadDeliveryRates();
        await loadCategories();
        await loadProducts();

        // تحديث عداد المنتجات
        updateProductCount();

        console.log('✅ TIDDIS TAPIS Store initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing store:', error);
    }
}

// بدء تشغيل المتجر عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initStore);
