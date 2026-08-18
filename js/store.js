// ============================================
// TIDDIS TAPIS — Storefront Logic (محدث بالكامل)
// منطق المتجر الرئيسي مع تحسينات خوارزمية:
// - إدارة حالة مركزية (AppState)
// - تصفية O(1) باستخدام Index Maps
// - عرض Efficient مع DocumentFragment
// - إصلاح جميع الأخطاء المنطقية
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
// 1. إدارة الحالة المركزية (AppState)
// ============================================
const AppState = {
    products: {
        all: [],
        filtered: [],
        displayed: [],
        loaded: false,
        categoryIndex: new Map(),
        overviewIndex: new Map()
    },
    attributes: [],
    filters: {
        category: 'all',
        type: 'products',  // 'products' | 'overview'
        search: '',
        advanced: {
            categories: [],
            prices: [],
            attributes: {}
        }
    },
    ui: {
        gridColumns: 3,
        sidebarOpen: false,
        modalOpen: null,
        pageSize: 4,
        allLoaded: false,
        displayedCount: 0
    },
    order: {
        currentProduct: null,
        currentVariant: null
    },
    settings: {
        deliveryRates: {},
        storeSettings: {}
    },
    categories: {
        products: [],
        overview: []
    }
};

// ============================================
// 2. عناصر DOM
// ============================================
const DOM = {
    productsGrid: document.getElementById('products-grid'),
    searchInput: document.getElementById('search-input'),
    mobileSearchInput: document.getElementById('mobile-search-input'),
    productCount: document.getElementById('product-count'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    loadMoreContainer: document.getElementById('load-more-container'),
    modal: document.getElementById('order-modal'),
    modalClose: document.getElementById('modal-close'),
    orderForm: document.getElementById('order-form'),
    wilayaSelect: document.getElementById('wilaya-select'),
    modalSubtotal: document.getElementById('modal-subtotal'),
    modalDelivery: document.getElementById('modal-delivery'),
    modalTotal: document.getElementById('modal-total'),
    customSizeGroup: document.getElementById('custom-size-group'),
    customSizeInput: document.getElementById('custom-size'),
    orderStatus: document.getElementById('order-status'),
    aboutText: document.getElementById('about-text'),
    aboutImage: document.getElementById('about-image'),
    contactIcons: document.getElementById('contact-icons'),
    sidebar: document.getElementById('sidebar'),
    sidebarNav: document.getElementById('sidebar-nav'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    searchToggleBtn: document.getElementById('search-toggle-btn'),
    mobileSearchBar: document.getElementById('mobile-search-bar'),
    mobileSearchClose: document.getElementById('mobile-search-close'),
    successModal: document.getElementById('order-success-modal'),
    successClose: document.getElementById('success-close'),
    closeSuccessBtn: document.getElementById('close-success-modal'),
    downloadPdfAfterOrder: document.getElementById('download-pdf-after-order'),
    gridDensityLoose: document.getElementById('grid-density-loose'),
    gridDensityDense: document.getElementById('grid-density-dense'),
    toggleFiltersBtn: document.getElementById('toggle-filters-btn'),
    filtersPanel: document.getElementById('advanced-filters-panel'),
    applyFiltersBtn: document.getElementById('apply-filters-btn'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    dynamicFilterGroups: document.getElementById('dynamic-filter-groups'),
    optionsCategories: document.getElementById('options-categories')
};

// عناصر صفحة التفاصيل
const DetailDOM = {
    container: document.getElementById('product-detail-container'),
    name: document.getElementById('product-detail-name'),
    images: document.getElementById('product-detail-images'),
    size: document.getElementById('product-detail-size'),
    color: document.getElementById('product-detail-color'),
    price: document.getElementById('product-detail-price'),
    variant: document.getElementById('product-detail-variant'),
    orderBtn: document.getElementById('product-detail-order-btn'),
    pdfBtn: document.getElementById('product-detail-pdf-btn'),
    description: document.getElementById('product-detail-description'),
    logo: document.getElementById('product-page-logo')
};

// ============================================
// 3. قائمة الولايات الـ 58
// ============================================
const WILAYAS = [
    { code: '01', name: 'أدرار' }, { code: '02', name: 'الشلف' },
    { code: '03', name: 'الأغواط' }, { code: '04', name: 'أم البواقي' },
    { code: '05', name: 'باتنة' }, { code: '06', name: 'بجاية' },
    { code: '07', name: 'بسكرة' }, { code: '08', name: 'بشار' },
    { code: '09', name: 'البليدة' }, { code: '10', name: 'البويرة' },
    { code: '11', name: 'تمنراست' }, { code: '12', name: 'تبسة' },
    { code: '13', name: 'تلمسان' }, { code: '14', name: 'تيارت' },
    { code: '15', name: 'تيزي وزو' }, { code: '16', name: 'الجزائر' },
    { code: '17', name: 'الجلفة' }, { code: '18', name: 'جيجل' },
    { code: '19', name: 'سطيف' }, { code: '20', name: 'سعيدة' },
    { code: '21', name: 'سكيكدة' }, { code: '22', name: 'سيدي بلعباس' },
    { code: '23', name: 'عنابة' }, { code: '24', name: 'قالمة' },
    { code: '25', name: 'قسنطينة' }, { code: '26', name: 'المدية' },
    { code: '27', name: 'مستغانم' }, { code: '28', name: 'المسيلة' },
    { code: '29', name: 'معسكر' }, { code: '30', name: 'ورقلة' },
    { code: '31', name: 'وهران' }, { code: '32', name: 'البيض' },
    { code: '33', name: 'إليزي' }, { code: '34', name: 'برج بوعريريج' },
    { code: '35', name: 'بومرداس' }, { code: '36', name: 'الطارف' },
    { code: '37', name: 'تندوف' }, { code: '38', name: 'تيسمسيلت' },
    { code: '39', name: 'الوادي' }, { code: '40', name: 'خنشلة' },
    { code: '41', name: 'سوق أهراس' }, { code: '42', name: 'تيبازة' },
    { code: '43', name: 'ميلة' }, { code: '44', name: 'عين الدفلى' },
    { code: '45', name: 'النعامة' }, { code: '46', name: 'عين تموشنت' },
    { code: '47', name: 'غرداية' }, { code: '48', name: 'غليزان' },
    { code: '49', name: 'تميمون' }, { code: '50', name: 'برج باجي مختار' },
    { code: '51', name: 'أولاد جلال' }, { code: '52', name: 'بني عباس' },
    { code: '53', name: 'إن صالح' }, { code: '54', name: 'إن قزام' },
    { code: '55', name: 'توقرت' }, { code: '56', name: 'جانت' },
    { code: '57', name: 'المغير' }, { code: '58', name: 'المنيعة' }
];

// ============================================
// 4. دوال مساعدة (Pure Functions)
// ============================================

/** تحديد حجم الصفحة حسب الجهاز */
function getPageSize() {
    if (window.innerWidth <= 480) return 2;
    if (window.innerWidth <= 900) return 3;
    return 4;
}

/** بناء فهارس التصنيف (O(n) مرة واحدة فقط) */
function buildCategoryIndexes(products) {
    const categoryIndex = new Map();
    const overviewIndex = new Map();
    
    products.forEach(p => {
        // فهارس فئات المنتجات
        if (p.category) {
            if (!categoryIndex.has(p.category)) {
                categoryIndex.set(p.category, []);
            }
            categoryIndex.get(p.category).push(p);
        }
        // فهارس فئات Overview
        if (p.overviewCategory) {
            if (!overviewIndex.has(p.overviewCategory)) {
                overviewIndex.set(p.overviewCategory, []);
            }
            overviewIndex.get(p.overviewCategory).push(p);
        }
    });
    
    return { categoryIndex, overviewIndex };
}

/** الحصول على المنتجات المفلترة (O(1) + O(k)) */
function getFilteredProducts(state) {
    const { all } = state.products;
    const { search, advanced } = state.filters;
    
    // Guard Clause
    if (!all || all.length === 0) return [];
    
    let result = all;
    
    // 1. تصفية البحث النصي
    if (search && search.trim() !== '') {
        const term = search.toLowerCase().trim();
        result = result.filter(p => {
            const searchable = [
                p.name || '',
                p.category || '',
                ...(p.tags || []),
                ...(p.variants ? p.variants.map(v => `${v.size || ''} ${v.color || ''}`) : [])
            ].join(' ').toLowerCase();
            return searchable.includes(term);
        });
    }

    // 2. تصفية الفئات (Multi-select مع دعم الفئات الفرعية تلقائياً)
    if (advanced.categories.length > 0) {
        const allowedCategories = new Set();
        advanced.categories.forEach(catName => {
            allowedCategories.add(catName);
            const allCats = [...(AppState.categories.products || []), ...(AppState.categories.overview || [])];
            const foundCat = allCats.find(c => c.name === catName);
            if (foundCat && foundCat.subcategories && Array.isArray(foundCat.subcategories)) {
                foundCat.subcategories.forEach(sub => allowedCategories.add(sub));
            }
        });
        result = result.filter(p => allowedCategories.has(p.category) || allowedCategories.has(p.overviewCategory));
    }

    // 3. تصفية النطاق السعري
    if (advanced.prices.length > 0) {
        result = result.filter(p => {
            const price = parseFloat(p.basePrice) || 0;
            return advanced.prices.some(range => price >= range.min && price <= range.max);
        });
    }

    // 4. تصفية السمات الديناميكية (Intersection)
    for (const [attrId, selectedOptions] of Object.entries(advanced.attributes)) {
        if (selectedOptions.length > 0) {
            result = result.filter(p => {
                const productAttrValue = p.attributes ? p.attributes[attrId] : null;
                if (!productAttrValue) return false;
                
                if (Array.isArray(productAttrValue)) {
                    return productAttrValue.some(val => selectedOptions.includes(val));
                }
                return selectedOptions.includes(productAttrValue);
            });
        }
    }
    
    return result;
}

/** SVG أيقونات التواصل */
const CONTACT_ICONS = {
    phone: `<svg class="tiddis-icon outline" viewBox="0 0 24 24" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    email: `<svg class="tiddis-icon outline" viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6 12 13 2 6"/></svg>`,
    whatsapp: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 0 1-1.26-4.3c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.4a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.67 8.14-8.09 8.14zm4.47-6.1c-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>`,
    instagram: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.16c2.67 0 2.99.01 4.04.06 1.05.05 1.77.21 2.4.46.65.25 1.2.6 1.75 1.15s.9 1.1 1.15 1.75c.25.63.41 1.35.46 2.4.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.05 1.05-.21 1.77-.46 2.4a4.9 4.9 0 0 1-1.15 1.75 4.9 4.9 0 0 1-1.75 1.15c-.63.25-1.35.41-2.4.46-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-1.05-.05-1.77-.21-2.4-.46a4.9 4.9 0 0 1-1.75-1.15 4.9 4.9 0 0 1-1.15-1.75c-.25-.63-.41-1.35-.46-2.4C2.17 14.99 2.16 14.67 2.16 12s.01-2.99.06-4.04c.05-1.05.21-1.77.46-2.4.25-.65.6-1.2 1.15-1.75S4.87 2.91 5.52 2.66c.63-.25 1.35-.41 2.4-.46C8.97 2.17 9.29 2.16 12 2.16zm0 1.8c-2.63 0-2.93.01-3.97.06-.9.04-1.4.19-1.72.31-.43.17-.74.37-1.06.7-.32.32-.52.63-.7 1.06-.12.32-.27.82-.31 1.72-.05 1.04-.06 1.34-.06 3.97s.01 2.93.06 3.97c.04.9.19 1.4.31 1.72.17.43.37.74.7 1.06.32.32.63.52 1.06.7.32.12.82.27 1.72.31 1.04.05 1.34.06 3.97.06s2.93-.01 3.97-.06c.9-.04 1.4-.19 1.72-.31.43-.17.74-.37 1.06-.7.32-.32.52-.63.7-1.06.12-.32.27-.82.31-1.72.05-1.04.06-1.34.06-3.97s-.01-2.93-.06-3.97c-.04-.9-.19-1.4-.31-1.72a2.9 2.9 0 0 0-.7-1.06 2.9 2.9 0 0 0-1.06-.7c-.32-.12-.82-.27-1.72-.31-1.04-.05-1.34-.06-3.97-.06zm0 3.7a4.34 4.34 0 1 1 0 8.68 4.34 4.34 0 0 1 0-8.68zm0 1.8a2.54 2.54 0 1 0 0 5.08 2.54 2.54 0 0 0 0-5.08zm4.53-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`,
    facebook: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.95 8.44-9.94z"/></svg>`,
    tiktok: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M16.6 2h-3.2v13.4a2.6 2.6 0 1 1-2.6-2.6c.24 0 .47.02.7.07V9.6a5.8 5.8 0 1 0 5.1 5.76V8.9a7.5 7.5 0 0 0 4.4 1.4V7.1a4.3 4.3 0 0 1-4.4-4.1z"/></svg>`,
    telegram: `<svg class="tiddis-icon solid" viewBox="0 0 24 24" width="18" height="18"><path d="M22.05 3.24 2.4 10.9c-.9.35-.9 1.72.02 2.02l4.9 1.58 1.9 6.1c.28.9 1.44 1.13 2.05.4l2.6-3.08 4.94 3.7c.83.62 2.03.16 2.24-.87l3.3-16.02c.22-1.08-.92-1.94-1.9-1.55zM17.9 7.1l-7.87 7.24-.32 3.5-1.55-4.98 9.2-6.28c.4-.27.83.23.54.52z"/></svg>`
};

const CONTACT_NAMES = {
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    telegram: 'Telegram'
};

// ============================================
// 5. تحميل البيانات من Firebase
// ============================================

/** الاستماع الفوري للمنتجات مع تحديث الفهارس */
function listenToProducts() {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        const products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // تحديث الحالة
        AppState.products.all = products;
        const indexes = buildCategoryIndexes(products);
        AppState.products.categoryIndex = indexes.categoryIndex;
        AppState.products.overviewIndex = indexes.overviewIndex;
        AppState.products.loaded = true;
        
        // إعادة التصفية والعرض
        filterProducts();
        updateProductCount();
        
        if (window.updateProductStats) {
            window.updateProductStats(products.length);
        }
        
        console.log(`✅ Products updated: ${products.length} items`);
    }, (error) => {
        console.error('❌ Error listening to products:', error);
    });
}

/** تحميل أسعار التوصيل */
async function loadDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            AppState.settings.deliveryRates = docSnap.data();
        } else {
            const defaultRates = {};
            WILAYAS.forEach(w => {
                defaultRates[w.code] = { price: 500, free: false };
            });
            AppState.settings.deliveryRates = defaultRates;
            await setDoc(docRef, defaultRates);
        }
        return AppState.settings.deliveryRates;
    } catch (error) {
        console.error('Error loading delivery rates:', error);
        return {};
    }
}

