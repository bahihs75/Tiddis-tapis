// ============================================
// TIDDIS TAPIS — Storefront Logic (محدث بالكامل)
// منطق المتجر الرئيسي: العرض، البحث، الفلاتر، القوائم المتداخلة، الطلب، PDF، صفحة التفاصيل
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
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getCountFromServer,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// المتغيرات العامة
// ============================================
let allProducts = [];
let filteredProducts = [];
let displayedProducts = [];
let categories = [];
let categoriesOverview = [];
let deliveryRates = {};
let storeSettings = {};
let currentFilter = 'all';
let currentFilterType = 'products'; // 'products' or 'overview'
let currentProductForOrder = null;
let currentVariantForOrder = null;
let currentProductId = null;
let pageSize = 4;
let lastDoc = null;
let isLoading = false;
let allLoaded = false;
let wilayaList = [];
let productDetailLoaded = false;
let gridColumns = 2; // 2 or 4 for desktop, 1 or 2 for mobile
let isMobile = window.innerWidth <= 900;

// ============================================
// عناصر DOM الأساسية
// ============================================
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const mobileSearchInput = document.getElementById('mobile-search-input');
const productCount = document.getElementById('product-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
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
const sidebarNav = document.getElementById('sidebar-nav');
const hamburgerBtn = document.getElementById('hamburger-btn');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const mobileSearchBar = document.getElementById('mobile-search-bar');
const mobileSearchClose = document.getElementById('mobile-search-close');
const successModal = document.getElementById('order-success-modal');
const successClose = document.getElementById('success-close');
const closeSuccessBtn = document.getElementById('close-success-modal');
const downloadPdfAfterOrder = document.getElementById('download-pdf-after-order');
const gridToggleBtn = document.getElementById('grid-toggle-btn');

// عناصر صفحة التفاصيل
const skeleton = document.getElementById('product-skeleton');
const detailContainer = document.getElementById('product-detail-container');
const detailName = document.getElementById('product-detail-name');
const detailImages = document.getElementById('product-detail-images');
const detailSize = document.getElementById('product-detail-size');
const detailColor = document.getElementById('product-detail-color');
const detailPrice = document.getElementById('product-detail-price');
const detailVariant = document.getElementById('product-detail-variant');
const detailOrderBtn = document.getElementById('product-detail-order-btn');
const detailPdfBtn = document.getElementById('product-detail-pdf-btn');
const detailDescription = document.getElementById('product-detail-description');
const productPageLogo = document.getElementById('product-page-logo');

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
// 1. تحديد حجم الصفحة (Page Size) حسب الجهاز
// ============================================
function getPageSize() {
    if (window.innerWidth <= 480) return 2;
    if (window.innerWidth <= 900) return 3;
    return 4;
}

// ============================================
// 2. تحميل البيانات من Firebase مع Snapshot
// ============================================

function listenToProducts() {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        allProducts = [];
        snapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        filterProducts();
        updateProductCount();
        if (window.updateProductStats) {
            window.updateProductStats(allProducts.length);
        }
        console.log('✅ Products updated in real-time:', allProducts.length);
    }, (error) => {
        console.error('❌ Error listening to products:', error);
    });
}

async function loadDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            deliveryRates = docSnap.data();
        } else {
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

function listenToStoreSettings() {
    const docRef = doc(db, 'settings', 'storeSettings');
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            storeSettings = docSnap.data();
        } else {
            storeSettings = {
                aboutText: 'Tiddis Tapis is inspired by the deep-rooted history and ancient heritage of Constantine. We transform this timeless legacy into modern rugs.',
                logoUrl: '',
                sidebarBgColor: '#ffffff',
                mainBgColor: '#faf9f6',
                contacts: [],
                googleSheetsUrl: ''
            };
            setDoc(docRef, storeSettings);
        }
        applyStoreSettings();
    }, (error) => {
        console.error('Error listening to store settings:', error);
    });
}

