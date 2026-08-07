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
let currentFilterType = 'products';
let currentProductForOrder = null;
let currentVariantForOrder = null;
let currentProductId = null;
let pageSize = 4;
let lastDoc = null;
let isLoading = false;
let allLoaded = false;
let wilayaList = [];
let productDetailLoaded = false;
let gridColumns = 2;
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
const loader = document.getElementById('product-loader');
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

    sidebarNav.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            const category = this.dataset.category || null;
            const type = this.dataset.type || null;
            const parent = this.dataset.parent || null;

            const parentLi = this.closest('.nav-item');
            const subMenu = parentLi ? parentLi.querySelector('.sub-menu') : null;
            if (subMenu) {
                const isOpen = subMenu.classList.contains('open');
                const siblingMenus = parentLi.parentElement.querySelectorAll('.sub-menu');
                siblingMenus.forEach(sm => sm.classList.remove('open'));
                if (!isOpen) {
                    subMenu.classList.add('open');
                }
                const icon = this.querySelector('.toggle-icon');
                if (icon) {
                    icon.classList.toggle('open');
                }
            }

            if (category && type) {
                currentFilterType = type;
                currentFilter = category;
                filterBtns.forEach(b => b.classList.remove('active'));
                filterProducts();
                document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove('open');
                    hamburgerBtn?.classList.remove('active');
                }
                return;
            }

            if (section === 'about') {
                document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (section === 'contact') {
                document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
            }

            if (window.innerWidth <= 900) {
                sidebar.classList.remove('open');
                hamburgerBtn?.classList.remove('active');
            }
        });
    });

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

    // Slider مع أزرار أساسية + دعم اللمس
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

    // المتغيرات
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

    // زر ORDER
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
        if (currentFilter !== 'all') {
            if (currentFilterType === 'overview') {
                if (product.overviewCategory === currentFilter) return true;
                const parentOverview = categoriesOverview.find(c => c.subcategories && c.subcategories.includes(currentFilter));
                if (parentOverview && product.overviewCategory === parentOverview.name) return true;
                return false;
            } else {
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
// 11. صفحة تفاصيل المنتج (Product Detail) - مع Loader
// ============================================

window.loadProductDetail = async function() {
    // إظهار الـ Loader وإخفاء المحتوى
    if (loader) loader.style.display = 'flex';
    if (detailContainer) detailContainer.style.display = 'none';

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) {
        if (loader) loader.style.display = 'none';
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
            if (loader) loader.style.display = 'none';
            if (detailContainer) {
                detailContainer.style.display = 'block';
                detailContainer.innerHTML = '<p style="text-align:center; padding:40px;">Product not found.</p>';
            }
            return;
        }

        const product = { id: docSnap.id, ...docSnap.data() };
        
        // إخفاء الـ Loader وعرض المحتوى
        if (loader) loader.style.display = 'none';
        if (detailContainer) detailContainer.style.display = 'block';
        
        renderProductDetail(product);
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        if (loader) loader.style.display = 'none';
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

    // SVG icons map
    const iconSVGs = {
        phone: `<svg class="tiddis-icon outline" viewBox="0 0 24 24" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
        email: `<svg class="tiddis-icon outline" viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6 12 13 2 6"/></svg>`,
        whatsapp: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 0 1-1.26-4.3c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.67 8.14-8.09 8.14zm4.47-6.1c-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>`,
        instagram: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.16c2.67 0 2.99.01 4.04.06 1.05.05 1.77.21 2.4.46.65.25 1.2.6 1.75 1.15s.9 1.1 1.15 1.75c.25.63.41 1.35.46 2.4.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.05 1.05-.21 1.77-.46 2.4a4.9 4.9 0 0 1-1.15 1.75 4.9 4.9 0 0 1-1.75 1.15c-.63.25-1.35.41-2.4.46-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-1.05-.05-1.77-.21-2.4-.46a4.9 4.9 0 0 1-1.75-1.15 4.9 4.9 0 0 1-1.15-1.75c-.25-.63-.41-1.35-.46-2.4C2.17 14.99 2.16 14.67 2.16 12s.01-2.99.06-4.04c.05-1.05.21-1.77.46-2.4.25-.65.6-1.2 1.15-1.75S4.87 2.91 5.52 2.66c.63-.25 1.35-.41 2.4-.46C8.97 2.17 9.29 2.16 12 2.16zm0 1.8c-2.63 0-2.93.01-3.97.06-.9.04-1.4.19-1.72.31-.43.17-.74.37-1.06.7-.32.32-.52.63-.7 1.06-.12.32-.27.82-.31 1.72-.05 1.04-.06 1.34-.06 3.97s.01 2.93.06 3.97c.04.9.19 1.4.31 1.72.17.43.37.74.7 1.06.32.32.63.52 1.06.7.32.12.82.27 1.72.31 1.04.05 1.34.06 3.97.06s2.93-.01 3.97-.06c.9-.04 1.4-.19 1.72-.31.43-.17.74-.37 1.06-.7.32-.32.52-.63.7-1.06.12-.32.27-.82.31-1.72.05-1.04.06-1.34.06-3.97s-.01-2.93-.06-3.97c-.04-.9-.19-1.4-.31-1.72a2.9 2.9 0 0 0-.7-1.06 2.9 2.9 0 0 0-1.06-.7c-.32-.12-.82-.27-1.72-.31-1.04-.05-1.34-.06-3.97-.06zm0 3.7a4.34 4.34 0 1 1 0 8.68 4.34 4.34 0 0 1 0-8.68zm0 1.8a2.54 2.54 0 1 0 0 5.08 2.54 2.54 0 0 0 0-5.08zm4.53-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`,
        facebook: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.95 8.44-9.94z"/></svg>`,
        tiktok: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M16.6 2h-3.2v13.4a2.6 2.6 0 1 1-2.6-2.6c.24 0 .47.02.7.07V9.6a5.8 5.8 0 1 0 5.1 5.76V8.9a7.5 7.5 0 0 0 4.4 1.4V7.1a4.3 4.3 0 0 1-4.4-4.1z"/></svg>`,
        telegram: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M22.05 3.24 2.4 10.9c-.9.35-.9 1.72.02 2.02l4.9 1.58 1.9 6.1c.28.9 1.44 1.13 2.05.4l2.6-3.08 4.94 3.7c.83.62 2.03.16 2.24-.87l3.3-16.02c.22-1.08-.92-1.94-1.9-1.55zM17.9 7.1l-7.87 7.24-.32 3.5-1.55-4.98 9.2-6.28c.4-.27.83.23.54.52z"/></svg>`
    };

    const displayNames = {
        phone: 'Phone',
        email: 'Email',
        whatsapp: 'WhatsApp',
        instagram: 'Instagram',
        facebook: 'Facebook',
        tiktok: 'TikTok',
        telegram: 'Telegram'
    };

    if (contactIcons) {
        contactIcons.innerHTML = contacts.map(contact => {
            const iconSvg = iconSVGs[contact.platform] || iconSVGs.phone;
            const displayName = displayNames[contact.platform] || contact.platform;
            const href = contact.platform === 'phone' ? `tel:${contact.value}` :
                         contact.platform === 'email' ? `mailto:${contact.value}` :
                         contact.value;
            return `<a href="${href}" target="${contact.platform === 'phone' || contact.platform === 'email' ? '_self' : '_blank'}" class="contact-item">
                        <span class="contact-icon">${iconSvg}</span>
                        <span>${displayName}</span>
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
            productsGrid.classList.toggle('grid-2-mobile');
            this.classList.toggle('active');
        } else {
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
        if (mobileSearchBar) mobileSearchBar.classList.remove('open');
    });
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreProducts);
}

window.addEventListener('resize', function() {
    const newSize = getPageSize();
    if (newSize !== pageSize) {
        pageSize = newSize;
        filterProducts();
    }
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
        
        if (window.location.pathname.includes('product.html')) {
            return;
        }
        
        console.log('✅ TIDDIS TAPIS Store initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing store:', error);
    }
}

document.addEventListener('DOMContentLoaded', initStore);

export { allProducts, categories, categoriesOverview, deliveryRates, storeSettings };