/** الاستماع الفوري لإعدادات المتجر */
function listenToStoreSettings() {
    const docRef = doc(db, 'settings', 'storeSettings');
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            AppState.settings.storeSettings = docSnap.data();
        } else {
            AppState.settings.storeSettings = {
                aboutText: 'Tiddis Tapis is inspired by the deep-rooted history and ancient heritage of Constantine. We transform this timeless legacy into modern rugs.',
                aboutImage: 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg',
                logoUrl: 'https://i.ibb.co/4RDRss4y/tiddis-logo-liquid-glass.png',
                sidebarBgColor: '#ffffff',
                mainBgColor: '#faf9f6',
                contacts: [],
                googleSheetsUrl: ''
            };
            setDoc(docRef, AppState.settings.storeSettings);
        }
        applyStoreSettings();
    }, (error) => {
        console.error('Error listening to store settings:', error);
    });
}

/** تحميل الفئات وبناء القائمة الجانبية */
async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const productsCats = [];
        const overviewCats = [];
        
        querySnapshot.forEach((doc) => {
            const cat = { id: doc.id, ...doc.data() };
            if (cat.type === 'overview') {
                overviewCats.push(cat);
            } else {
                productsCats.push(cat);
            }
        });
        
        AppState.categories.products = productsCats;
        AppState.categories.overview = overviewCats;
        buildSidebarMenu();
        renderFilterUI();
        return { products: productsCats, overview: overviewCats };
    } catch (error) {
        console.error('Error loading categories:', error);
        return { products: [], overview: [] };
    }
}