async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        categories = [];
        categoriesOverview = [];
        querySnapshot.forEach((doc) => {
            const cat = { id: doc.id, ...doc.data() };
            if (cat.type === 'overview') {
                categoriesOverview.push(cat);
            } else {
                categories.push(cat);
            }
        });
        // إذا كانت الفئات فارغة، أنشئ الفئات الافتراضية
        if (categories.length === 0 && categoriesOverview.length === 0) {
            const defaultCategories = [
                { name: 'KSOR', subcategories: [], type: 'products' },
                { name: 'CHAHINE', subcategories: [], type: 'products' },
                { name: 'GALATA', subcategories: [], type: 'products' },
                { name: 'ORIA', subcategories: [], type: 'products' },
                { name: 'PLAZA', subcategories: [], type: 'products' },
                { name: 'MANISA', subcategories: ['SO'], type: 'products' }
            ];
            for (const cat of defaultCategories) {
                await addDoc(collection(db, 'categories'), cat);
            }
            // إعادة تحميل
            const newSnapshot = await getDocs(collection(db, 'categories'));
            categories = [];
            categoriesOverview = [];
            newSnapshot.forEach((doc) => {
                const cat = { id: doc.id, ...doc.data() };
                if (cat.type === 'overview') {
                    categoriesOverview.push(cat);
                } else {
                    categories.push(cat);
                }
            });
        }
        buildSidebarMenu();
        return { categories, categoriesOverview };
    } catch (error) {
        console.error('Error loading categories:', error);
        return { categories: [], categoriesOverview: [] };
    }
}

// ============================================
// 3. بناء القائمة الجانبية مع القوائم المتداخلة
// ============================================

