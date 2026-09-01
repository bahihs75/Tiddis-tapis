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
    catalogFilters: [],
    catalogFallback: false,
    catalogExperience: {
        colorSwatches: true,
        desktopHoverPreview: true,
        mobileColorRail: true,
        lifestyleView: false,
        availabilityFilter: false,
        shareableFilters: true
    },
    filters: {
        category: 'all',
        type: 'products',  // 'products' | 'overview'
        search: '',
        advanced: {
            categories: [],
            prices: [],
            attributes: {},
            catalog: {}
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
    aboutHeroImage: document.getElementById('about-hero-image'),
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
    activeFilterSummary: document.getElementById('active-filter-summary'),
    dynamicFilterGroups: document.getElementById('dynamic-filter-groups'),
    optionsCategories: document.getElementById('options-categories'),
    collectionsGrid: document.getElementById('collections-grid'),
    desktopHeader: document.getElementById('desktop-header'),
    mobileHeader: document.querySelector('.mobile-header')
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

function escapeStoreHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

// Technical Sheet and product detail rendering share the same safe text encoder.
const escapeHtml = escapeStoreHtml;

function sanitizeUrl(value, allowedProtocols = ['http:', 'https:']) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw, document.baseURI);
        return allowedProtocols.includes(parsed.protocol) ? parsed.href : '';
    } catch {
        return '';
    }
}

function sanitizeSvgMarkup(value) {
    const raw = String(value ?? '').trim();
    if (!/^<svg[\s>]/i.test(raw)) return '';
    const template = document.createElement('template');
    template.innerHTML = raw;
    const svg = template.content.querySelector('svg');
    if (!svg) return '';
    template.content.querySelectorAll('script, foreignObject').forEach(node => node.remove());
    template.content.querySelectorAll('*').forEach(node => {
        [...node.attributes].forEach(attribute => {
            if (/^on/i.test(attribute.name) || /^(href|src|xlink:href)$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value)) {
                node.removeAttribute(attribute.name);
            }
        });
    });
    return svg.outerHTML;
}

function normalizeCatalogColor(value) {
    const candidate = String(value || '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(candidate) || /^(rgb|hsl)a?\(/i.test(candidate) ? candidate : '#D9D0C4';
}

function getCatalogProductValue(product, key) {
    const values = product?.filterValues || product?.catalogValues || {};
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key];
    const attributes = product?.attributes || {};
    if (Object.prototype.hasOwnProperty.call(attributes, key)) return attributes[key];
    const aliases = {
        color: ['colour', 'colors', 'colours'],
        quality: ['material', 'fabric', 'matiere'],
        size: ['dimensions', 'dimension']
    };
    for (const alias of aliases[key] || []) {
        if (Object.prototype.hasOwnProperty.call(values, alias)) return values[alias];
        if (Object.prototype.hasOwnProperty.call(attributes, alias)) return attributes[alias];
    }
    return null;
}