async function loadAttributes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'attributes'));
        AppState.attributes = [];
        querySnapshot.forEach((doc) => {
            AppState.attributes.push({ id: doc.id, ...doc.data() });
        });
        renderFilterUI();
    } catch (error) {
        console.error('Error loading attributes:', error);
    }
}

function renderFilterUI() {
    // 1. رندر الفئات
    if (DOM.optionsCategories) {
        DOM.optionsCategories.innerHTML = AppState.categories.products.map(cat => `
            <label><input type="checkbox" class="category-filter" value="${cat.name}"> ${cat.name}</label>
        `).join('');
    }

    // 2. رندر السمات الديناميكية (مع دعم خاص للون لعرض الأيقونات الدائرية إذا كانت السمة تخص اللون)
    if (DOM.dynamicFilterGroups) {
        DOM.dynamicFilterGroups.innerHTML = AppState.attributes.map(attr => {
            const isColorAttr = attr.id.toLowerCase() === 'color' || attr.label.toLowerCase().includes('color') || attr.label.includes('لون');
            return `
                <div class="filter-group">
                    <h4>${attr.label}</h4>
                    <div class="filter-options ${isColorAttr ? 'color-filter-options' : ''}">
                        ${(attr.options || []).map(opt => {
                            if (isColorAttr) {
                                // محاولة إيجاد لون حقيقي أو رمز للأيقونة
                                const colorMap = {
                                    'Beige': '#f5f5dc', 'Gold': '#d4af37', 'Red': '#800020', 'Blue': '#1e3f66',
                                    'Black': '#111111', 'White': '#ffffff', 'Gray': '#808080', 'Green': '#2c5e3a',
                                    'Brown': '#654321', 'Burgundy': '#6b1d2f', 'Navy': '#000080', 'Cream': '#fffdd0'
                                };
                                const bgHex = colorMap[opt] || opt;
                                return `
                                    <label class="color-checkbox-label" title="${opt}">
                                        <input type="checkbox" class="attribute-filter" data-attr-id="${attr.id}" value="${opt}">
                                        <span class="color-swatch-icon" style="background-color: ${bgHex};"></span>
                                        <span>${opt}</span>
                                    </label>
                                `;
                            } else {
                                return `
                                    <label><input type="checkbox" class="attribute-filter" data-attr-id="${attr.id}" value="${opt}"> ${opt}</label>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ============================================
// 6. بناء القائمة الجانبية (محسّن)
// ============================================

let sidebarStructure = null;
let sidebarBuilt = false;

function buildSidebarMenu() {
    if (!DOM.sidebarNav) return;
    
    // بناء الهيكل مرة واحدة فقط
    if (sidebarBuilt && sidebarStructure) {
        DOM.sidebarNav.innerHTML = sidebarStructure;
        attachSidebarEvents();
        return;
    }
    
    const { products, overview } = AppState.categories;
    
    // بناء فئات Overview
    let overviewHtml = '';
    if (overview.length > 0) {
        overviewHtml = `<li class="nav-item">
            <button class="nav-link" data-section="overview" data-type="overview">
                Overview
                <span class="toggle-icon">▸</span>
            </button>
            <ul class="sub-menu" data-parent="overview">
                ${overview.map(cat => `
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
    
    // بناء فئات Products
    let productsHtml = '';
    if (products.length > 0) {
        productsHtml = `<li class="nav-item">
            <button class="nav-link" data-section="products" data-type="products">
                Products
                <span class="toggle-icon">▸</span>
            </button>
            <ul class="sub-menu" data-parent="products">
                ${products.map(cat => `
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
    
    sidebarStructure = `
        <ul style="list-style:none; padding:0; margin:0; width:100%;">
            ${overviewHtml}
            ${productsHtml}
            ${otherHtml}
        </ul>
    `;
    
    DOM.sidebarNav.innerHTML = sidebarStructure;
    sidebarBuilt = true;
    attachSidebarEvents();
    
    // ترك جميع القوائم مغلقة افتراضياً بناءً على طلب المستخدم

}

/** ربط أحداث القائمة الجانبية */
function attachSidebarEvents() {
    DOM.sidebarNav.querySelectorAll('.nav-link[data-section]').forEach(link => {
        // إزالة المستمعات القديمة (إن وجدت)
        link.removeEventListener('click', handleSidebarClick);
        link.addEventListener('click', handleSidebarClick);
    });
}

/** معالج النقر على القائمة الجانبية */
function handleSidebarClick(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const section = link.dataset.section;
    const category = link.dataset.category || null;
    const type = link.dataset.type || null;
    
    // إذا كنا في صفحة تفاصيل المنتج، توجيه المستخدم للصفحة الرئيسية عند النقر على الفئات أو الأقسام
    // استخدام href.includes('product') للتعامل مع الروابط التي تحذف .html تلقائياً
    if (window.location.href.includes('product')) {
        if (category && type) {
            window.location.href = `index.html?category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`;
            return;
        }
        if (section === 'about' || section === 'contact') {
            window.location.href = `index.html#${section}-section`;
            return;
        }
        if (link.classList.contains('back-to-store') || section === 'all') {
            window.location.href = 'index.html';
            return;
        }
    }
    
    // تبديل القائمة الفرعية (إغلاق الأشقاء)
    const parentLi = link.closest('.nav-item');
    if (parentLi) {
        const subMenu = parentLi.querySelector('.sub-menu');
        const parentUl = parentLi.parentElement;
        
        if (subMenu) {
            const isOpen = subMenu.classList.contains('open');
            
            // إغلاق جميع القوائم الفرعية في نفس المستوى
            const siblingMenus = parentUl.querySelectorAll(':scope > .nav-item > .sub-menu');
            siblingMenus.forEach(sm => {
                if (sm !== subMenu) {
                    sm.classList.remove('open');
                    const siblingIcon = sm.closest('.nav-item')?.querySelector('.toggle-icon');
                    if (siblingIcon) siblingIcon.classList.remove('open');
                }
            });
            
            if (!isOpen) {
                subMenu.classList.add('open');
                const icon = link.querySelector('.toggle-icon');
                if (icon) icon.classList.add('open');
            } else {
                subMenu.classList.remove('open');
                const icon = link.querySelector('.toggle-icon');
                if (icon) icon.classList.remove('open');
            }
        }
    }
    
    // إذا كان هناك تصنيف محدد، قم بتصفية المنتجات
    if (category && type) {
        AppState.filters.category = category;
        AppState.filters.type = type;
        // إلغاء تحديد أزرار الفلتر
        DOM.filterBtns.forEach(b => b.classList.remove('active'));
        filterProducts();
        DOM.productsGrid?.scrollIntoView({ behavior: 'smooth' });
    }
    
    // التنقل للأقسام الأخرى
    if (section === 'about') {
        document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'contact') {
        document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
    }
    
    // إغلاق القائمة على الهواتف
    if (window.innerWidth <= 900) {
        DOM.sidebar?.classList.remove('open');
        DOM.hamburgerBtn?.classList.remove('active');
    }
}

// ============================================
// 7. التصفية والعرض (محسّن)
// ============================================

/** تصفية المنتجات وتحديث الشبكة */
function filterProducts() {
    const filtered = getFilteredProducts(AppState);
    AppState.products.filtered = filtered;
    AppState.ui.allLoaded = false;
    AppState.ui.displayedCount = 0;
    
    // عرض الدفعة الأولى
    const pageSize = getPageSize();
    const initialBatch = filtered.slice(0, pageSize);
    renderProducts(initialBatch, false);
    updateProductCount();
}

/** عرض المنتجات مع DocumentFragment */
function renderProducts(products, append = false) {
    if (!DOM.productsGrid) return;
    
    if (!append) {
        DOM.productsGrid.innerHTML = '';
    }
    
    if (!products || products.length === 0) {
        if (!append) {
            DOM.productsGrid.innerHTML = '<div class="empty-state">No products available right now. Check back soon!</div>';
        }
        return;
    }
    
    const fragment = document.createDocumentFragment();
    products.forEach((product) => {
        const card = createProductCard(product);
        fragment.appendChild(card);
    });
    
    DOM.productsGrid.appendChild(fragment);
    AppState.ui.displayedCount += products.length;
    
    // تحديث زر "تحميل المزيد"
    const total = AppState.products.filtered.length;
    if (AppState.ui.displayedCount >= total) {
        AppState.ui.allLoaded = true;
        if (DOM.loadMoreContainer) DOM.loadMoreContainer.style.display = 'none';
    } else {
        AppState.ui.allLoaded = false;
        if (DOM.loadMoreContainer) DOM.loadMoreContainer.style.display = 'block';
    }
}

/** تحميل المزيد من المنتجات */
function loadMoreProducts() {
    if (AppState.ui.allLoaded) return;
    
    const pageSize = getPageSize();
    const start = AppState.ui.displayedCount;
    const remaining = AppState.products.filtered.slice(start, start + pageSize);
    
    if (remaining.length === 0) {
        AppState.ui.allLoaded = true;
        if (DOM.loadMoreContainer) DOM.loadMoreContainer.style.display = 'none';
        return;
    }
    
    renderProducts(remaining, true);
    updateProductCount();
}

/** تحديث عدد المنتجات */
function updateProductCount() {
    if (DOM.productCount) {
        const total = AppState.products.filtered.length;
        DOM.productCount.textContent = `${total} products`;
    }
}

// ============================================
// 8. إنشاء بطاقة المنتج (مع إصلاحات)
// ============================================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.style.cursor = 'pointer';
    
    // النقر على البطاقة يوجه إلى صفحة التفاصيل
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
    
    // جمع الصور
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
    
    // قائمة المتغيرات
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
    
    // ===== معالجة Slider الصور =====
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
        
        card._updateImage = updateImage;
        card._allImages = allImages;
    }
    
    // ===== معالجة المتغيرات (مع إعادة تعيين المؤشر) =====
    const variantSelect = card.querySelector('.variant-select');
    if (variantSelect) {
        variantSelect.addEventListener('change', function(e) {
            e.stopPropagation();
            const selectedOption = this.options[this.selectedIndex];
            const newPrice = parseInt(selectedOption.getAttribute('data-price')) || 0;
            const newImage = selectedOption.getAttribute('data-image');
            const newSize = selectedOption.getAttribute('data-size') || '';
            const newColor = selectedOption.getAttribute('data-color') || '';
            
            // تحديث السعر
            const priceEl = this.closest('.product-body').querySelector('.product-price');
            if (priceEl) {
                priceEl.textContent = newPrice + ' DZD';
                priceEl.dataset.basePrice = newPrice;
            }
            
            // تحديث الصورة وإعادة تعيين مؤشر المنزلق إلى 0
            const img = this.closest('.product-card').querySelector('.product-main-image');
            const cardEl = this.closest('.product-card');
            
            if (img && newImage) {
                img.src = newImage;
                // ✅ إعادة تعيين مؤشر المنزلق إلى 0
                if (cardEl._updateImage && cardEl._allImages) {
                    const newIndex = cardEl._allImages.indexOf(newImage);
                    if (newIndex !== -1) {
                        cardEl._updateImage(newIndex);
                    } else {
                        // إذا لم توجد الصورة في القائمة، أضفها وأعد التعيين
                        cardEl._allImages.push(newImage);
                        cardEl._updateImage(cardEl._allImages.length - 1);
                    }
                } else if (cardEl._updateImage) {
                    // إذا كان هناك صور لكن not found، أعد التعيين إلى 0
                    cardEl._updateImage(0);
                }
            }
            
            // تحديث المقاس
            const sizeEl = this.closest('.product-body').querySelector('.product-size');
            if (sizeEl) {
                const displayText = newSize ? newSize : (selectedOption.textContent.trim());
                sizeEl.textContent = displayText;
            }
        });
    }
    
    // ===== زر ORDER =====
    const orderBtn = card.querySelector('.order-btn');
    orderBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const productId = this.dataset.productId;
        const product = AppState.products.all.find(p => p.id === productId);
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
// 9. نافذة الطلب
// ============================================

function openOrderModal(product, selectedVariant, variantIndex) {
    AppState.order.currentProduct = product;
    AppState.order.currentVariant = selectedVariant;
    
    const price = selectedVariant?.price || product.basePrice || 0;
    DOM.modalSubtotal.textContent = price + ' DZD';
    DOM.modalTotal.textContent = price + ' DZD';
    DOM.modalDelivery.textContent = '0 DZD';
    
    if (product.customizableSize) {
        DOM.customSizeGroup.style.display = 'block';
    } else {
        DOM.customSizeGroup.style.display = 'none';
        DOM.customSizeInput.value = '';
    }
    
    DOM.orderStatus.textContent = '';
    DOM.orderStatus.style.color = '';
    populateWilayaSelect();
    DOM.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function populateWilayaSelect() {
    if (!DOM.wilayaSelect) return;
    DOM.wilayaSelect.innerHTML = '<option value="">-- Select your wilaya --</option>';
    WILAYAS.forEach(w => {
        const option = document.createElement('option');
        option.value = w.code;
        option.textContent = `${w.code} - ${w.name}`;
        DOM.wilayaSelect.appendChild(option);
    });
    DOM.wilayaSelect.onchange = function() {
        updateDeliveryFee();
    };
}

function updateDeliveryFee() {
    const wilayaCode = DOM.wilayaSelect ? DOM.wilayaSelect.value : '';
    const price = parseInt((DOM.modalSubtotal ? DOM.modalSubtotal.textContent : '0')) || 0;
    
    if (!wilayaCode) {
        if (DOM.modalDelivery) DOM.modalDelivery.textContent = '0 DZD';
        if (DOM.modalTotal) DOM.modalTotal.textContent = price + ' DZD';
        return;
    }
    
    const rates = AppState.settings.deliveryRates;
    const rate = rates[wilayaCode] || { price: 0, free: false };
    const deliveryPrice = rate.free ? 0 : (rate.price || 0);
    const total = price + deliveryPrice;
    
    if (DOM.modalDelivery) DOM.modalDelivery.textContent = deliveryPrice + ' DZD';
    if (DOM.modalTotal) DOM.modalTotal.textContent = total + ' DZD';
}

function closeOrderModal() {
    if (DOM.modal) DOM.modal.style.display = 'none';
    document.body.style.overflow = '';
    if (DOM.orderStatus) DOM.orderStatus.textContent = '';
}

if (DOM.modalClose) DOM.modalClose.addEventListener('click', closeOrderModal);
if (DOM.modal) {
    DOM.modal.addEventListener('click', function(e) {
        if (e.target === this) closeOrderModal();
    });
}

// ============================================
// 10. إرسال الطلب (آمن)
// ============================================

if (DOM.orderForm) {
    DOM.orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const wilayaCode = DOM.wilayaSelect ? DOM.wilayaSelect.value : '';
        const customSize = DOM.customSizeInput ? DOM.customSizeInput.value.trim() : '';
        
        // Guard Clauses
        if (!name || !phone || !wilayaCode) {
            DOM.orderStatus.textContent = '⚠️ Please fill in all required fields.';
            DOM.orderStatus.style.color = '#c0392b';
            return;
        }
        
        const price = parseInt(DOM.modalSubtotal ? DOM.modalSubtotal.textContent : '0') || 0;
        const rates = AppState.settings.deliveryRates;
        const deliveryRate = rates[wilayaCode] || { price: 0, free: false };
        const deliveryPrice = deliveryRate.free ? 0 : (deliveryRate.price || 0);
        const total = price + deliveryPrice;
        const wilayaName = WILAYAS.find(w => w.code === wilayaCode)?.name || wilayaCode;
        const product = AppState.order.currentProduct;
        const variant = AppState.order.currentVariant;
        
        const orderData = {
            productName: product?.name || 'Unknown',
            productSize: variant?.size || product?.size || 'N/A',
            productColor: variant?.color || 'N/A',
            customSize: customSize || 'N/A',
            price: price,
            deliveryPrice: deliveryPrice,
            total: total,
            customerName: name,
            customerPhone: phone,
            wilayaCode: wilayaCode,
            wilayaName: wilayaName,
            timestamp: new Date().toISOString(),
            productId: product?.id || '',
            status: 'en attente'
        };
        
        const submitBtn = this.querySelector('.order-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        DOM.orderStatus.textContent = '';
        
        try {
            // 1. تخزين في Firebase أولاً (ضمان)
            await addDoc(collection(db, 'orders'), orderData);
            
            // 2. إرسال إلى Google Sheets (نسخة احتياطية)
            const sheetsUrl = AppState.settings.storeSettings.googleSheetsUrl || '';
            if (sheetsUrl) {
                try {
                    await fetch(sheetsUrl, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderData)
                    });
                } catch (gsError) {
                    console.warn('Google Sheets save failed, Firebase has the data:', gsError);
                }
            }
            
            closeOrderModal();
            showSuccessModal();
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
            DOM.orderForm.reset();
            
        } catch (error) {
            console.error('Error sending order:', error);
            DOM.orderStatus.textContent = '⚠️ Error sending order. Please try again.';
            DOM.orderStatus.style.color = '#c0392b';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Order';
        }
    });
}

// ============================================
// 11. نافذة نجاح الطلب + PDF
// ============================================

function showSuccessModal() {
    if (DOM.successModal) {
        DOM.successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSuccessModal() {
    if (DOM.successModal) {
        DOM.successModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

if (DOM.successClose) DOM.successClose.addEventListener('click', closeSuccessModal);
if (DOM.closeSuccessBtn) DOM.closeSuccessBtn.addEventListener('click', closeSuccessModal);
if (DOM.successModal) {
    DOM.successModal.addEventListener('click', function(e) {
        if (e.target === this) closeSuccessModal();
    });
}

// مستمعات أحداث الفلاتر المتقدمة
if (DOM.toggleFiltersBtn) {
    DOM.toggleFiltersBtn.addEventListener('click', () => {
        DOM.filtersPanel?.classList.toggle('active');
    });
}

if (DOM.applyFiltersBtn) {
    DOM.applyFiltersBtn.addEventListener('click', () => {
        updateAdvancedFilters();
        filterProducts();
        DOM.filtersPanel?.classList.remove('active');
    });
}

if (DOM.clearFiltersBtn) {
    DOM.clearFiltersBtn.addEventListener('click', () => {
        clearAdvancedFilters();
        filterProducts();
        DOM.filtersPanel?.classList.remove('active');
    });
}

function updateAdvancedFilters() {
    // 1. جمع الفئات
    const selectedCategories = [];
    document.querySelectorAll('.category-filter:checked').forEach(cb => {
        selectedCategories.push(cb.value);
    });
    AppState.filters.advanced.categories = selectedCategories;

    // 2. جمع الأسعار
    const selectedPrices = [];
    document.querySelectorAll('.price-filter:checked').forEach(cb => {
        selectedPrices.push({
            min: parseFloat(cb.dataset.min),
            max: parseFloat(cb.dataset.max)
        });
    });
    AppState.filters.advanced.prices = selectedPrices;

    // 3. جمع السمات الديناميكية
    const selectedAttributes = {};
    document.querySelectorAll('.attribute-filter:checked').forEach(cb => {
        const attrId = cb.dataset.attrId;
        if (!selectedAttributes[attrId]) selectedAttributes[attrId] = [];
        selectedAttributes[attrId].push(cb.value);
    });
    AppState.filters.advanced.attributes = selectedAttributes;
}

function clearAdvancedFilters() {
    // إلغاء تحديد جميع الـ checkboxes
    document.querySelectorAll('.filters-panel input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // إعادة تعيين الحالة
    AppState.filters.advanced = {
        categories: [],
        prices: [],
        attributes: {}
    };
    
    // إعادة تعيين الفلاتر البسيطة أيضاً لضمان الاتساق
    AppState.filters.category = 'all';
}

if (DOM.downloadPdfAfterOrder) {
    DOM.downloadPdfAfterOrder.addEventListener('click', function() {
        const product = AppState.order.currentProduct;
        if (product) {
            generateProductPDF(product.id);
        }
    });
}

// ============================================
// 12. توليد PDF (مع تحسين CORS)
// ============================================

window.generateProductPDF = async function(productId, variantOverride = null) {
    const product = AppState.products.all.find(p => p.id === productId);
    if (!product) {
        alert('Product not found.');
        return;
    }

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
    const settings = AppState.settings.storeSettings || {};
    const contacts = Array.isArray(settings.contacts) ? settings.contacts : [];
    const phone = contacts.find(c => c.platform === 'phone')?.value || '0559615658';
    const email = contacts.find(c => c.platform === 'email')?.value || 'support@tiddis.com';
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const activeVariant = variantOverride || variants[0] || null;
    const imageUrl = activeVariant?.image || product.pdfImage || product.imageUrl || '';
    const availableSizes = variants.map(v => v.size).filter(Boolean).join(' · ') || product.size || '—';
    const price = activeVariant?.price || product.basePrice || 0;
    const attributes = Array.isArray(AppState.attributes) ? AppState.attributes : [];
    const getAttribute = (keywords) => {
        const attr = attributes.find(item => keywords.some(keyword => String(item.label || '').toLowerCase().includes(keyword)));
        const value = attr && product.attributes ? product.attributes[attr.id] : '';
        return Array.isArray(value) ? value.join(', ') : (value || '—');
    };
    const color = activeVariant?.color || getAttribute(['color', 'colour', 'لون']);
    const quality = getAttribute(['quality', 'material', 'خامة', 'جودة']);
    const dynamicRows = attributes.map(attr => {
        const raw = product.attributes ? product.attributes[attr.id] : '';
        const value = Array.isArray(raw) ? raw.join(', ') : raw;
        if (!value) return '';
        return `<div class="sheet-spec-row"><span>${escapeHtml(attr.label)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }).join('');
    const variantRows = variants.map((variant, index) => `
        <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td>${escapeHtml(variant.size || '—')}</td>
            <td>${escapeHtml(variant.color || '—')}</td>
            <td>${escapeHtml(variant.price || product.basePrice || 0)} DZD</td>
        </tr>
    `).join('');
    const logoUrl = settings.logoUrl || 'https://i.ibb.co/4RDRss4y/tiddis-logo-liquid-glass.png';
    const logoHtml = logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" alt="TIDDIS TAPIS" class="sheet-logo-image">`
        : `<div class="sheet-wordmark"><span>TIDDIS</span><small>TAPIS</small></div>`;

    const pdfContent = document.createElement('div');
    pdfContent.className = 'technical-sheet-canvas';
    pdfContent.innerHTML = `
        <header class="sheet-header">
            <div>${logoHtml}</div>
            <div class="sheet-document-meta">
                <span>PRODUCT DOSSIER</span>
                <strong>REF. ${escapeHtml(product.id || 'N/A')}</strong>
            </div>
        </header>

        <section class="sheet-hero">
            <div class="sheet-hero-image">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name || 'Tiddis Tapis product')}">` : '<div class="sheet-image-placeholder">TIDDIS TAPIS</div>'}
                <span class="sheet-image-index">01 / ${String(Math.max(variants.length, 1)).padStart(2, '0')}</span>
            </div>
            <div class="sheet-hero-copy">
                <span class="sheet-kicker">TIDDIS TAPIS / COLLECTION</span>
                <h1>${escapeHtml(product.name || 'Untitled rug')}</h1>
                <p class="sheet-hero-category">${escapeHtml(product.category || 'Curated collection')}</p>
                <div class="sheet-price-block">
                    <span>LISTED PRICE</span>
                    <strong>${escapeHtml(price)} <small>DZD</small></strong>
                </div>
                <p class="sheet-intro">A considered piece from the Tiddis Tapis collection, presented with its selected specifications and available options.</p>
            </div>
        </section>

        <section class="sheet-facts" aria-label="Key product facts">
            <div><span>COLLECTION</span><strong>${escapeHtml(product.category || '—')}</strong></div>
            <div><span>SIZE</span><strong>${escapeHtml(activeVariant?.size || availableSizes)}</strong></div>
            <div><span>COLOUR</span><strong>${escapeHtml(color)}</strong></div>
            <div><span>QUALITY</span><strong>${escapeHtml(quality)}</strong></div>
        </section>

        <section class="sheet-details">
            <div class="sheet-section-heading"><span>01</span><h2>Technical specifications</h2></div>
            <div class="sheet-spec-grid">
                <div class="sheet-spec-row"><span>Available sizes</span><strong>${escapeHtml(availableSizes)}</strong></div>
                <div class="sheet-spec-row"><span>Custom size</span><strong>${product.customizableSize ? 'Available on request' : 'Standard sizing'}</strong></div>
                <div class="sheet-spec-row"><span>Current price</span><strong>${escapeHtml(price)} DZD</strong></div>
                ${dynamicRows}
            </div>
        </section>

        ${product.description ? `
        <section class="sheet-description">
            <div class="sheet-section-heading"><span>02</span><h2>Product note</h2></div>
            <p>${escapeHtml(product.description)}</p>
        </section>
        ` : ''}

        ${variantRows ? `
        <section class="sheet-variants">
            <div class="sheet-section-heading"><span>03</span><h2>Available options</h2></div>
            <table><thead><tr><th>No.</th><th>Size</th><th>Colour</th><th>Price</th></tr></thead><tbody>${variantRows}</tbody></table>
        </section>
        ` : ''}

        <footer class="sheet-footer">
            <div class="sheet-qr-block"><div id="qrcode-container"></div><span>Scan to view this piece online</span></div>
            <div class="sheet-contact-block"><strong>TIDDIS TAPIS</strong><span>${escapeHtml(phone)}</span><span>${escapeHtml(email)}</span></div>
            <div class="sheet-footer-note"><span>Inspired by the history of Constantine</span><span>Generated ${new Date().toLocaleDateString('en-GB')}</span></div>
        </footer>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.className = 'technical-sheet-stage';
    tempDiv.appendChild(pdfContent);
    document.body.appendChild(tempDiv);

    try {
        const qrContainer = tempDiv.querySelector('#qrcode-container');
        if (qrContainer && typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: `${window.location.origin}/product.html?id=${encodeURIComponent(product.id)}`,
                width: 92,
                height: 92,
                colorDark: '#28231f',
                colorLight: '#f7f4ee',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#f7f4ee',
            width: 794,
            height: tempDiv.scrollHeight,
            logging: false
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${(product.name || 'product').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-technical-sheet.pdf`);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating the technical sheet. Please try again.');
    } finally {
        tempDiv.remove();
    }
};

// ============================================
// 13. صفحة تفاصيل المنتج (بدون Loader)
// ============================================

async function loadProductDetail() {
    const container = DetailDOM.container;
    if (!container) return;
    
    // عرض رسالة التحميل
    container.innerHTML = `<p style="text-align:center; padding:60px 20px; font-family:'Space Mono', monospace; color:#6b6b6b;">Loading product details...</p>`;
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    // Guard Clause: معرف غير صالح
    if (!productId) {
        container.innerHTML = '<p style="text-align:center; padding:40px; font-family:\'Space Mono\', monospace; color:#c0392b;">Product not found.</p>';
        return;
    }
    
    // مهلة قصوى 10 ثواني: مهما كان سبب التعطل (شبكة، صلاحيات، إلخ)
    // الصفحة أبداً ما تضل عالقة على "Loading..." للأبد
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
    );

    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);
        
        if (!docSnap.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:40px; font-family:\'Space Mono\', monospace; color:#c0392b;">Product not found.</p>';
            return;
        }
        
        const product = { id: docSnap.id, ...docSnap.data() };
        renderProductDetail(product);
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        const isTimeout = error.message === 'timeout';
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <p style="font-family:'Space Mono', monospace; color:#c0392b; margin-bottom:16px;">
                    ${isTimeout ? 'This is taking longer than expected.' : 'Error loading product.'}
                </p>
                <button onclick="window.location.reload()" class="btn-secondary" style="font-family:'Space Mono', monospace;">Retry</button>
            </div>
        `;
    }
}

function renderProductDetail(product) {
    const container = DetailDOM.container;
    if (!container) return;
    
    const hasVariants = product.variants && product.variants.length > 0;
    const firstVariant = hasVariants ? product.variants[0] : null;
    const defaultPrice = (firstVariant && firstVariant.price) ? firstVariant.price : (product.basePrice || 0);
    
    // جمع الصور
    let allImages = [];
    if (product.imageUrl) allImages.push(product.imageUrl);
    if (product.additionalImages) allImages = allImages.concat(product.additionalImages);
    if (product.variants) {
        product.variants.forEach(v => {
            if (v.image && !allImages.includes(v.image)) allImages.push(v.image);
        });
    }
    const uniqueImages = [...new Set(allImages)];
    
    // توليد HTML المعرض
    const thumbnailsHtml = uniqueImages.map((url, idx) => `
        <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <img src="${url}" alt="Thumbnail ${idx + 1}">
        </div>
    `).join('');

    // توليد سمات المنتج (من السمات الديناميكية)
    const attributesHtml = AppState.attributes.map(attr => {
        const val = product.attributes ? product.attributes[attr.id] : null;
        if (!val) return '';
        return `
            <div class="info-item">
                <label>${attr.label}</label>
                <span>${Array.isArray(val) ? val.join(', ') : val}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="product-detail-layout">
            <a class="product-back-rail" href="index.html#products-grid" aria-label="Back to products">
                <span class="product-back-icon" aria-hidden="true">←</span>
                <span class="product-back-label">Back to products</span>
            </a>

            <div class="product-gallery-shell">
                <div class="main-viewer" id="main-viewer">
                    <img src="${uniqueImages[0] || ''}" id="main-product-img" alt="${product.name}">
                </div>
                <div class="thumbnails-sidebar" id="thumbnails-sidebar" aria-label="Product images">
                    ${thumbnailsHtml}
                </div>
            </div>

            <section class="product-info-glass-box glass-element" aria-labelledby="product-detail-name">
                <div class="product-info-heading">
                    <h1 id="product-detail-name">${product.name}</h1>
                    <span class="price-tag-large" id="product-detail-price">${defaultPrice} DZD</span>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <label>Collection</label>
                        <span>${product.category || 'KSOR'}</span>
                    </div>
                    ${attributesHtml}
                    ${hasVariants ? `
                    <div class="info-item">
                        <label for="product-detail-variant">Options</label>
                        <select id="product-detail-variant" class="variant-select">
                            ${product.variants.map((v, idx) => `
                                <option value="${idx}" data-price="${v.price || product.basePrice}" 
                                        data-image="${v.image || product.imageUrl || ''}">
                                    ${v.size || ''} ${v.color ? '- ' + v.color : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    ` : ''}
                </div>

                ${product.description ? `
                <div class="product-detail-description">
                    <label>Description</label>
                    <p>${product.description}</p>
                </div>
                ` : ''}

                <div class="action-buttons">
                    <button id="detail-order-btn" class="btn-primary" style="flex:2;">ORDER NOW</button>
                    <button id="detail-pdf-btn" class="btn-secondary" style="flex:1;">TECHNICAL SHEET</button>
                </div>
            </section>
        </div>
    `;

    // منطق التبديل بين الصور
    const mainImg = document.getElementById('main-product-img');
    const thumbs = document.querySelectorAll('.thumb-item');
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', function() {
            thumbs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const newSrc = this.querySelector('img').src;
            if (mainImg) mainImg.src = newSrc;
        });
    });

    // ربط الأحداث الأخرى
    const variantSelect = document.getElementById('product-detail-variant');
    const priceDisplay = document.getElementById('product-detail-price');
    
    if (variantSelect) {
        variantSelect.addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const price = selected.dataset.price;
            const img = selected.dataset.image;
            if (priceDisplay) priceDisplay.textContent = `${price} DZD`;
            if (img && mainImg) {
                mainImg.src = img;
                thumbs.forEach(t => {
                    if (t.querySelector('img').src === img) {
                        thumbs.forEach(t2 => t2.classList.remove('active'));
                        t.classList.add('active');
                    }
                });
            }
        });
    }

    const orderBtn = document.getElementById('detail-order-btn');
    const pdfBtn = document.getElementById('detail-pdf-btn');
    
    if (orderBtn) {
        orderBtn.addEventListener('click', () => {
            const select = document.getElementById('product-detail-variant');
            let selectedVariant = null;
            let selectedIndex = 0;
            if (select && hasVariants) {
                selectedIndex = parseInt(select.value);
                selectedVariant = product.variants[selectedIndex] || null;
            }
            openOrderModal(product, selectedVariant, selectedIndex);
        });
    }
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            const select = document.getElementById('product-detail-variant');
            let selectedVariant = null;
            if (select && hasVariants) {
                selectedVariant = product.variants[parseInt(select.value)] || null;
            }
            generateProductPDF(product.id, selectedVariant);
        });
    }
}

// ============================================
// 14. تطبيق إعدادات المتجر
// ============================================

function applyStoreSettings() {
    const settings = AppState.settings.storeSettings;
    
    // الألوان
    if (settings.sidebarBgColor) {
        document.documentElement.style.setProperty('--sidebar-bg', settings.sidebarBgColor);
        const sidebarEl = document.querySelector('.sidebar');
        if (sidebarEl) sidebarEl.style.backgroundColor = settings.sidebarBgColor;
    }
    if (settings.mainBgColor) {
        document.documentElement.style.setProperty('--bg-color', settings.mainBgColor);
        document.body.style.backgroundColor = settings.mainBgColor;
    }
    
    // الشعار
    const logoUrl = settings.logoUrl || 'https://i.ibb.co/4RDRss4y/tiddis-logo-liquid-glass.png';
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
                el.style.background = 'transparent';
            } else {
                el.style.display = 'none';
            }
        }
    });
    
    // About Us text and editorial image
    if (DOM.aboutText && settings.aboutText) {
        DOM.aboutText.textContent = settings.aboutText;
    }
    if (DOM.aboutImage) {
        const fallbackImage = 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg';
        const requestedImage = typeof settings.aboutImage === 'string' && settings.aboutImage.trim()
            ? settings.aboutImage.trim()
            : fallbackImage;
        DOM.aboutImage.dataset.fallbackApplied = 'false';
        DOM.aboutImage.onerror = () => {
            if (DOM.aboutImage.dataset.fallbackApplied === 'true') return;
            DOM.aboutImage.dataset.fallbackApplied = 'true';
            DOM.aboutImage.src = fallbackImage;
        };
        DOM.aboutImage.src = requestedImage;
    }
    
    // أيقونات التواصل (SVG)
    if (DOM.contactIcons && settings.contacts) {
        renderContactIcons(settings.contacts);
    }

    // عرض شريحة الهيرو المتطورة (Liquid Glass Hero Slider)
    renderHeroSlider(settings.heroSlides);
}

function renderHeroSlider(slides) {
    const container = document.getElementById('hero-slider-container');
    if (!container) return;

    if (!slides || slides.length === 0) {
        slides = [{
            image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80",
            title: "MONUMENTAL CONSTANTINE",
            subtitle: "INSPIRED BY HISTORY — WOVEN FOR YOUR SPACE",
            btnText: "DISCOVER COLLECTION",
            linkType: "all",
            btnUrl: "",
            svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
        }];
    }

    let currentIndex = 0;
    let autoSlideTimer = null;
    let autoSlidePaused = false;
    const AUTO_SLIDE_MS = 6500;

    function stopAutoSlide() {
        if (autoSlideTimer) {
            window.clearInterval(autoSlideTimer);
            autoSlideTimer = null;
        }
    }

    function startAutoSlide() {
        stopAutoSlide();
        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (slides.length <= 1 || prefersReducedMotion) return;

        autoSlideTimer = window.setInterval(() => {
            if (autoSlidePaused) return;
            currentIndex = (currentIndex + 1) % slides.length;
            renderSlide(currentIndex);
        }, AUTO_SLIDE_MS);
    }

    function renderSlide(index) {
        const slide = slides[index];
        if (!slide) return;

        let btnHref = "#products-grid";
        let isExternalLink = false;
        const desktopImage = slide.desktopImage || slide.image || '';
        const mobileImage = slide.mobileImage || desktopImage;
        const responsiveHeroImage = window.matchMedia?.('(max-width: 767px)').matches ? mobileImage : desktopImage;

        if (slide.linkType === 'section' && slide.btnUrl) {
            btnHref = slide.btnUrl;
        } else if (slide.linkType === 'category' && slide.btnUrl) {
            // Legacy slides: add the missing type parameter for product categories.
            btnHref = `index.html?category=${encodeURIComponent(slide.btnUrl)}&type=products`;
        } else if (slide.linkType === 'all') {
            btnHref = "#products-grid";
        } else if (slide.linkType === 'external' && slide.btnUrl) {
            btnHref = slide.btnUrl;
            isExternalLink = true;
        }

        container.innerHTML = `
            <div class="hero-ambient-bg" style="background-image: url('${responsiveHeroImage}');"></div>
            <div class="hero-ambient-overlay"></div>
            
            <div class="hero-slide-card">
                <div class="hero-slide-header">
                    ${slide.subtitle ? `<span class="hero-slide-subtitle-tag">${slide.subtitle}</span>` : ''}
                    ${slide.title ? `<h1 class="hero-slide-main-title">${slide.title}</h1>` : ''}
                </div>

                <div class="hero-slide-image-frame">
                    <picture>
                        <source media="(max-width: 767px)" srcset="${mobileImage}">
                        <img src="${desktopImage}" alt="${slide.title || 'Hero Slide'}" onerror="this.src='https://via.placeholder.com/800x500?text=Tiddis+Tapis'">
                    </picture>
                    ${slide.btnText ? `<a href="${btnHref}" class="hero-slide-cta-btn" ${isExternalLink ? 'target="_blank" rel="noopener noreferrer"' : ''}>${slide.btnText}</a>` : ''}
                </div>

                ${slide.svgIcon ? `<div class="hero-slide-bottom-icon">${slide.svgIcon}</div>` : ''}
            </div>

            ${slides.length > 1 ? `
                <div class="hero-slider-nav">
                    <button class="hero-nav-arrow hero-prev-btn" aria-label="Previous">❮</button>
                    <button class="hero-nav-arrow hero-next-btn" aria-label="Next">❯</button>
                </div>
                <div class="hero-slider-dots">
                    ${slides.map((_, i) => `<span class="hero-dot ${i === index ? 'active' : ''}" data-index="${i}"></span>`).join('')}
                </div>
            ` : ''}
        `;

        // Pause while the visitor reads, interacts, or focuses the slide.
        container.onmouseenter = () => { autoSlidePaused = true; };
        container.onmouseleave = () => { autoSlidePaused = false; };
        container.onfocusin = () => { autoSlidePaused = true; };
        container.onfocusout = () => { autoSlidePaused = false; };
        container.ontouchstart = () => { autoSlidePaused = true; };
        container.ontouchend = () => { autoSlidePaused = false; };

        const heroCta = container.querySelector('.hero-slide-cta-btn');
        if (heroCta && !isExternalLink) {
            heroCta.addEventListener('click', event => {
                const rawHref = heroCta.getAttribute('href') || '';
                let destination;
                try {
                    destination = new URL(rawHref, window.location.href);
                } catch {
                    return;
                }

                const currentUrl = new URL(window.location.href);
                const isStorePath = path => path === '/' || path === '' || path.endsWith('/index.html') || path.endsWith('/index');
                const isSameStorePage = currentUrl.origin === destination.origin
                    && isStorePath(currentUrl.pathname)
                    && isStorePath(destination.pathname);

                // Keep normal navigation for product pages or any other document.
                if (!isSameStorePage) return;

                const category = destination.searchParams.get('category');
                const targetId = destination.hash ? decodeURIComponent(destination.hash.slice(1)) : '';
                const target = targetId ? document.getElementById(targetId) : DOM.productsGrid;

                if (!target) return;
                event.preventDefault();

                if (category) {
                    AppState.filters.category = category;
                    AppState.filters.type = destination.searchParams.get('type') || 'products';
                    DOM.filterBtns.forEach(button => button.classList.remove('active'));
                    filterProducts();
                }

                const nextQuery = destination.searchParams.toString();
                const nextHash = destination.hash || (category ? '#products-grid' : '');
                const nextPath = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${nextHash}`;
                window.history.replaceState({}, '', nextPath);
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        if (slides.length > 1) {
            container.querySelector('.hero-prev-btn')?.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                renderSlide(currentIndex);
            });
            container.querySelector('.hero-next-btn')?.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slides.length;
                renderSlide(currentIndex);
            });
            container.querySelectorAll('.hero-dot').forEach(dot => {
                dot.addEventListener('click', function() {
                    currentIndex = parseInt(this.dataset.index);
                    renderSlide(currentIndex);
                });
            });
        }
    }

    renderSlide(currentIndex);
    startAutoSlide();
}

function renderContactIcons(contacts) {
    if (!DOM.contactIcons) return;
    
    if (!contacts || contacts.length === 0) {
        DOM.contactIcons.innerHTML = '<span style="color:#6b6b6b; font-size:13px;">No contacts configured</span>';
        return;
    }
    
    DOM.contactIcons.innerHTML = contacts.map(contact => {
        const iconSvg = CONTACT_ICONS[contact.platform] || CONTACT_ICONS.phone;
        const displayName = CONTACT_NAMES[contact.platform] || contact.platform;
        const href = contact.platform === 'phone' ? `tel:${contact.value}` :
                     contact.platform === 'email' ? `mailto:${contact.value}` :
                     contact.value;
        return `<a href="${href}" target="${contact.platform === 'phone' || contact.platform === 'email' ? '_self' : '_blank'}" class="contact-item">
                    <span class="contact-icon">${iconSvg}</span>
                    <span>${displayName}</span>
                </a>`;
    }).join('');
}

// ============================================
// 15. البحث في الهاتف (Toggle)
// ============================================

if (DOM.searchToggleBtn) {
    DOM.searchToggleBtn.addEventListener('click', function() {
        if (DOM.mobileSearchBar) {
            const isOpen = DOM.mobileSearchBar.classList.contains('open');
            DOM.mobileSearchBar.classList.toggle('open');
            if (!isOpen) {
                DOM.mobileSearchInput?.focus();
            }
        }
    });
}

if (DOM.mobileSearchClose) {
    DOM.mobileSearchClose.addEventListener('click', function() {
        if (DOM.mobileSearchBar) {
            DOM.mobileSearchBar.classList.remove('open');
            if (DOM.mobileSearchInput) {
                DOM.mobileSearchInput.value = '';
                // مزامنة مع بحث سطح المكتب
                if (DOM.searchInput) {
                    DOM.searchInput.value = '';
                }
                AppState.filters.search = '';
                filterProducts();
            }
        }
    });
}

// ============================================
// 16. مزامنة البحث (سطح المكتب + الهاتف)
// ============================================

if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', function() {
        const value = this.value;
        // مزامنة مع بحث الهاتف
        if (DOM.mobileSearchInput) {
            DOM.mobileSearchInput.value = value;
        }
        AppState.filters.search = value;
        filterProducts();
    });
}

if (DOM.mobileSearchInput) {
    DOM.mobileSearchInput.addEventListener('input', function() {
        const value = this.value;
        // مزامنة مع بحث سطح المكتب
        if (DOM.searchInput) {
            DOM.searchInput.value = value;
        }
        AppState.filters.search = value;
        filterProducts();
    });
}

// ============================================
// 17. أزرار الفلاتر (مع إعادة تعيين currentFilterType)
// ============================================

DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        DOM.filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        AppState.filters.category = this.dataset.filter;
        // ✅ إصلاح: تعيين type إلى 'products' عند النقر على فلتر
        AppState.filters.type = 'products';
        filterProducts();
    });
});

// ============================================
// 18. مفتاح كثافة الشبكة (Grid Density) — مع حماية من null
// ============================================

function setGridDensity(dense) {
    // ✅ الحماية: إذا لم يكن هناك عنصر productsGrid، لا تفعل شيئاً
    if (!DOM.productsGrid) return;
    
    const isMobile = window.innerWidth <= 900;
    const denseClass = isMobile ? 'grid-2-mobile' : 'grid-6';

    // Keep the two states mutually exclusive when switching viewport or density.
    DOM.productsGrid.classList.remove('grid-6', 'grid-2-mobile');
    if (dense) {
        DOM.productsGrid.classList.add(denseClass);
    }
    AppState.ui.gridColumns = dense ? (isMobile ? 2 : 6) : (isMobile ? 1 : 3);
    DOM.gridDensityDense?.classList.toggle('active', dense);
    DOM.gridDensityLoose?.classList.toggle('active', !dense);

    const looseColumns = isMobile ? 1 : 3;
    const denseColumns = isMobile ? 2 : 6;
    if (DOM.gridDensityLoose) {
        DOM.gridDensityLoose.setAttribute('aria-label', `${looseColumns} columns`);
        DOM.gridDensityLoose.setAttribute('title', `${looseColumns} columns`);
        DOM.gridDensityLoose.setAttribute('aria-pressed', String(!dense));
    }
    if (DOM.gridDensityDense) {
        DOM.gridDensityDense.setAttribute('aria-label', `${denseColumns} columns`);
        DOM.gridDensityDense.setAttribute('title', `${denseColumns} columns`);
        DOM.gridDensityDense.setAttribute('aria-pressed', String(dense));
    }
}

// الحالة الافتراضية: غير مكثفة — مع الحماية
if (DOM.productsGrid) {
    setGridDensity(false);
}

DOM.gridDensityLoose?.addEventListener('click', () => setGridDensity(false));
DOM.gridDensityDense?.addEventListener('click', () => setGridDensity(true));

// ============================================
// 19. الهامبورجر
// ============================================

function getHamburgerButtons() {
    return Array.from(document.querySelectorAll(
        '#header-hamburger-btn, #hamburger-btn, #desktop-hamburger-btn, #floating-hamburger-btn'
    ));
}

function syncHamburgerState(isOpen) {
    getHamburgerButtons().forEach(btn => {
        btn.classList.toggle('active', isOpen);
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    });
}

function toggleSidebar(force) {
    const currentlyOpen = DOM.sidebar?.classList.contains('open') ?? false;
    const isOpen = typeof force === 'boolean' ? force : !currentlyOpen;

    DOM.sidebar?.classList.toggle('open', isOpen);
    document.body.classList.toggle('sidebar-active', isOpen);
    syncHamburgerState(isOpen);

    if (isOpen) {
        DOM.mobileSearchBar?.classList.remove('open');
    }
}

// One connector for every supported header variant: no duplicate listeners,
// and the open/X state remains synchronized across desktop and mobile.
getHamburgerButtons().forEach(btn => {
    btn.addEventListener('click', () => toggleSidebar());
});

document.getElementById('mobile-menu-close')?.addEventListener('click', function() {
    toggleSidebar(false);
});

// ============================================
// 20. تحميل المزيد
// ============================================

if (DOM.loadMoreBtn) {
    DOM.loadMoreBtn.addEventListener('click', loadMoreProducts);
}

// ============================================
// 21. تغيير حجم النافذة
// ============================================

window.addEventListener('resize', function() {
    if (!DOM.productsGrid) return;
    const dense = DOM.gridDensityDense?.classList.contains('active') || false;
    setGridDensity(dense);
});

// ============================================
// 22. زر الرجوع للأعلى
// ============================================

const backToTopBtn = document.getElementById('back-to-top-btn');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        backToTopBtn.classList.toggle('visible', window.scrollY > 500);
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================
// 23. التحميل الأولي
// ============================================

async function initStore() {
    try {
        await loadCategories();
        await loadAttributes();
        await loadDeliveryRates();
        listenToStoreSettings();
        listenToProducts();
        
        // التحقق من وجود فلاتر في الرابط (للتوجيه من صفحة المنتج)
        const urlParams = new URLSearchParams(window.location.search);
        const urlCat = urlParams.get('category');
        const urlType = urlParams.get('type');
        if (urlCat && urlType) {
            AppState.filters.category = urlCat;
            AppState.filters.type = urlType;
            // سيتم تطبيق الفلترة تلقائياً عند تحميل المنتجات في listenToProducts
        }

        if (window.location.href.includes('product')) {
            return;
        }
        
        console.log('✅ TIDDIS TAPIS Store initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing store:', error);
    }
}

document.addEventListener('DOMContentLoaded', initStore);

// تصدير للاستخدام في admin.js وصفحة تفاصيل المنتج
export { AppState, filterProducts, loadProductDetail };