function buildSidebarMenu() {
    if (!sidebarNav) return;

    // بناء روابط Overview مع فئاتها
    let overviewHtml = '';
    if (categoriesOverview.length > 0) {
        overviewHtml = `<li class="nav-item">
            <button class="nav-link" data-section="overview" data-type="overview">
                Overview
                <span class="toggle-icon">▸</span>
            </button>
            <ul class="sub-menu" data-parent="overview">
                ${categoriesOverview.map(cat => `
                    <li class="nav-item">
                        <button class="nav-link" data-section="overview" data-category="${cat.name}" data-type="overview">
                            ${cat.name}
                            ${cat.subcategories && cat.subcategories.length > 0 ? `<span class="toggle-icon">▸</span>` : ''}
                        </button>
                        ${cat.subcategories && cat.subcategories.length > 0 ? `
                            <ul class="sub-menu" data-parent="${cat.name}">
                                ${cat.subcategories.map(sub => `
                                    <li class="nav-item">
                                        <button class="nav-link" data-section="overview" data-category="${sub}" data-type="overview" data-parent="${cat.name}">
                                            ${sub}
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
        </li>`;
    }

    // بناء روابط Products مع فئاتها
    let productsHtml = '';
    if (categories.length > 0) {
        productsHtml = `<li class="nav-item">
            <button class="nav-link" data-section="products" data-type="products">
                Products
                <span class="toggle-icon">▸</span>
            </button>
            <ul class="sub-menu" data-parent="products">
                ${categories.map(cat => `
                    <li class="nav-item">
                        <button class="nav-link" data-section="products" data-category="${cat.name}" data-type="products">
                            ${cat.name}
                            ${cat.subcategories && cat.subcategories.length > 0 ? `<span class="toggle-icon">▸</span>` : ''}
                        </button>
                        ${cat.subcategories && cat.subcategories.length > 0 ? `
                            <ul class="sub-menu" data-parent="${cat.name}">
                                ${cat.subcategories.map(sub => `
                                    <li class="nav-item">
                                        <button class="nav-link" data-section="products" data-category="${sub}" data-type="products" data-parent="${cat.name}">
                                            ${sub}
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
        </li>`;
    }

    // إضافة روابط About و Contact كعناصر منفصلة
    const otherHtml = `
        <li class="nav-item">
            <a href="#about-section" class="nav-link" data-section="about">About Us</a>
        </li>
        <li class="nav-item">
            <a href="#contact-section" class="nav-link" data-section="contact">Contact</a>
        </li>
    `;

    sidebarNav.innerHTML = `
        <ul style="list-style:none; padding:0; margin:0; width:100%;">
            ${overviewHtml}
            ${productsHtml}
            ${otherHtml}
        </ul>
    `;

    // إضافة مستمعات الأحداث للقوائم المتداخلة
    sidebarNav.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            const category = this.dataset.category || null;
            const type = this.dataset.type || null;
            const parent = this.dataset.parent || null;

            // تبديل القائمة الفرعية (توسيع/طي)
            const parentLi = this.closest('.nav-item');
            const subMenu = parentLi ? parentLi.querySelector('.sub-menu') : null;
            if (subMenu) {
                const isOpen = subMenu.classList.contains('open');
                // إغلاق جميع القوائم الفرعية في نفس المستوى
                const siblingMenus = parentLi.parentElement.querySelectorAll('.sub-menu');
                siblingMenus.forEach(sm => sm.classList.remove('open'));
                if (!isOpen) {
                    subMenu.classList.add('open');
                }
                // تبديل أيقونة السهم
                const icon = this.querySelector('.toggle-icon');
                if (icon) {
                    icon.classList.toggle('open');
                }
            }

            // إذا كان هناك تصنيف محدد، قم بتصفية المنتجات
            if (category && type) {
                currentFilterType = type;
                currentFilter = category;
                // إعادة ضبط أزرار الفلتر (إلغاء التحديد)
                filterBtns.forEach(b => b.classList.remove('active'));
                // تحديث الشبكة
                filterProducts();
                // التمرير إلى الشبكة
                document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
                // إغلاق القائمة الجانبية في الهاتف
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove('open');
                    hamburgerBtn?.classList.remove('active');
                }
                return;
            }

            // إذا كان قسم (Overview أو Products) وليس تصنيفاً محدداً
            if (section === 'overview' || section === 'products') {
                // قم بتوسيع/طي القائمة الفرعية
                // التمرير إلى الشبكة
                document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
            }

            // التنقل للأقسام الأخرى (About, Contact)
            if (section === 'about') {
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

    // فتح القائمة الافتراضية (Products)
    const productsNav = sidebarNav.querySelector('[data-section="products"]');
    if (productsNav) {
        const parentLi = productsNav.closest('.nav-item');
        const subMenu = parentLi ? parentLi.querySelector('.sub-menu') : null;
        if (subMenu) {
            subMenu.classList.add('open');
            const icon = productsNav.querySelector('.toggle-icon');
            if (icon) icon.classList.add('open');
        }
    }
}

// ============================================
// 4. عرض المنتجات في الشبكة مع Pagination
// ============================================

function renderProducts(products, append = false) {
    if (!append) {
        productsGrid.innerHTML = '';
        displayedProducts = [];
    }

    if (!products || products.length === 0) {
        if (!append) {
            productsGrid.innerHTML = '<div class="empty-state">No products available right now. Check back soon!</div>';
        }
        return;
    }

    products.forEach((product) => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
        displayedProducts.push(product.id);
    });

    if (allLoaded || filteredProducts.length <= displayedProducts.length) {
        loadMoreContainer.style.display = 'none';
    } else {
        loadMoreContainer.style.display = 'block';
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.style.cursor = 'pointer';
    card.addEventListener('click', function(e) {
        if (e.target.closest('.order-btn') || e.target.closest('.variant-select') || e.target.closest('.image-nav-btn')) {
            return;
        }
        window.location.href = `product.html?id=${product.id}`;
    });

    const hasVariants = product.variants && product.variants.length > 0;
    const firstVariant = hasVariants ? product.variants[0] : null;
    const defaultImage = (firstVariant && firstVariant.image) ? firstVariant.image : (product.imageUrl || '');
    const defaultPrice = (firstVariant && firstVariant.price) ? firstVariant.price : (product.basePrice || 0);

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
    allImages = [...new Set(allImages)];
    const hasMultipleImages = allImages.length > 1;

    let variantOptionsHtml = '';
    if (hasVariants) {
        variantOptionsHtml = `
            <select class="variant-select" data-product-id="${product.id}">
                ${product.variants.map((v, idx) => `
                    <option value="${idx}" data-price="${v.price || product.basePrice}" 
                            data-image="${v.image || product.imageUrl || ''}"
                            data-size="${v.size || ''}"
                            data-color="${v.color || ''}"
                            ${idx === 0 ? 'selected' : ''}>
                        ${v.size ? v.size : ''} ${v.color ? '- ' + v.color : ''}
                    </option>
                `).join('')}
            </select>
        `;
    }

    card.innerHTML = `
        <div class="product-image-wrap" data-product-id="${product.id}">
            <img src="${defaultImage}" alt="${product.name || 'KSOR Rug'}" 
                 class="product-main-image" loading="eager" draggable="false">
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

    // ----- معالجة Slider الصور -----
    if (hasMultipleImages) {
        let currentImageIndex = 0;
        const img = card.querySelector('.product-main-image');
        const dots = card.querySelectorAll('.image-dots span');
        const prevBtn = card.querySelector('.image-nav-btn.prev');
        const nextBtn = card.querySelector('.image-nav-btn.next');
        let touchStartX = 0;
        let touchEndX = 0;

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

        // دعم اللمس (Swipe)
        const wrap = card.querySelector('.product-image-wrap');
        if (wrap) {
            wrap.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            wrap.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 30) {
                    if (diff > 0) {
                        updateImage(currentImageIndex + 1);
                    } else {
                        updateImage(currentImageIndex - 1);
                    }
                }
            }, { passive: true });
        }

        card._updateImage = updateImage;
        card._allImages = allImages;
    }

    // ----- معالجة المتغيرات -----
    const variantSelect = card.querySelector('.variant-select');
    if (variantSelect) {
        variantSelect.addEventListener('change', function(e) {
            e.stopPropagation();
            const selectedOption = this.options[this.selectedIndex];
            const newPrice = parseInt(selectedOption.getAttribute('data-price')) || 0;
            const newImage = selectedOption.getAttribute('data-image');
            const newSize = selectedOption.getAttribute('data-size') || '';
            const newColor = selectedOption.getAttribute('data-color') || '';

            const priceEl = this.closest('.product-body').querySelector('.product-price');
            if (priceEl) {
                priceEl.textContent = newPrice + ' DZD';
                priceEl.dataset.basePrice = newPrice;
            }

            const img = this.closest('.product-card').querySelector('.product-main-image');
            if (img && newImage) {
                img.src = newImage;
                const cardEl = this.closest('.product-card');
                if (cardEl._allImages) {
                    const imgIndex = cardEl._allImages.indexOf(newImage);
                    if (imgIndex !== -1 && cardEl._updateImage) {
                        cardEl._updateImage(imgIndex);
                    }
                }
            }

            const sizeEl = this.closest('.product-body').querySelector('.product-size');
            if (sizeEl) {
                const displayText = newSize ? newSize : (selectedOption.textContent.trim());
                sizeEl.textContent = displayText;
            }
        });
    }

    // ----- زر ORDER -----
    const orderBtn = card.querySelector('.order-btn');
    orderBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const productId = this.dataset.productId;
        const product = allProducts.find(p => p.id === productId);
        if (product) {
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
// 5. تحميل المزيد من المنتجات (Load More)
// ============================================

async function loadMoreProducts() {
    if (isLoading || allLoaded) return;
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;

    try {
        const startIndex = displayedProducts.length;
        const remaining = filteredProducts.slice(startIndex, startIndex + getPageSize());
        if (remaining.length === 0) {
            allLoaded = true;
            loadMoreContainer.style.display = 'none';
            return;
        }
        renderProducts(remaining, true);
        if (displayedProducts.length >= filteredProducts.length) {
            allLoaded = true;
            loadMoreContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading more products:', error);
    } finally {
        isLoading = false;
        loadMoreBtn.textContent = 'Load More Products';
        loadMoreBtn.disabled = false;
    }
}

// ============================================
// 6. البحث والفلترة
// ============================================

function filterProducts() {
    const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : '') ||
                       (mobileSearchInput ? mobileSearchInput.value.toLowerCase().trim() : '');

    filteredProducts = allProducts.filter(product => {
        // فلترة حسب التصنيف (مع دعم الفئات الفرعية)
        if (currentFilter !== 'all') {
            // إذا كان الفلتر من نوع Overview
            if (currentFilterType === 'overview') {
                // المنتج ينتمي إلى هذه الفئة في Overview
                if (product.overviewCategory === currentFilter) return true;
                // أو إذا كانت الفئة الفرعية في Overview
                const parentOverview = categoriesOverview.find(c => c.subcategories && c.subcategories.includes(currentFilter));
                if (parentOverview && product.overviewCategory === parentOverview.name) return true;
                return false;
            } else {
                // فلتر Products
                if (product.category === currentFilter) return true;
                const parentCategory = categories.find(c => c.subcategories && c.subcategories.includes(currentFilter));
                if (parentCategory && product.category === parentCategory.name) return true;
                return false;
            }
        }
        return true;
    }).filter(product => {
        if (searchTerm) {
            const searchable = [
                product.name || '',
                product.size || '',
                product.category || '',
                product.overviewCategory || '',
                ...(product.variants ? product.variants.map(v => `${v.size || ''} ${v.color || ''}`) : [])
            ].join(' ').toLowerCase();
            return searchable.includes(searchTerm);
        }
        return true;
    });

    allLoaded = false;
    displayedProducts = [];
    const initialBatch = filteredProducts.slice(0, getPageSize());
    renderProducts(initialBatch, false);
    updateProductCount();
}

function updateProductCount() {
    if (productCount) {
        productCount.textContent = `${filteredProducts.length} products`;
    }
}

// ربط البحث الديسكتوب والموبايل معاً
if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
}
if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', filterProducts);
}

// ============================================
// 7. نافذة الطلب المنبثقة (Order Modal)
// ============================================

function openOrderModal(product, selectedVariant, variantIndex) {
    currentProductForOrder = product;
    currentVariantForOrder = selectedVariant;

    const price = selectedVariant?.price || product.basePrice || 0;
    modalSubtotal.textContent = price + ' DZD';
    modalTotal.textContent = price + ' DZD';
    modalDelivery.textContent = '0 DZD';

    if (product.customizableSize) {
        customSizeGroup.style.display = 'block';
    } else {
        customSizeGroup.style.display = 'none';
        customSizeInput.value = '';
    }

    orderStatus.textContent = '';
    orderStatus.style.color = '';
    populateWilayaSelect();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function populateWilayaSelect() {
    if (!wilayaSelect) return;
    wilayaSelect.innerHTML = '<option value="">-- Select your wilaya --</option>';
    WILAYAS.forEach(w => {
        const option = document.createElement('option');
        option.value = w.code;
        option.textContent = `${w.code} - ${w.name}`;
        wilayaSelect.appendChild(option);
    });
    wilayaSelect.onchange = function() {
        updateDeliveryFee();
    };
}

function updateDeliveryFee() {
    const wilayaCode = wilayaSelect ? wilayaSelect.value : '';
    const price = parseInt((modalSubtotal ? modalSubtotal.textContent : '0')) || 0;

    if (!wilayaCode) {
        if (modalDelivery) modalDelivery.textContent = '0 DZD';
        if (modalTotal) modalTotal.textContent = price + ' DZD';
        return;
    }

    const rate = deliveryRates[wilayaCode] || { price: 0, free: false };
    const deliveryPrice = rate.free ? 0 : (rate.price || 0);
    const total = price + deliveryPrice;

    if (modalDelivery) modalDelivery.textContent = deliveryPrice + ' DZD';
    if (modalTotal) modalTotal.textContent = total + ' DZD';
}

function closeOrderModal() {
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    if (orderStatus) orderStatus.textContent = '';
}

if (modalClose) modalClose.addEventListener('click', closeOrderModal);
if (modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeOrderModal();
    });
}

// ============================================
// 8. إرسال الطلب (Google Sheets + Firebase)
// ============================================

if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const wilayaCode = wilayaSelect ? wilayaSelect.value : '';
        const customSize = customSizeInput ? customSizeInput.value.trim() : '';

        if (!name || !phone || !wilayaCode) {
            orderStatus.textContent = '⚠️ Please fill in all required fields.';
            orderStatus.style.color = '#c0392b';
            return;
        }

        const price = parseInt(modalSubtotal ? modalSubtotal.textContent : '0') || 0;
        const deliveryRate = deliveryRates[wilayaCode] || { price: 0, free: false };
        const deliveryPrice = deliveryRate.free ? 0 : (deliveryRate.price || 0);
        const total = price + deliveryPrice;
        const wilayaName = WILAYAS.find(w => w.code === wilayaCode)?.name || wilayaCode;

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
            productId: currentProductForOrder?.id || '',
            status: 'en attente'
        };

        const submitBtn = this.querySelector('.order-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        orderStatus.textContent = '';

        try {
            const sheetsUrl = storeSettings.googleSheetsUrl || '';
            if (sheetsUrl) {
                await fetch(sheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
            }

            await addDoc(collection(db, 'orders'), orderData);

            closeOrderModal();
            showSuccessModal();

            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
            orderForm.reset();

        } catch (error) {
            console.error('Error sending order:', error);
            orderStatus.textContent = '⚠️ Error sending order. Please try again.';
            orderStatus.style.color = '#c0392b';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
        }
    });
}

// ============================================
// 9. نافذة نجاح الطلب + تحميل PDF
// ============================================

function showSuccessModal() {
    if (successModal) {
        successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSuccessModal() {
    if (successModal) {
        successModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

if (successClose) successClose.addEventListener('click', closeSuccessModal);
if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeSuccessModal);
if (successModal) {
    successModal.addEventListener('click', function(e) {
        if (e.target === this) closeSuccessModal();
    });
}

if (downloadPdfAfterOrder) {
    downloadPdfAfterOrder.addEventListener('click', function() {
        if (currentProductForOrder) {
            generateProductPDF(currentProductForOrder.id);
        }
    });
}

// ============================================
// 10. إنشاء ملف PDF التقني
// ============================================

window.generateProductPDF = async function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        alert('Product not found.');
        return;
    }

    let pdfImage = product.pdfImage || product.imageUrl || '';
    if (product.variants && product.variants.length > 0 && !pdfImage) {
        pdfImage = product.variants[0].image || product.imageUrl || '';
    }

    const pdfContent = document.createElement('div');
    pdfContent.style.cssText = `
        width: 600px;
        padding: 40px;
        background: #faf9f6;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1a1a1a;
    `;

    const logoUrl = storeSettings.logoUrl || '';
    const logoHtml = logoUrl ? 
        `<img src="${logoUrl}" alt="TIDDIS TAPIS" style="max-height:50px; margin-bottom:20px;">` :
        `<div style="font-family: 'Fraunces', Georgia, serif; font-size:28px; font-weight:600; letter-spacing:4px; color:#1a1a1a;">TIDDIS</div>
         <div style="font-family: 'Fraunces', Georgia, serif; font-size:14px; font-weight:300; letter-spacing:6px; color:#4E1A1D; margin-top:2px;">TAPIS</div>`;

    const sizeList = product.variants && product.variants.length > 0 ? 
        product.variants.map(v => v.size).filter(s => s).join(', ') : 
        (product.size || '200x280 cm');

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
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; text-align:right;">${sizeList}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; font-family:'Space Mono', monospace; font-size:12px; color:#6b6b6b;">Customizable Size</td>
                    <td style="padding:8px 0; border-bottom:1px solid #e2e0d8; text-align:right;">${product.customizableSize ? '✅ Yes' : '❌ No'}</td>
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

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:600px;';
    tempDiv.appendChild(pdfContent);
    document.body.appendChild(tempDiv);

    try {
        const qrContainer = tempDiv.querySelector('#qrcode-container');
        if (qrContainer && typeof QRCode !== 'undefined') {
            const productUrl = `${window.location.origin}/product.html?id=${product.id}`;
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
// 11. صفحة تفاصيل المنتج (Product Detail)
// ============================================

window.loadProductDetail = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) {
        if (skeleton) skeleton.style.display = 'none';
        if (detailContainer) {
            detailContainer.style.display = 'block';
            detailContainer.innerHTML = '<p style="text-align:center; padding:40px;">Product not found.</p>';
        }
        return;
    }

    currentProductId = productId;

    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            if (skeleton) skeleton.style.display = 'none';
            if (detailContainer) {
                detailContainer.style.display = 'block';
                detailContainer.innerHTML = '<p style="text-align:center; padding:40px;">Product not found.</p>';
            }
            return;
        }

        const product = { id: docSnap.id, ...docSnap.data() };
        
        if (skeleton) skeleton.style.display = 'none';
        if (detailContainer) detailContainer.style.display = 'block';
        
        renderProductDetail(product);
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        if (skeleton) skeleton.style.display = 'none';
        if (detailContainer) {
            detailContainer.style.display = 'block';
            detailContainer.innerHTML = '<p style="text-align:center; padding:40px; color:#c0392b;">Error loading product. Please try again.</p>';
        }
    }
};

function renderProductDetail(product) {
    if (detailName) detailName.textContent = product.name || 'KSOR Classic';

    if (detailImages) {
        detailImages.innerHTML = '';
        const allImages = [];
        if (product.imageUrl) allImages.push(product.imageUrl);
        if (product.additionalImages) {
            allImages.push(...product.additionalImages);
        }
        if (product.variants) {
            product.variants.forEach(v => {
                if (v.image && !allImages.includes(v.image)) {
                    allImages.push(v.image);
                }
            });
        }
        const uniqueImages = [...new Set(allImages)];
        
        if (uniqueImages.length === 0) {
            detailImages.innerHTML = '<p style="color:#6b6b6b;">No images available.</p>';
        } else {
            uniqueImages.forEach((url, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'detail-image-wrapper';
                imgWrapper.style.cssText = 'margin-bottom:20px; width:100%;';
                const img = document.createElement('img');
                img.src = url;
                img.alt = `${product.name} - Image ${index + 1}`;
                img.style.cssText = 'width:100%; height:auto; max-height:600px; object-fit:contain; border-radius:4px; border:1px solid #e2e0d8; background:#f4f2ed;';
                img.loading = 'eager';
                imgWrapper.appendChild(img);
                detailImages.appendChild(imgWrapper);
            });
        }
    }

    const hasVariants = product.variants && product.variants.length > 0;
    const firstVariant = hasVariants ? product.variants[0] : null;
    const defaultPrice = (firstVariant && firstVariant.price) ? firstVariant.price : (product.basePrice || 0);
    const defaultSize = firstVariant?.size || product.size || '200x280 cm';
    const defaultColor = firstVariant?.color || '';

    if (detailSize) detailSize.textContent = defaultSize;
    if (detailColor) detailColor.textContent = defaultColor;
    if (detailPrice) detailPrice.textContent = defaultPrice + ' DZD';

    if (detailVariant) {
        detailVariant.innerHTML = '';
        if (hasVariants) {
            product.variants.forEach((v, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                option.textContent = v.size ? v.size : (v.color || `Variant ${idx + 1}`);
                option.dataset.price = v.price || product.basePrice;
                option.dataset.image = v.image || product.imageUrl || '';
                option.dataset.size = v.size || '';
                option.dataset.color = v.color || '';
                if (idx === 0) option.selected = true;
                detailVariant.appendChild(option);
            });
            detailVariant.style.display = 'block';
        } else {
            detailVariant.style.display = 'none';
        }

        detailVariant.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const newPrice = parseInt(selectedOption.dataset.price) || 0;
            const newImage = selectedOption.dataset.image;
            const newSize = selectedOption.dataset.size || '';
            const newColor = selectedOption.dataset.color || '';

            if (detailPrice) detailPrice.textContent = newPrice + ' DZD';
            if (detailSize) detailSize.textContent = newSize || defaultSize;
            if (detailColor) detailColor.textContent = newColor || '';

            if (newImage && detailImages) {
                const firstImg = detailImages.querySelector('img');
                if (firstImg) {
                    firstImg.src = newImage;
                }
            }
        });
    }

    if (detailOrderBtn) {
        detailOrderBtn.addEventListener('click', function() {
            const select = detailVariant;
            let selectedVariant = null;
            let selectedIndex = 0;
            if (select && hasVariants) {
                selectedIndex = parseInt(select.value);
                selectedVariant = product.variants[selectedIndex] || null;
            }
            openOrderModal(product, selectedVariant, selectedIndex);
        });
    }

    if (detailPdfBtn) {
        detailPdfBtn.addEventListener('click', function() {
            generateProductPDF(product.id);
        });
    }

    if (productPageLogo && storeSettings.logoUrl) {
        productPageLogo.src = storeSettings.logoUrl;
        productPageLogo.style.display = 'inline-block';
    }

    if (detailDescription && product.description) {
        detailDescription.textContent = product.description;
        detailDescription.style.display = 'block';
    }
}

// ============================================
// 12. تطبيق إعدادات المتجر (ألوان، شعار، نصوص، أيقونات)
// ============================================

function applyStoreSettings() {
    if (storeSettings.sidebarBgColor) {
        document.documentElement.style.setProperty('--sidebar-bg', storeSettings.sidebarBgColor);
        const sidebarEl = document.querySelector('.sidebar');
        if (sidebarEl) sidebarEl.style.backgroundColor = storeSettings.sidebarBgColor;
    }
    if (storeSettings.mainBgColor) {
        document.documentElement.style.setProperty('--bg-color', storeSettings.mainBgColor);
        document.body.style.backgroundColor = storeSettings.mainBgColor;
    }

    const logoUrl = storeSettings.logoUrl || '';
    const logoElements = [
        document.getElementById('sidebar-logo'),
        document.getElementById('mobile-logo'),
        document.getElementById('product-page-logo')
    ];
    logoElements.forEach(el => {
        if (el) {
            if (logoUrl) {
                el.src = logoUrl;
                el.style.display = 'inline-block';
            } else {
                el.style.display = 'none';
            }
        }
    });

    if (aboutText && storeSettings.aboutText) {
        aboutText.textContent = storeSettings.aboutText;
    }

    if (contactIcons && storeSettings.contacts) {
        renderContactIcons(storeSettings.contacts);
    }
}

function renderContactIcons(contacts) {
    if (!contacts || contacts.length === 0) {
        if (contactIcons) {
            contactIcons.innerHTML = '<span style="color:#6b6b6b; font-size:13px;">No contacts configured</span>';
        }
        return;
    }

    // أيقونات SVG المخصصة (سيتم استخدامها)
    const iconMap = {
        phone: 'phone',
        email: 'email',
        whatsapp: 'whatsapp',
        instagram: 'instagram',
        facebook: 'facebook',
        tiktok: 'tiktok',
        telegram: 'telegram'
    };

    if (contactIcons) {
        contactIcons.innerHTML = contacts.map(contact => {
            const iconType = iconMap[contact.platform] || 'phone';
            // بناء SVG بسيط (سيتم استبداله بالأيقونات الحقيقية في الإصدار النهائي)
            const svgIcon = `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <text x="12" y="16" font-size="10" text-anchor="middle" fill="currentColor">${contact.platform[0].toUpperCase()}</text>
            </svg>`;
            return `<a href="${contact.value}" target="${contact.platform === 'phone' || contact.platform === 'email' ? '_self' : '_blank'}" 
                      class="contact-item" style="text-decoration:none; color:var(--text-primary); border-bottom:1px solid transparent; transition:all 0.2s ease;">
                    <span class="contact-icon">${svgIcon}</span>
                    <span style="font-family:var(--font-mono); font-size:13px;">${contact.platform.charAt(0).toUpperCase() + contact.platform.slice(1)}</span>
                </a>`;
        }).join('');
    }
}

// ============================================
// 13. البحث في الهاتف (Toggle)
// ============================================

if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', function() {
        if (mobileSearchBar) {
            const isOpen = mobileSearchBar.classList.contains('open');
            mobileSearchBar.classList.toggle('open');
            if (!isOpen) {
                mobileSearchInput?.focus();
            }
        }
    });
}

if (mobileSearchClose) {
    mobileSearchClose.addEventListener('click', function() {
        if (mobileSearchBar) {
            mobileSearchBar.classList.remove('open');
            if (mobileSearchInput) mobileSearchInput.value = '';
            filterProducts();
        }
    });
}

// ============================================
// 14. مفتاح تبديل عرض الشبكة (Grid Toggle)
// ============================================

if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', function() {
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            // تبديل بين 1 و 2 عمود في الهاتف
            productsGrid.classList.toggle('grid-2-mobile');
            this.classList.toggle('active');
        } else {
            // تبديل بين 2 و 4 عمود في الديسكتوب
            productsGrid.classList.toggle('grid-4');
            this.classList.toggle('active');
        }
    });
}

// ============================================
// 15. التنقل والهامبورجر
// ============================================

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', function() {
        if (sidebar) sidebar.classList.toggle('open');
        this.classList.toggle('active');
        // إغلاق شريط البحث عند فتح القائمة
        if (mobileSearchBar) mobileSearchBar.classList.remove('open');
    });
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreProducts);
}

// تحديث حجم الصفحة عند تغيير حجم النافذة
window.addEventListener('resize', function() {
    const newSize = getPageSize();
    if (newSize !== pageSize) {
        pageSize = newSize;
        filterProducts();
    }
    // تحديث حالة المفتاح حسب الجهاز
    if (gridToggleBtn) {
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            if (productsGrid.classList.contains('grid-4')) {
                productsGrid.classList.remove('grid-4');
            }
        } else {
            if (productsGrid.classList.contains('grid-2-mobile')) {
                productsGrid.classList.remove('grid-2-mobile');
            }
        }
    }
});

// ============================================
// 16. التحميل الأولي (Initialization)
// ============================================

async function initStore() {
    try {
        pageSize = getPageSize();
        await loadCategories();
        await loadDeliveryRates();
        listenToStoreSettings();
        listenToProducts();
        
        // إذا كنا في صفحة التفاصيل، لا نقوم بتحميل الشبكة
        if (window.location.pathname.includes('product.html')) {
            return;
        }
        
        console.log('✅ TIDDIS TAPIS Store initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing store:', error);
    }
}

document.addEventListener('DOMContentLoaded', initStore);

// تصدير الوظائف للاستخدام في admin.js
export { allProducts, categories, categoriesOverview, deliveryRates, storeSettings };