function asCatalogArray(value) {
    if (Array.isArray(value)) return value.map(item => String(item));
    if (value === null || value === undefined || value === '') return [];
    return [String(value)];
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
function isPublicProduct(product) {
    if (!product || product.available === false || product.status === 'archived' || product.status === 'draft') return false;
    if (product.publishAt) {
        const date = product.publishAt?.toDate ? product.publishAt.toDate() : new Date(product.publishAt);
        if (date instanceof Date && !Number.isNaN(date.getTime()) && date > new Date()) return false;
    }
    return true;
}

function getFilteredProducts(state) {
    const { all } = state.products;
    const { search, advanced } = state.filters;
    if (!all || all.length === 0) return [];

    let result = all.filter(isPublicProduct);

    if (search && search.trim() !== '') {
        const term = search.toLowerCase().trim();
        result = result.filter(product => {
            const searchable = [
                product.name || '',
                product.category || '',
                product.overviewCategory || '',
                ...(product.tags || []),
                ...(product.variants ? product.variants.map(variant => `${variant.size || ''} ${variant.color || ''}`) : [])
            ].join(' ').toLowerCase();
            return searchable.includes(term);
        });
    }

    // OR داخل مجموعة الفئات، مع تضمين الفئات الفرعية، ثم AND مع المجموعات الأخرى.
    if (advanced.categories.length > 0) {
        const allowedCategories = new Set();
        const allCategories = [...(AppState.categories.products || []), ...(AppState.categories.overview || [])];
        advanced.categories.forEach(categoryName => {
            allowedCategories.add(categoryName);
            const category = allCategories.find(item => item.name === categoryName);
            (category?.subcategories || []).forEach(subcategory => allowedCategories.add(subcategory));
        });
        result = result.filter(product => allowedCategories.has(product.category) || allowedCategories.has(product.overviewCategory));
    }

    if (advanced.prices.length > 0) {
        result = result.filter(product => {
            const price = parseFloat(product.basePrice) || 0;
            return advanced.prices.some(range => price >= range.min && price <= range.max);
        });
    }

    // التوافق مع السمات القديمة.
    for (const [attributeId, selectedOptions] of Object.entries(advanced.attributes || {})) {
        if (!selectedOptions.length) continue;
        result = result.filter(product => asCatalogArray(product.attributes?.[attributeId]).some(value => selectedOptions.includes(value)));
    }

    // تعريفات الكتالوج هي مصدر الحقيقة الجديد: OR داخل الفلتر الواحد وAND بين الفلاتر.
    for (const filter of AppState.catalogFilters || []) {
        const key = filter.key || filter.id;
        const selection = advanced.catalog?.[key];
        if (!key || selection === undefined || selection === null || selection === '' || (Array.isArray(selection) && selection.length === 0)) continue;

        if (filter.type === 'range') {
            const min = selection.min === null || selection.min === '' ? null : Number(selection.min);
            const max = selection.max === null || selection.max === '' ? null : Number(selection.max);
            result = result.filter(product => {
                const price = Number(product.basePrice) || 0;
                return (min === null || price >= min) && (max === null || price <= max);
            });
            continue;
        }

        if (filter.type === 'toggle') {
            if (selection !== true) continue;
            result = result.filter(isPublicProduct);
            continue;
        }

        const selectedValues = asCatalogArray(selection);
        result = result.filter(product => {
            const productValues = asCatalogArray(getCatalogProductValue(product, key));
            return productValues.some(value => selectedValues.includes(value));
        });
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
};

const CONTACT_NAMES = {
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
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
        renderCollectionShowcase();
        
        if (AppState.catalogFallback) syncCatalogFallbackFromProducts();

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
                logoUrl: 'tiddis-logo.svg',
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
        renderCollectionShowcase();
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
        querySnapshot.forEach((attributeDoc) => {
            AppState.attributes.push({ id: attributeDoc.id, ...attributeDoc.data() });
        });
        renderFilterUI();
    } catch (error) {
        console.error('Error loading attributes:', error);
    }
}

function buildCatalogFallbackFilters() {
    const definitions = [{
        id: 'price',
        key: 'price',
        label: 'Price Range',
        type: 'range',
        display: 'range',
        order: 30,
        status: 'published',
        options: []
    }];
    const seenKeys = new Set(['price']);
    (AppState.attributes || []).forEach(attribute => {
        const key = String(attribute.id || '').trim();
        if (!key || seenKeys.has(key)) return;
        const label = String(attribute.label || key);
        const isColor = /color|colour|لون|couleur/i.test(`${key} ${label}`);
        definitions.push({
            id: key,
            key,
            label,
            type: isColor ? 'single-select' : 'multi-select',
            display: isColor ? 'swatches' : 'chips',
            order: definitions.length + 30,
            status: 'published',
            options: (Array.isArray(attribute.options) ? attribute.options : []).map(value => ({
                value: String(value),
                label: String(value),
                status: 'published'
            }))
        });
        seenKeys.add(key);
    });
    return definitions;
}

function syncCatalogFallbackFromProducts() {
    if (!AppState.catalogFallback) return;
    const values = new Map();
    (AppState.products.all || []).forEach(product => {
        const productValues = asCatalogArray(getCatalogProductValue(product, 'color'));
        const variants = Array.isArray(product.variants) ? product.variants : [];
        variants.forEach(variant => {
            if (variant.color) productValues.push(variant.color);
        });
        productValues.forEach(value => {
            const clean = String(value || '').trim();
            if (clean && !values.has(clean.toLowerCase())) values.set(clean.toLowerCase(), clean);
        });
    });
    if (!values.size) return;
    let colorFilter = (AppState.catalogFilters || []).find(filter => String(filter.key || filter.id).toLowerCase() === 'color');
    if (!colorFilter) {
        colorFilter = {
            id: 'color',
            key: 'color',
            label: 'Color',
            type: 'single-select',
            display: 'swatches',
            order: 40,
            status: 'published',
            options: []
        };
        AppState.catalogFilters.push(colorFilter);
    }
    const existing = new Set((colorFilter.options || []).map(option => String(option.value || option.label || '').toLowerCase()));
    values.forEach(value => {
        if (!existing.has(value.toLowerCase())) colorFilter.options.push({
            value,
            label: value,
            color: normalizeCatalogColor(value),
            status: 'published'
        });
    });
    renderFilterUI();
}

async function loadCatalogFilters() {
    try {
        const [filtersSnapshot, experienceSnapshot] = await Promise.all([
            getDocs(collection(db, 'catalogFilters')),
            getDoc(doc(db, 'settings', 'catalogExperience'))
        ]);
        AppState.catalogFilters = filtersSnapshot.docs
            .map(filterDoc => ({ id: filterDoc.id, ...filterDoc.data() }))
            .filter(filter => filter.status !== 'archived' && filter.visible !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        AppState.catalogExperience = experienceSnapshot.exists()
            ? { ...AppState.catalogExperience, ...experienceSnapshot.data() }
            : AppState.catalogExperience;
        renderFilterUI();
    } catch (error) {
        // Firestore rules may not have been published yet; legacy filters remain usable.
        console.warn('Catalog filters unavailable; using local catalog fallback until Firestore rules are published.', error);
        AppState.catalogFallback = true;
        AppState.catalogFilters = buildCatalogFallbackFilters();
        syncCatalogFallbackFromProducts();
        renderFilterUI();
    }
}

function getCollectionImage(categoryName) {
    const categoryKey = String(categoryName || '').trim().toLowerCase();
    if (!categoryKey) return '';
    const products = AppState.products.all || [];
    const product = products.find(item => {
        const productCategories = [item.category, item.overviewCategory]
            .filter(Boolean)
            .map(value => String(value).trim().toLowerCase());
        return productCategories.includes(categoryKey);
    }) || products.find(item => String(item.name || '').toLowerCase().includes(categoryKey));
    if (!product) return '';
    return product.imageUrl
        || product.additionalImages?.[0]
        || product.variants?.find(variant => variant?.image)?.image
        || '';
}

function renderCollectionShowcase() {
    const grid = DOM.collectionsGrid;
    if (!grid) return;

    grid.setAttribute('aria-busy', 'false');
    const categories = (AppState.categories.products || [])
        .filter(category => category && category.name)
        .slice(0, 6);

    if (!categories.length) {
        grid.innerHTML = '<p class="collection-empty">Selected collections will appear here as categories are published.</p>';
        return;
    }

    grid.innerHTML = categories.map((category, index) => {
        const name = String(category.name).trim();
        const image = getCollectionImage(name);
        const count = (AppState.products.all || []).filter(product => {
            const values = [product.category, product.overviewCategory]
                .filter(Boolean)
                .map(value => String(value).trim().toLowerCase());
            return values.includes(name.toLowerCase());
        }).length;
        const href = escapeStoreHtml(`/?category=${encodeURIComponent(name)}&type=products#products-grid`);
        const imageMarkup = image
            ? `<img src="${escapeStoreHtml(image)}" alt="${escapeStoreHtml(name)} collection">`
            : '<span class="collection-image-placeholder" aria-hidden="true">TIDDIS</span>';
        return `<a class="collection-tile collection-tile--${index + 1}" href="${href}">
            <span class="collection-image">${imageMarkup}</span>
            <span class="collection-tile-meta">
                <strong>${escapeStoreHtml(name)}</strong>
                <span>${count ? `${count} ${count === 1 ? 'piece' : 'pieces'}` : 'Explore collection'}</span>
            </span>
            <span class="collection-arrow" aria-hidden="true">↗</span>
        </a>`;
    }).join('');
}

function renderFilterUI() {
    const categoryMarkup = (AppState.categories.products || []).map(category => `
        <label><input type="checkbox" class="category-filter" value="${escapeStoreHtml(category.name)}"> <span>${escapeStoreHtml(category.name)}</span></label>
    `).join('');
    if (DOM.optionsCategories) DOM.optionsCategories.innerHTML = categoryMarkup || '<span class="filter-empty">No categories available</span>';

    const priceDefinition = (AppState.catalogFilters || []).find(filter => (filter.key || filter.id) === 'price');
    const priceGroup = document.getElementById('filter-group-price');
    if (priceGroup) {
        if (priceDefinition) {
            priceGroup.hidden = false;
            priceGroup.querySelector('h4').textContent = priceDefinition.label || 'Price Range';
            const options = priceGroup.querySelector('.filter-options');
            if (options) options.innerHTML = `
                <div class="catalog-range-filter">
                    <label>From <input type="number" class="catalog-filter-min" data-catalog-filter-key="price" min="0" inputmode="numeric"></label>
                    <label>To <input type="number" class="catalog-filter-max" data-catalog-filter-key="price" min="0" inputmode="numeric"></label>
                </div>
            `;
        } else {
            priceGroup.hidden = false;
        }
    }

    const controlledFilters = (AppState.catalogFilters || []).filter(filter => (filter.key || filter.id) !== 'price');
    if (DOM.dynamicFilterGroups) {
        const catalogMarkup = controlledFilters.map(filter => {
            const key = String(filter.key || filter.id);
            const type = filter.type || 'multi-select';
            const isSingle = type === 'single-select';
            const isSwatch = filter.display === 'swatches';
            const options = (filter.options || []).filter(option => option.status !== 'archived');
            const optionsMarkup = options.map(option => {
                const value = String(option.value || option.label || '');
                const label = String(option.label || value);
                const image = /^https?:\/\//i.test(String(option.swatchUrl || '')) ? String(option.swatchUrl) : '';
                const swatch = isSwatch ? `<span class="color-swatch-icon" style="--catalog-swatch-color:${normalizeCatalogColor(option.color)};">${image ? `<img src="${escapeStoreHtml(image)}" alt="">` : ''}</span>` : '';
                return `<label class="${isSwatch ? 'color-checkbox-label' : ''}" title="${escapeStoreHtml(label)}">
                    <input type="${isSingle ? 'radio' : 'checkbox'}" class="catalog-filter-option-input" data-catalog-filter-key="${escapeStoreHtml(key)}" value="${escapeStoreHtml(value)}" name="catalog-filter-${escapeStoreHtml(key)}">
                    ${swatch}<span>${escapeStoreHtml(label)}</span>
                </label>`;
            }).join('');
            if (type === 'toggle') {
                return `<div class="filter-group catalog-filter-group" data-catalog-filter-key="${escapeStoreHtml(key)}"><h4>${escapeStoreHtml(filter.label || key)}</h4><div class="filter-options"><label><input type="checkbox" class="catalog-filter-toggle-input" data-catalog-filter-key="${escapeStoreHtml(key)}"> <span>${escapeStoreHtml(filter.description || 'Show available products')}</span></label></div></div>`;
            }
            return `<div class="filter-group catalog-filter-group ${isSwatch ? 'is-swatch-filter' : ''}" data-catalog-filter-key="${escapeStoreHtml(key)}"><h4>${escapeStoreHtml(filter.label || key)}</h4><div class="filter-options ${isSwatch ? 'color-filter-options' : ''}">${optionsMarkup || '<span class="filter-empty">No options available</span>'}</div></div>`;
        }).join('');
        const legacyMarkup = AppState.attributes.map(attribute => {
            const key = attribute.id;
            const label = attribute.label || key;
            const optionsMarkup = (attribute.options || []).map(option => `<label><input type="checkbox" class="attribute-filter" data-attr-id="${escapeStoreHtml(key)}" value="${escapeStoreHtml(option)}"> <span>${escapeStoreHtml(option)}</span></label>`).join('');
            return `<div class="filter-group legacy-filter-group"><h4>${escapeStoreHtml(label)}</h4><div class="filter-options">${optionsMarkup}</div></div>`;
        }).join('');
        DOM.dynamicFilterGroups.innerHTML = catalogMarkup || legacyMarkup;
    }
}

// ============================================
// 6. بناء القائمة الجانبية (محسّن)
// ============================================

let sidebarStructure = null;
let sidebarBuilt = false;

function sidebarSlug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function sidebarNodeName(value) {
    if (value && typeof value === 'object') return String(value.name || value.label || value.value || '').trim();
    return String(value || '').trim();
}

function renderSidebarNode(value, type, index, parentKey) {
    const name = sidebarNodeName(value);
    if (!name) return '';

    const children = value && typeof value === 'object' && Array.isArray(value.subcategories)
        ? value.subcategories.filter(child => sidebarNodeName(child))
        : [];
    const hasChildren = children.length > 0;
    const nodeKey = `${parentKey}-${index}-${sidebarSlug(name)}`;
    const submenuId = `sidebar-submenu-${sidebarSlug(nodeKey)}`;
    const safeName = escapeStoreHtml(name);
    const submenuMarkup = hasChildren ? `
        <ul id="${submenuId}" class="sub-menu" data-parent="${safeName}" aria-hidden="true" hidden>
            ${children.map((child, childIndex) => renderSidebarNode(child, type, childIndex, nodeKey)).join('')}
        </ul>
    ` : '';

    return `
        <li class="nav-item">
            <button type="button" class="nav-link${hasChildren ? ' nav-parent-link' : ''}"
                data-section="${type}" data-category="${safeName}" data-type="${type}"
                ${hasChildren ? `data-has-children="true" aria-controls="${submenuId}" aria-expanded="false"` : ''}>
                <span>${safeName}</span>
                ${hasChildren ? '<span class="toggle-icon" aria-hidden="true">▸</span>' : ''}
            </button>
            ${submenuMarkup}
        </li>
    `;
}

function renderSidebarGroup(label, type, items) {
    if (!Array.isArray(items) || !items.length) return '';
    const safeLabel = escapeStoreHtml(label);
    const submenuId = `sidebar-submenu-${type}-root`;
    return `
        <li class="nav-item nav-group-item">
            <button type="button" class="nav-link nav-parent-link nav-group-toggle"
                data-section="${type}" data-type="${type}" data-menu-trigger="true"
                aria-controls="${submenuId}" aria-expanded="false">
                <span>${safeLabel}</span><span class="toggle-icon" aria-hidden="true">▸</span>
            </button>
            <ul id="${submenuId}" class="sub-menu" data-parent="${type}" aria-hidden="true" hidden>
                ${items.map((item, index) => renderSidebarNode(item, type, index, `${type}-root`)).join('')}
            </ul>
        </li>
    `;
}

function buildSidebarMenu() {
    if (!DOM.sidebarNav) return;

    if (sidebarBuilt && sidebarStructure) {
        DOM.sidebarNav.innerHTML = sidebarStructure;
        attachSidebarEvents();
        return;
    }

    const { products, overview } = AppState.categories;
    const otherHtml = `
        <li class="nav-item">
            <a href="#about-section" class="nav-link nav-direct-link" data-section="about">About Us</a>
        </li>
        <li class="nav-item">
            <a href="#contact-section" class="nav-link nav-direct-link" data-section="contact">Contact</a>
        </li>
    `;

    sidebarStructure = `
        <ul class="sidebar-menu-root" aria-label="Store navigation">
            ${renderSidebarGroup('Overview', 'overview', overview)}
            ${renderSidebarGroup('Products', 'products', products)}
            ${otherHtml}
        </ul>
    `;

    DOM.sidebarNav.innerHTML = sidebarStructure;
    sidebarBuilt = true;
    attachSidebarEvents();
}

/** ربط أحداث القائمة الجانبية */
function attachSidebarEvents() {
    DOM.sidebarNav.querySelectorAll('.nav-link[data-section]').forEach(link => {
        // إزالة المستمعات القديمة (إن وجدت)
        link.removeEventListener('click', handleSidebarClick);
        link.addEventListener('click', handleSidebarClick);
    });
}

/** توحيد روابط المتجر القديمة والجديدة إلى مسار الجذر. */
function normalizeStoreInternalUrl(value, fallback = '/') {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    if (/^index\.html(?:[?#]|$)/i.test(raw)) {
        const suffix = raw.slice('index.html'.length);
        return suffix ? `/${suffix}` : '/';
    }
    return raw;
}

/** فتح أو إغلاق submenu مع إبقاء قائمة الهامبرغر مفتوحة. */
function setSidebarSubmenuOpen(link, isOpen) {
    const submenuId = link.getAttribute('aria-controls');
    const submenu = submenuId ? document.getElementById(submenuId) : null;
    if (!submenu) return false;

    const parentLi = link.closest('.nav-item');
    const parentUl = parentLi?.parentElement;
    parentUl?.querySelectorAll(':scope > .nav-item > .sub-menu.open').forEach(sibling => {
        if (sibling === submenu) return;
        sibling.classList.remove('open');
        sibling.hidden = true;
        sibling.setAttribute('aria-hidden', 'true');
        const siblingLink = sibling.closest('.nav-item')?.querySelector(':scope > .nav-link[aria-controls]');
        siblingLink?.setAttribute('aria-expanded', 'false');
        siblingLink?.classList.remove('is-expanded');
        siblingLink?.querySelector(':scope > .toggle-icon')?.classList.remove('open');
    });

    submenu.classList.toggle('open', isOpen);
    submenu.hidden = !isOpen;
    submenu.setAttribute('aria-hidden', String(!isOpen));
    link.setAttribute('aria-expanded', String(isOpen));
    link.classList.toggle('is-expanded', isOpen);
    link.querySelector(':scope > .toggle-icon')?.classList.toggle('open', isOpen);
    return true;
}

/** معالج النقر على القائمة الجانبية: parent يفتح submenu، وleaf ينفذ الانتقال. */
function handleSidebarClick(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const section = link.dataset.section;
    const category = link.dataset.category || null;
    const type = link.dataset.type || null;
    const hasChildren = link.dataset.hasChildren === 'true' || link.hasAttribute('aria-controls');

    if (hasChildren) {
        const isOpen = link.getAttribute('aria-expanded') === 'true';
        setSidebarSubmenuOpen(link, !isOpen);
        return;
    }

    // في صفحة المنتج، تنقل العناصر النهائية إلى الصفحة الرئيسية مع الفلتر المناسب.
    if (window.location.href.includes('product')) {
        if (category && type) {
            window.location.href = `/?category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`;
            return;
        }
        if (section === 'about' || section === 'contact') {
            window.location.href = `/#${section}-section`;
            return;
        }
        if (link.classList.contains('back-to-store') || section === 'all') {
            window.location.href = '/';
            return;
        }
    }

    if (category && type) {
        AppState.filters.category = category;
        AppState.filters.type = type;
        DOM.filterBtns.forEach(button => button.classList.remove('active'));
        filterProducts();
        DOM.productsGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (section === 'about') {
        document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (section === 'contact') {
        document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // الروابط النهائية فقط تغلق القائمة؛ فتح submenu لا يصل إلى هذه النقطة.
    toggleSidebar(false);
}

// ============================================
// 7. التصفية والعرض (محسّن)
// ============================================

/** تحديث الملخص المرئي للبحث والفلاتر النشطة */
function renderActiveFilterSummary() {
    const summary = DOM.activeFilterSummary;
    if (!summary) return;

    const items = [];
    const { advanced, search } = AppState.filters;
    if (search?.trim()) items.push(`Search: ${search.trim()}`);
    (advanced.categories || []).forEach(value => items.push(`Category: ${value}`));
    (advanced.prices || []).forEach(range => items.push(`Price: ${range.min}–${range.max} DZD`));
    Object.values(advanced.attributes || {}).flat().forEach(value => items.push(String(value)));
    Object.values(advanced.catalog || {}).forEach(selection => {
        if (Array.isArray(selection)) selection.forEach(value => items.push(String(value)));
        else if (selection && typeof selection === 'object') {
            const range = [selection.min, selection.max].filter(value => value !== '' && value !== null && value !== undefined).join('–');
            if (range) items.push(`${range} DZD`);
        } else if (selection === true) items.push('Available');
        else if (selection !== '' && selection !== null && selection !== undefined) items.push(String(selection));
    });

    if (!items.length) {
        summary.hidden = true;
        summary.innerHTML = '';
        return;
    }

    summary.hidden = false;
    summary.innerHTML = `<span class="active-filter-count">${items.length} active ${items.length === 1 ? 'filter' : 'filters'}</span>${items.slice(0, 5).map(item => `<span class="active-filter-chip">${escapeStoreHtml(item)}</span>`).join('')}${items.length > 5 ? `<span class="active-filter-more">+${items.length - 5} more</span>` : ''}`;
}

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
    renderActiveFilterSummary();
}

/** عرض المنتجات مع DocumentFragment */
function renderProducts(products, append = false) {
    if (!DOM.productsGrid) return;
    DOM.productsGrid.setAttribute('aria-busy', 'false');
    
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

function getProductColorEntries(product) {
    const colorFilter = (AppState.catalogFilters || []).find(filter => {
        const key = String(filter.key || filter.id || '').toLowerCase();
        return key === 'color' || key === 'colour' || key.includes('color') || key.includes('colour');
    });
    const catalogValues = asCatalogArray(getCatalogProductValue(product, colorFilter?.key || 'color'));
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const entries = [];
    const seen = new Set();
    const optionList = colorFilter?.options || [];
    const colorMap = {
        black: '#171717', white: '#F5F2EC', beige: '#CDBFAE', brown: '#80624A',
        grey: '#9D9D9A', gray: '#9D9D9A', red: '#8E3137', blue: '#536E83',
        green: '#65745D', gold: '#B69A62', burgundy: '#6B3940', cream: '#E8DEC9'
    };
    const addEntry = (value, variant = null) => {
        const label = String(value || variant?.color || '').trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const option = optionList.find(item => String(item.value || item.label || '').toLowerCase() === key);
        const image = variant?.image || product.additionalImages?.[entries.length] || product.imageUrl || '';
        entries.push({
            label: option?.label || label,
            value: option?.value || label,
            color: normalizeCatalogColor(option?.color || colorMap[key] || '#D9D0C4'),
            swatchUrl: /^https?:\/\//i.test(String(option?.swatchUrl || '')) ? String(option.swatchUrl) : '',
            image,
            variantIndex: variant ? variants.indexOf(variant) : -1
        });
    };
    catalogValues.forEach(value => addEntry(value, variants.find(variant => String(variant.color || '').toLowerCase() === String(value).toLowerCase())));
    if (!entries.length) variants.forEach(variant => addEntry(variant.color, variant));
    return entries;
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.style.cursor = 'pointer';
    
    // النقر على البطاقة يوجه إلى صفحة التفاصيل
    card.addEventListener('click', function(e) {
        if (e.target.closest('.order-btn') || e.target.closest('.variant-select') || e.target.closest('.image-nav-btn') || e.target.closest('.product-color-swatch')) {
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
    const colorEntries = getProductColorEntries(product);
    const colorRailHtml = colorEntries.length ? `
        <div class="product-color-rail" aria-label="Available colors">
            ${colorEntries.map(entry => `<button type="button" class="product-color-swatch" data-color-value="${escapeStoreHtml(entry.value)}" data-image="${escapeStoreHtml(entry.image)}" data-variant-index="${entry.variantIndex}" aria-label="${escapeStoreHtml(entry.label)}" title="${escapeStoreHtml(entry.label)}" style="--swatch-color:${entry.color};">${entry.swatchUrl ? `<img src="${escapeStoreHtml(entry.swatchUrl)}" alt="">` : ''}</button>`).join('')}
        </div>
    ` : '';
    
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
            <img src="${escapeStoreHtml(defaultImage)}" alt="${escapeStoreHtml(product.name || 'Tiddis Tapis rug')}" class="product-main-image" draggable="false">
            ${hasMultipleImages ? `
                <button class="image-nav-btn prev" data-dir="-1">‹</button>
                <button class="image-nav-btn next" data-dir="1">›</button>
                <div class="image-dots">
                    ${allImages.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            ` : ''}
        </div>
        ${colorRailHtml}
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
    
    // تبديل الصورة عند المرور على سطح المكتب، مع احترام إعداد المشرف وتقليل الحركة.
    // نستخدم صورة اللون التالية أولاً، ثم الصورة الإضافية التالية كخطة بديلة.
    const hoverPreviewImage = colorEntries[1]?.image || allImages[1] || '';
    if (AppState.catalogExperience.desktopHoverPreview && hoverPreviewImage && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const image = card.querySelector('.product-main-image');
        const originalImage = image?.src || '';
        card.addEventListener('mouseenter', () => {
            if (image) image.src = hoverPreviewImage;
        });
        card.addEventListener('mouseleave', () => {
            if (image && originalImage) image.src = originalImage;
        });
    }

    card.querySelectorAll('.product-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', event => {
            event.stopPropagation();
            const image = card.querySelector('.product-main-image');
            const imageUrl = swatch.dataset.image;
            if (image && imageUrl) image.src = imageUrl;
            card.querySelectorAll('.product-color-swatch').forEach(item => item.classList.toggle('is-selected', item === swatch));
            const variantIndex = Number(swatch.dataset.variantIndex);
            if (variantSelect && Number.isInteger(variantIndex) && variantIndex >= 0) {
                variantSelect.value = String(variantIndex);
                variantSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

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
            status: 'en attente',
            utm: getTiddisUtm()
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
function setFiltersPanelOpen(isOpen) {
    const open = Boolean(isOpen);
    DOM.filtersPanel?.classList.toggle('active', open);
    DOM.toggleFiltersBtn?.setAttribute('aria-expanded', String(open));
}

if (DOM.toggleFiltersBtn) {
    DOM.toggleFiltersBtn.addEventListener('click', () => {
        setFiltersPanelOpen(!DOM.filtersPanel?.classList.contains('active'));
    });
}

if (DOM.applyFiltersBtn) {
    DOM.applyFiltersBtn.addEventListener('click', () => {
        updateAdvancedFilters();
        filterProducts();
        setFiltersPanelOpen(false);
    });
}

if (DOM.clearFiltersBtn) {
    DOM.clearFiltersBtn.addEventListener('click', () => {
        clearAdvancedFilters();
        filterProducts();
        setFiltersPanelOpen(false);
    });
}

function updateAdvancedFilters() {
    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked')).map(input => input.value);
    const selectedPrices = Array.from(document.querySelectorAll('.price-filter:checked')).map(input => ({
        min: parseFloat(input.dataset.min),
        max: parseFloat(input.dataset.max)
    }));
    const selectedAttributes = {};
    document.querySelectorAll('.attribute-filter:checked').forEach(input => {
        const attributeId = input.dataset.attrId;
        if (!selectedAttributes[attributeId]) selectedAttributes[attributeId] = [];
        selectedAttributes[attributeId].push(input.value);
    });

    const catalog = {};
    (AppState.catalogFilters || []).forEach(filter => {
        const key = filter.key || filter.id;
        if (!key) return;
        if (filter.type === 'range') {
            const minInput = document.querySelector(`.catalog-filter-min[data-catalog-filter-key="${CSS.escape(key)}"]`);
            const maxInput = document.querySelector(`.catalog-filter-max[data-catalog-filter-key="${CSS.escape(key)}"]`);
            const min = minInput?.value === '' || minInput?.value === undefined ? null : Number(minInput.value);
            const max = maxInput?.value === '' || maxInput?.value === undefined ? null : Number(maxInput.value);
            if (min !== null || max !== null) catalog[key] = { min, max };
            return;
        }
        if (filter.type === 'toggle') {
            const toggle = document.querySelector(`.catalog-filter-toggle-input[data-catalog-filter-key="${CSS.escape(key)}"]`);
            if (toggle?.checked) catalog[key] = true;
            return;
        }
        const selected = Array.from(document.querySelectorAll(`.catalog-filter-option-input[data-catalog-filter-key="${CSS.escape(key)}"]:checked`)).map(input => input.value);
        if (selected.length) catalog[key] = filter.type === 'single-select' ? selected[0] : selected;
    });

    AppState.filters.advanced = {
        categories: selectedCategories,
        prices: selectedPrices,
        attributes: selectedAttributes,
        catalog
    };
}

function clearAdvancedFilters() {
    document.querySelectorAll('.filters-panel input[type="checkbox"], .filters-panel input[type="radio"]').forEach(input => input.checked = false);
    document.querySelectorAll('.filters-panel input.catalog-filter-min, .filters-panel input.catalog-filter-max').forEach(input => input.value = '');
    AppState.filters.advanced = { categories: [], prices: [], attributes: {}, catalog: {} };
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

const DEFAULT_TRANSPARENT_LOGO = 'tiddis-logo.svg';
const LEGACY_LOGO_URLS = new Set([
    'https://i.ibb.co/4RDRss4y/tiddis-logo-liquid-glass.png',
    'https://i.ibb.co/Mkjk88PT/tiddis-logo.png'
]);

function getDisplayLogoUrl(value) {
    const candidate = typeof value === 'string' ? value.trim() : '';
    const normalized = candidate.split('?')[0].replace(/\/$/, '');
    const isLegacyLogo = LEGACY_LOGO_URLS.has(normalized)
        || normalized.endsWith('/tiddis-logo-liquid-glass.png')
        || normalized.endsWith('/tiddis-logo.png');
    return !candidate || isLegacyLogo ? DEFAULT_TRANSPARENT_LOGO : candidate;
}

window.generateProductPDF = async function(productId, variantOverride = null) {
    let product = AppState.products.all.find(p => String(p.id) === String(productId))
        || (AppState.order.currentProduct && String(AppState.order.currentProduct.id) === String(productId) ? AppState.order.currentProduct : null);
    if (!product && productId) {
        try {
            const productSnap = await getDoc(doc(db, 'products', String(productId)));
            if (productSnap.exists()) product = { id: productSnap.id, ...productSnap.data() };
        } catch (error) {
            console.warn('Technical Sheet could not reload the product:', error);
        }
    }
    if (!product) {
        alert('Product not found.');
        return;
    }

    const catalogLoads = [];
    if (!AppState.categories.products.length) catalogLoads.push(loadCategories());
    if (!AppState.attributes.length) catalogLoads.push(loadAttributes());
    if (!AppState.catalogFilters.length) catalogLoads.push(loadCatalogFilters());
    if (catalogLoads.length) await Promise.allSettled(catalogLoads);

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
    const settings = AppState.settings.storeSettings || {};
    const contacts = Array.isArray(settings.contacts) ? settings.contacts : [];
    const phone = contacts.find(c => c.platform === 'phone')?.value || '0559615658';
    const email = contacts.find(c => c.platform === 'email')?.value || 'support@tiddis.com';
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const activeVariant = variantOverride || variants[0] || null;
    const imageUrl = product.pdfImage || activeVariant?.image || product.imageUrl || '';
    const price = activeVariant?.price || product.basePrice || 0;
    const attributes = Array.isArray(AppState.attributes) ? AppState.attributes : [];
    const catalogFilters = Array.isArray(AppState.catalogFilters) ? AppState.catalogFilters : [];
    const normalizeSheetValue = (value) => {
        if (Array.isArray(value)) return value.map(normalizeSheetValue).filter(Boolean).join(', ');
        if (value && typeof value === 'object') {
            if (Object.prototype.hasOwnProperty.call(value, 'min') || Object.prototype.hasOwnProperty.call(value, 'max')) {
                const min = value.min === null || value.min === undefined || value.min === '' ? '' : String(value.min);
                const max = value.max === null || value.max === undefined || value.max === '' ? '' : String(value.max);
                if (min && max) return `${min} – ${max}`;
                return min || max;
            }
            if (Object.prototype.hasOwnProperty.call(value, 'label')) return normalizeSheetValue(value.label);
            if (Object.prototype.hasOwnProperty.call(value, 'value')) return normalizeSheetValue(value.value);
            return Object.values(value).map(normalizeSheetValue).filter(Boolean).join(', ');
        }
        return String(value ?? '').trim();
    };
    const getProductValue = (keys) => {
        const candidates = [...new Set((Array.isArray(keys) ? keys : [keys]).filter(Boolean).map(key => String(key).trim()))];
        const sources = [product.filterValues, product.catalogValues, product.attributes, product];
        for (const source of sources) {
            if (!source || typeof source !== 'object') continue;
            for (const key of candidates) {
                if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
                const value = normalizeSheetValue(source[key]);
                if (value) return value;
            }
        }
        return '';
    };
    const getLegacyAttribute = (keywords) => {
        const attr = attributes.find(item => keywords.some(keyword => `${item.id || ''} ${item.label || ''}`.toLowerCase().includes(keyword)));
        return attr ? getProductValue([attr.id]) : '';
    };
    const getCatalogValue = (keywords, aliases = []) => {
        const tokens = [...keywords, ...aliases].map(token => String(token).toLowerCase());
        const filter = catalogFilters.find(item => {
            const key = String(item.key || item.id || '').toLowerCase();
            const label = String(item.label || '').toLowerCase();
            return tokens.some(token => key === token || label.includes(token));
        });
        return getProductValue([filter?.key, filter?.id, ...keywords, ...aliases]);
    };
    const variantSizes = variants.map(v => normalizeSheetValue(v.size)).filter(Boolean);
    const availableSizes = [...new Set(variantSizes)].join(' · ')
        || getCatalogValue(['size'], ['sizes', 'dimension', 'dimensions', 'مقاس', 'حجم'])
        || getProductValue(['size', 'sizes', 'dimension', 'dimensions'])
        || '—';
    const color = normalizeSheetValue(activeVariant?.color)
        || getCatalogValue(['color'], ['colour', 'colors', 'colours', 'لون', 'couleur'])
        || getLegacyAttribute(['color', 'colour', 'لون', 'couleur'])
        || '—';
    const quality = getCatalogValue(['quality'], ['material', 'fabric', 'matiere', 'خامة', 'جودة'])
        || getLegacyAttribute(['quality', 'material', 'خامة', 'جودة', 'matiere'])
        || '—';
    const rawCategory = product.category && typeof product.category === 'object'
        ? (product.category.id || product.category.name || '')
        : (product.category || product.collection || product.categoryName || '');
    const categoryText = normalizeSheetValue(rawCategory);
    const categoryList = Array.isArray(AppState.categories?.products) ? AppState.categories.products : [];
    const matchingCategory = categoryList.find(category => String(category.id || '').toLowerCase() === categoryText.toLowerCase() || String(category.name || '').toLowerCase() === categoryText.toLowerCase());
    const parentCategory = !matchingCategory && categoryText
        ? categoryList.find(category => Array.isArray(category.subcategories) && category.subcategories.some(subcategory => {
            const value = subcategory && typeof subcategory === 'object' ? (subcategory.id || subcategory.name) : subcategory;
            return String(value || '').toLowerCase() === categoryText.toLowerCase();
        }))
        : null;
    const collectionLabel = matchingCategory?.name
        || (parentCategory ? `${parentCategory.name} / ${categoryText}` : categoryText)
        || '—';
    const dynamicRows = [];
    const dynamicRowLabels = new Set();
    catalogFilters.forEach(filter => {
        const key = filter.key || filter.id;
        const value = getProductValue([key, filter.id]);
        const label = String(filter.label || key || '').trim();
        if (!label || !value || filter.type === 'toggle' || String(key).toLowerCase() === 'availability') return;
        const signature = label.toLowerCase();
        if (dynamicRowLabels.has(signature)) return;
        dynamicRowLabels.add(signature);
        dynamicRows.push(`<div class="sheet-spec-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`);
    });
    attributes.forEach(attr => {
        const value = getProductValue([attr.id]);
        const label = String(attr.label || attr.id || '').trim();
        if (!label || !value) return;
        const signature = label.toLowerCase();
        if (dynamicRowLabels.has(signature)) return;
        dynamicRowLabels.add(signature);
        dynamicRows.push(`<div class="sheet-spec-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`);
    });
    const dynamicRowsHtml = dynamicRows.join('');
    const variantRows = variants.map((variant, index) => `
        <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td>${escapeHtml(variant.size || '—')}</td>
            <td>${escapeHtml(variant.color || '—')}</td>
            <td>${escapeHtml(variant.price || product.basePrice || 0)} DZD</td>
        </tr>
    `).join('');
    const logoUrl = getDisplayLogoUrl(settings.logoUrl);
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
                <p class="sheet-hero-category">${escapeHtml(collectionLabel === '—' ? 'Curated collection' : collectionLabel)}</p>
                <div class="sheet-price-block">
                    <span>LISTED PRICE</span>
                    <strong>${escapeHtml(price)} <small>DZD</small></strong>
                </div>
                <p class="sheet-intro">A considered piece from the Tiddis Tapis collection, presented with its selected specifications and available options.</p>
            </div>
        </section>

        <section class="sheet-facts" aria-label="Key product facts">
            <div><span>COLLECTION</span><strong>${escapeHtml(collectionLabel)}</strong></div>
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
                ${dynamicRowsHtml}
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
        // صفحة التفاصيل تحمل المنتج مباشرة ولا تملأ قائمة المتجر العامة؛
        // نحفظه كمنتج حالي حتى تعمل Technical Sheet من هذه الصفحة أيضاً.
        AppState.order.currentProduct = product;
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
    const colorEntries = getProductColorEntries(product);
    const colorRailHtml = AppState.catalogExperience.mobileColorRail && colorEntries.length ? `
        <div class="product-detail-color-rail" aria-label="Available colors">
            <span class="product-detail-color-label">Available colors</span>
            <div class="product-detail-color-swatches">
                ${colorEntries.map(entry => `<button type="button" class="product-color-swatch detail-color-swatch" data-color-value="${escapeStoreHtml(entry.value)}" data-image="${escapeStoreHtml(entry.image)}" data-variant-index="${entry.variantIndex}" aria-label="${escapeStoreHtml(entry.label)}" title="${escapeStoreHtml(entry.label)}" style="--swatch-color:${entry.color};">${entry.swatchUrl ? `<img src="${escapeStoreHtml(entry.swatchUrl)}" alt="">` : ''}</button>`).join('')}
            </div>
        </div>
    ` : '';
    const catalogDetailsHtml = (AppState.catalogFilters || []).map(filter => {
        const key = filter.key || filter.id;
        const value = getCatalogProductValue(product, key);
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return '';
        const label = filter.label || key;
        const displayValue = filter.type === 'range' && typeof value === 'object'
            ? [value.min, value.max].filter(item => item !== null && item !== '').join(' – ')
            : asCatalogArray(value).join(', ');
        return `<div class="info-item"><label>${escapeStoreHtml(label)}</label><span>${escapeStoreHtml(displayValue)}</span></div>`;
    }).join('');
    
    // توليد HTML المعرض
    const thumbnailsHtml = uniqueImages.map((url, idx) => `
        <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <img src="${escapeHtml(url)}" alt="Thumbnail ${idx + 1}">
        </div>
    `).join('');

    // توليد سمات المنتج (من السمات الديناميكية)
    const attributesHtml = AppState.attributes.map(attr => {
        const val = product.attributes ? product.attributes[attr.id] : null;
        if (!val) return '';
        return `
                                <div class="info-item">
                        <label>${escapeHtml(attr.label)}</label>
                        <span>${escapeHtml(Array.isArray(val) ? val.join(', ') : val)}</span>
                    </div>

        `;
    }).join('');

    container.innerHTML = `
        <div class="product-detail-layout">
            <a class="product-back-rail" href="/#products-grid" aria-label="Back to products">
                <span class="product-back-icon" aria-hidden="true">←</span>
                <span class="product-back-label">Back to products</span>
            </a>

            <div class="product-gallery-shell">
                <div class="main-viewer" id="main-viewer">
                    <img src="${escapeHtml(uniqueImages[0] || '')}" id="main-product-img" alt="${escapeHtml(product.name || 'Tiddis Tapis product')}">
                </div>
                <div class="thumbnails-sidebar" id="thumbnails-sidebar" aria-label="Product images">
                    ${thumbnailsHtml}
                </div>
                ${colorRailHtml}
            </div>

            <section class="product-info-glass-box glass-element" aria-labelledby="product-detail-name">
                <div class="product-info-heading">
                    <h1 id="product-detail-name">${escapeHtml(product.name || 'Untitled rug')}</h1>
                    <span class="price-tag-large" id="product-detail-price">${defaultPrice} DZD</span>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <label>Collection</label>
                        <span>${escapeHtml(product.category || 'KSOR')}</span>
                    </div>
                    ${attributesHtml}
                    ${catalogDetailsHtml}
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
                    <p>${escapeHtml(product.description)}</p>
                </div>
                ` : ''}

                <div class="action-buttons">
                    <button id="detail-order-btn" class="btn-primary" style="flex:2;">ORDER NOW</button>
                    <button id="detail-pdf-btn" class="btn-secondary" style="flex:1;">TECHNICAL SHEET</button>
                </div>
                <p class="product-order-helper">Submit your details to request this rug. Our team will confirm availability and delivery.</p>
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

    const detailSwatches = document.querySelectorAll('.detail-color-swatch');
    detailSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            detailSwatches.forEach(item => item.classList.toggle('is-selected', item === swatch));
            const imageUrl = swatch.dataset.image;
            const variantIndex = Number(swatch.dataset.variantIndex);
            if (imageUrl && mainImg) mainImg.src = imageUrl;
            if (variantSelect && Number.isInteger(variantIndex) && variantIndex >= 0) {
                variantSelect.value = String(variantIndex);
                variantSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
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
    
    // الشعار الشفاف: مصدر واحد في الهيدر، بدون نسخة مقصوصة داخل القائمة.
    const logoUrl = getDisplayLogoUrl(settings.logoUrl);
    const logoTargets = [
        {
            image: document.getElementById('header-logo'),
            wrapper: document.querySelector('.desktop-header .header-brand')
        },
        {
            image: document.getElementById('mobile-logo'),
            wrapper: document.querySelector('.mobile-header .mobile-brand')
        }
    ];

    logoTargets.forEach(({ image, wrapper }) => {
        if (!image) return;
        image.style.background = 'transparent';
        if (!logoUrl) {
            image.removeAttribute('src');
            image.style.display = 'none';
            wrapper?.classList.remove('has-image');
            return;
        }

        image.dataset.logoFallbackApplied = 'false';
        wrapper?.classList.remove('logo-fallback');
        image.onload = () => {
            image.style.display = 'block';
            wrapper?.classList.add('has-image');
            wrapper?.classList.remove('logo-fallback');
        };
        image.onerror = () => {
            if (image.dataset.logoFallbackApplied !== 'true' && image.src !== new URL(DEFAULT_TRANSPARENT_LOGO, document.baseURI).href) {
                image.dataset.logoFallbackApplied = 'true';
                image.src = DEFAULT_TRANSPARENT_LOGO;
                return;
            }
            // إذا تعذر الشعار المحلي أيضاً، استخدم الاسم النصي الثابت داخل نفس الـlockup.
            image.style.display = 'none';
            wrapper?.classList.remove('has-image');
            wrapper?.classList.add('logo-fallback');
        };
        image.src = logoUrl;
    });

    const clippedSidebarLogo = document.getElementById('sidebar-logo');
    if (clippedSidebarLogo) {
        clippedSidebarLogo.removeAttribute('src');
        clippedSidebarLogo.style.display = 'none';
    }

    const legacyProductLogo = document.getElementById('product-page-logo');
    if (legacyProductLogo) {
        legacyProductLogo.removeAttribute('src');
        legacyProductLogo.style.display = 'none';
    }
    
    // About Us editorial story: the large image and the small story image are independent.
    const fallbackAboutHeroImage = 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1800&q=85';
    const fallbackAboutStoryImage = 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg';
    if (DOM.aboutText && settings.aboutText) {
        DOM.aboutText.textContent = settings.aboutText;
    }

    const applyImageWithFallback = (imageElement, requestedValue, fallbackValue) => {
        if (!imageElement) return;
        const requestedImage = typeof requestedValue === 'string' && requestedValue.trim()
            ? requestedValue.trim()
            : fallbackValue;
        imageElement.dataset.fallbackApplied = 'false';
        imageElement.onerror = () => {
            if (imageElement.dataset.fallbackApplied === 'true') return;
            imageElement.dataset.fallbackApplied = 'true';
            imageElement.src = fallbackValue;
        };
        imageElement.src = requestedImage;
    };

    applyImageWithFallback(DOM.aboutHeroImage, settings.aboutHeroImage, fallbackAboutHeroImage);
    applyImageWithFallback(DOM.aboutImage, settings.aboutImage, fallbackAboutStoryImage);
    
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
        const desktopImage = sanitizeUrl(slide.desktopImage || slide.image || '');
        const mobileImage = sanitizeUrl(slide.mobileImage || '') || desktopImage;
        const responsiveHeroImage = window.matchMedia?.('(max-width: 767px)').matches ? mobileImage : desktopImage;
        const slideTitle = escapeStoreHtml(slide.title || '');
        const slideSubtitle = escapeStoreHtml(slide.subtitle || '');
        const slideBtnText = escapeStoreHtml(slide.btnText || '');
        const slideIcon = sanitizeSvgMarkup(slide.svgIcon);

        if (slide.linkType === 'section' && slide.btnUrl) {
            btnHref = normalizeStoreInternalUrl(slide.btnUrl, '#products-grid');
        } else if (slide.linkType === 'category' && slide.btnUrl) {
            // Legacy slides: add the missing type parameter for product categories.
            btnHref = `/?category=${encodeURIComponent(slide.btnUrl)}&type=products`;
        } else if (slide.linkType === 'all') {
            btnHref = "#products-grid";
        } else if (slide.linkType === 'external' && slide.btnUrl) {
            btnHref = sanitizeUrl(slide.btnUrl) || '#products-grid';
            isExternalLink = Boolean(sanitizeUrl(slide.btnUrl));
        }

        container.innerHTML = `
            <div class="hero-ambient-bg" style="background-image: url('${escapeStoreHtml(responsiveHeroImage)}');"></div>
            <div class="hero-ambient-overlay"></div>
            
            <div class="hero-slide-card">
                <div class="hero-slide-header">
                    ${slideSubtitle ? `<span class="hero-slide-subtitle-tag">${slideSubtitle}</span>` : ''}
                    ${slideTitle ? `<h1 class="hero-slide-main-title">${slideTitle}</h1>` : ''}
                </div>

                <div class="hero-slide-image-frame">
                    <picture>
                        <source media="(max-width: 767px)" srcset="${escapeStoreHtml(mobileImage)}">
                        <img src="${escapeStoreHtml(desktopImage)}" alt="${slideTitle || 'Hero Slide'}" onerror="this.src='https://via.placeholder.com/800x500?text=Tiddis+Tapis'">
                    </picture>
                    ${slideBtnText ? `<a href="${escapeStoreHtml(btnHref)}" class="hero-slide-cta-btn" ${isExternalLink ? 'target="_blank" rel="noopener noreferrer"' : ''}>${slideBtnText}</a>` : ''}
                </div>

                ${slideIcon ? `<div class="hero-slide-bottom-icon">${slideIcon}</div>` : ''}
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
    
    const validContacts = (Array.isArray(contacts) ? contacts : []).filter(contact => {
        const platform = String(contact?.platform || '').toLowerCase();
        const value = String(contact?.value || '').trim();
        return value && ['phone', 'email', 'whatsapp', 'instagram', 'facebook', 'tiktok'].includes(platform);
    });

    if (!validContacts.length) {
        DOM.contactIcons.innerHTML = '<span class="contact-empty">Concierge contact details will appear here soon.</span>';
        return;
    }
    
    DOM.contactIcons.innerHTML = validContacts.map(contact => {
        const platform = String(contact.platform).toLowerCase();
        const iconSvg = CONTACT_ICONS[platform] || CONTACT_ICONS.phone;
        const displayName = CONTACT_NAMES[platform] || platform;
        const rawValue = String(contact.value).trim();
        const href = platform === 'phone' ? `tel:${rawValue.replace(/[^\d+]/g, '')}` :
                     platform === 'email' ? `mailto:${rawValue}` :
                     (rawValue.startsWith('https://') || rawValue.startsWith('http://')) ? rawValue : '';
        if (!href) return '';
        const external = platform !== 'phone' && platform !== 'email';
        return `<a href="${escapeStoreHtml(href)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''} class="contact-item">
                    <span class="contact-icon">${iconSvg}</span>
                    <span>${escapeStoreHtml(displayName)}</span>
                </a>`;
    }).filter(Boolean).join('');
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
// 22. حالة الهيدر عند التمرير
// ============================================

function setupHeaderScrollState() {
    const headers = [DOM.desktopHeader, DOM.mobileHeader].filter(Boolean);
    if (!headers.length) return;

    let frameRequested = false;
    const sync = () => {
        frameRequested = false;
        const isScrolled = window.scrollY > 24;
        headers.forEach(header => header.classList.toggle('is-scrolled', isScrolled));
    };

    const onScroll = () => {
        if (frameRequested) return;
        frameRequested = true;
        window.requestAnimationFrame(sync);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    sync();
}

setupHeaderScrollState();

// ============================================
// 23. زر الرجوع للأعلى
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
// 24. التحميل الأولي
// ============================================

async function initStore() {
    try {
        // ابدأ المستمعين فوراً حتى يظهر الهيرو والمنتجات بمجرد وصول أول snapshot.
        // أما البيانات المساعدة فتُحمّل بالتوازي ولا تؤخر أول رسم للصفحة.
        listenToStoreSettings();
        listenToProducts();

        const preloadTasks = [
            loadCategories(),
            loadAttributes(),
            loadCatalogFilters(),
            loadDeliveryRates()
        ];
        const preloadResults = await Promise.allSettled(preloadTasks);
        preloadResults.forEach(result => {
            if (result.status === 'rejected') console.warn('Optional store data failed to preload:', result.reason);
        });

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



// ============================================
// 24. Consent-controlled marketing, UTM and PWA
// ============================================
const TIDDIS_CONSENT_KEY = 'tiddis-consent-v1';
const TIDDIS_UTM_KEY = 'tiddis-utm-v1';
let optionalTrackingLoaded = false;

function captureTiddisUtm() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const values = {};
    keys.forEach(key => { const value = params.get(key); if (value) values[key] = value.slice(0, 160); });
    if (Object.keys(values).length) localStorage.setItem(TIDDIS_UTM_KEY, JSON.stringify({ ...values, capturedAt: new Date().toISOString() }));
}

function getTiddisUtm() {
    try {
        const stored = JSON.parse(localStorage.getItem(TIDDIS_UTM_KEY) || '{}');
        if (!stored || typeof stored !== 'object') return {};
        const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'capturedAt'];
        return Object.fromEntries(allowed.filter(key => stored[key]).map(key => [key, String(stored[key]).slice(0, 160)]));
    } catch { return {}; }
}

function loadOptionalTracking() {
    if (optionalTrackingLoaded) return;
    const settings = AppState.settings.storeSettings || {};
    const marketing = settings.marketing || {};
    const metaId = String(marketing.metaPixelId || '').trim();
    const tiktokId = String(marketing.tiktokPixelId || '').trim();
    if (!metaId && !tiktokId) return;
    optionalTrackingLoaded = true;
    if (metaId && !document.getElementById('tiddis-meta-pixel')) {
        window.fbq = window.fbq || function() { window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments); };
        window.fbq.queue = window.fbq.queue || [];
        window.fbq('init', metaId); window.fbq('track', 'PageView');
        const script = document.createElement('script'); script.id = 'tiddis-meta-pixel'; script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    if (tiktokId && !document.getElementById('tiddis-tiktok-pixel')) {
        window.ttq = window.ttq || []; window.ttq.push(['init', tiktokId]); window.ttq.push(['page']);
        const script = document.createElement('script'); script.id = 'tiddis-tiktok-pixel'; script.async = true; script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(tiktokId) + '&lib=ttq'; document.head.appendChild(script);
    }
}

function setupTiddisConsentAndTracking() {
    const existing = localStorage.getItem(TIDDIS_CONSENT_KEY);
    const settings = AppState.settings.storeSettings || {};
    const marketing = settings.marketing || {};
    const banner = document.createElement('section');
    banner.id = 'cookie-consent-banner'; banner.className = 'cookie-consent-banner'; banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `<div class="cookie-consent-copy"><strong class="cookie-consent-title">${escapeMarkup(marketing.consentTitle || 'Your privacy matters')}</strong><p>${escapeMarkup(marketing.consentText || 'Essential storage keeps the store working. Optional analytics and marketing tools load only when you agree.')}</p><a href="${escapeAttribute(marketing.privacyPolicyUrl || 'privacy.html')}">Privacy policy</a></div><div class="cookie-consent-actions"><button type="button" data-consent="reject" class="btn-ghost">Essential only</button><button type="button" data-consent="accept" class="btn-primary">Accept</button></div>`;
    if (!existing) { document.body.appendChild(banner); }
    banner.addEventListener('click', event => {
        const choice = event.target.closest?.('[data-consent]')?.dataset.consent;
        if (!choice) return;
        if (choice === 'accept') {
            localStorage.setItem(TIDDIS_CONSENT_KEY, JSON.stringify({ choice: 'accept', savedAt: new Date().toISOString() }));
            captureTiddisUtm();
            loadOptionalTracking();
        } else {
            localStorage.removeItem(TIDDIS_CONSENT_KEY);
        }
        banner.remove();
    });
    if (existing) {
        try {
            if (JSON.parse(existing).choice === 'accept') {
                captureTiddisUtm();
                loadOptionalTracking();
            }
        } catch { localStorage.removeItem(TIDDIS_CONSENT_KEY); }
    }
}

function escapeMarkup(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function escapeAttribute(value) { return escapeMarkup(value).replace(/javascript:/gi, ''); }
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('PWA service worker unavailable:', error)));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupTiddisConsentAndTracking); else setupTiddisConsentAndTracking();

// تصدير للاستخدام في admin.js وصفحة تفاصيل المنتج
export { AppState, filterProducts, loadProductDetail };
