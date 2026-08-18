// ============================================
// TIDDIS TAPIS — Admin Panel Logic (محدث بالكامل)
// لوحة التحكم الإدارية مع تحسينات خوارزمية:
// - إدارة حالة مركزية
// - عمليات CRUD محسّنة
// - حماية كاملة للحذف (على مستوى العميل)
// ============================================

import { db, auth } from './firebase-config.js';
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
    serverTimestamp,
    writeBatch,
    increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// 1. المتغيرات العامة
// ============================================
let allCategories = [];
let allCategoriesOverview = [];
let allProducts = [];
let allOrders = [];
let allAttributes = [];
let allCatalogFilters = [];
let catalogExperience = {
    colorSwatches: true,
    desktopHoverPreview: true,
    mobileColorRail: true,
    lifestyleView: false,
    availabilityFilter: false,
    shareableFilters: true
};
let deliveryRates = {};
let storeSettings = {};
let editingProductId = null;
let editingCategoryId = null;
let editingSubCategoryParentId = null;
let editingSubCategoryOldName = null;
let editingOverviewCategoryId = null;
let editingOverviewSubCategoryParentId = null;
let editingOverviewSubCategoryOldName = null;
let imageApiSources = [];
let imageApiEditingIndex = -1;
let imageApiEditing = false;
let imageLibrary = [];

// ============================================
// 2. عناصر DOM الرئيسية
// ============================================
const sections = {
    dashboard: document.getElementById('section-dashboard'),
    insights: document.getElementById('section-insights'),
    activity: document.getElementById('section-activity'),
    'data-tools': document.getElementById('section-data-tools'),
    hero: document.getElementById('section-hero'),
    categories: document.getElementById('section-categories'),
    overview: document.getElementById('section-overview'),
    products: document.getElementById('section-products'),
    delivery: document.getElementById('section-delivery'),
    orders: document.getElementById('section-orders'),
    attributes: document.getElementById('section-attributes'),
    catalog: document.getElementById('section-catalog'),
    library: document.getElementById('section-library'),
    settings: document.getElementById('section-settings')
};

const adminNavLinks = document.querySelectorAll('#admin-sidebar .nav-link');

// عناصر إدارة الفئات (Products)
const categoriesList = document.getElementById('categories-list');
const parentCategorySelect = document.getElementById('parent-category-select');
const newCategoryName = document.getElementById('new-category-name');
const newSubcategoryName = document.getElementById('new-subcategory-name');
const addCategoryBtn = document.getElementById('add-category-btn');
const addSubcategoryBtn = document.getElementById('add-subcategory-btn');

// عناصر إدارة فئات Overview
const overviewCategoriesList = document.getElementById('overview-categories-list');
const overviewParentCategorySelect = document.getElementById('overview-parent-category-select');
const newOverviewCategoryName = document.getElementById('new-overview-category-name');
const newOverviewSubcategoryName = document.getElementById('new-overview-subcategory-name');
const addOverviewCategoryBtn = document.getElementById('add-overview-category-btn');
const addOverviewSubcategoryBtn = document.getElementById('add-overview-subcategory-btn');

// عناصر إدارة المنتجات
const productForm = document.getElementById('product-form');
const productFormWrapper = document.getElementById('product-form-wrapper');
const toggleProductFormBtn = document.getElementById('toggle-product-form-btn');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productCategorySelect = document.getElementById('product-category');
const productOverviewCategorySelect = document.getElementById('product-overview-category');
const productBasePriceInput = document.getElementById('product-base-price');
const productMainImageInput = document.getElementById('product-main-image');
const mainImagePreview = document.getElementById('main-image-preview');
const productCustomizableCheckbox = document.getElementById('product-customizable-size');
const additionalImagesContainer = document.getElementById('additional-images-container');
const addImageRowBtn = document.getElementById('add-image-row-btn');
const additionalImagesPreview = document.getElementById('additional-images-preview');
const pdfImageSelector = document.getElementById('pdf-image-selector');
const variantsContainer = document.getElementById('variants-container');
const addVariantBtn = document.getElementById('add-variant-btn');
const productsList = document.getElementById('products-list');
const statProducts = document.getElementById('stat-products');
const statCategories = document.getElementById('stat-categories');
const statCategoriesOverview = document.getElementById('stat-categories-overview');
const statOrders = document.getElementById('stat-orders');
const recentOrdersList = document.getElementById('recent-orders-list');

// عناصر إدارة السمات (Attributes)
const attributesList = document.getElementById('attributes-list');
const newAttributeLabel = document.getElementById('new-attribute-label');
const addAttributeBtn = document.getElementById('add-attribute-btn');

// عناصر تجربة الكتالوج والفلاتر القابلة للإدارة
const catalogFiltersList = document.getElementById('catalog-filters-list');
const catalogFilterSummary = document.getElementById('catalog-filter-summary');
const catalogFilterKeyInput = document.getElementById('catalog-filter-key');
const catalogFilterLabelInput = document.getElementById('catalog-filter-label');
const catalogFilterTypeSelect = document.getElementById('catalog-filter-type');
const catalogFilterDisplaySelect = document.getElementById('catalog-filter-display');
const addCatalogFilterBtn = document.getElementById('add-catalog-filter-btn');
const saveCatalogExperienceBtn = document.getElementById('save-catalog-experience-btn');
const catalogProductFields = document.getElementById('catalog-product-fields');

// عناصر إدارة التوصيل
const deliveryTableBody = document.getElementById('delivery-table-body');
const bulkDeliveryPrice = document.getElementById('bulk-delivery-price');
const applyBulkPriceBtn = document.getElementById('apply-bulk-price-btn');
const setAllFreeBtn = document.getElementById('set-all-free-btn');
const resetAllDeliveryBtn = document.getElementById('reset-all-delivery-btn');

// عناصر إدارة الطلبات
const ordersList = document.getElementById('orders-list');

// عناصر مكتبة الصور
const refreshImageLibraryBtn = document.getElementById('refresh-image-library-btn');
const toggleLibraryUploadBtn = document.getElementById('toggle-library-upload-btn');
const libraryUploadPanel = document.getElementById('library-upload-panel');
const libraryImageFile = document.getElementById('library-image-file');
const libraryImageName = document.getElementById('library-image-name');
const libraryImageUsage = document.getElementById('library-image-usage');
const libraryImageSection = document.getElementById('library-image-section');
const libraryImageTags = document.getElementById('library-image-tags');
const uploadLibraryImageBtn = document.getElementById('upload-library-image-btn');
const cancelLibraryUploadBtn = document.getElementById('cancel-library-upload-btn');
const libraryUploadStatus = document.getElementById('library-upload-status');
const librarySearchInput = document.getElementById('library-search-input');
const libraryProviderFilter = document.getElementById('library-provider-filter');
const libraryUsageFilter = document.getElementById('library-usage-filter');
const librarySummary = document.getElementById('library-summary');
const imageLibraryList = document.getElementById('image-library-list');

// عناصر الإعدادات
const googleSheetsUrlInput = document.getElementById('google-sheets-url');
const testSheetsBtn = document.getElementById('test-sheets-btn');
const imageProviderSelect = document.getElementById('image-provider-select');
const imageApiKeyInput = document.getElementById('image-api-key');
const imageApiSourcesList = document.getElementById('image-api-sources-list');
const imageApiEditor = document.getElementById('image-api-editor');
const imageApiSourceIndex = document.getElementById('image-api-source-index');
const addImageApiBtn = document.getElementById('add-image-api-btn');
const editImageApiBtn = document.getElementById('edit-image-api-btn');
const saveImageApiBtn = document.getElementById('save-image-api-btn');
const cancelImageApiBtn = document.getElementById('cancel-image-api-btn');
const PRIVATE_IMAGE_SOURCES_KEY = 'tiddis-tapis:private-image-sources:v1';
const PRIVATE_IMAGE_SOURCES_COLLECTION = 'privateSettings';
const PRIVATE_IMAGE_SOURCES_DOCUMENT = 'imageApiSources';
const DEFAULT_TRANSPARENT_LOGO = 'tiddis-logo.svg';
const LEGACY_LOGO_URLS = new Set([
    'https://i.ibb.co/4RDRss4y/tiddis-logo-liquid-glass.png',
    'https://i.ibb.co/Mkjk88PT/tiddis-logo.png'
]);
const getAdminLogoUrl = value => {
    const candidate = typeof value === 'string' ? value.trim() : '';
    return !candidate || LEGACY_LOGO_URLS.has(candidate) ? DEFAULT_TRANSPARENT_LOGO : candidate;
};
const aboutUsTextarea = document.getElementById('about-us-text');
const aboutImageUrlInput = document.getElementById('about-image-url');
const saveAboutBtn = document.getElementById('save-about-btn');
const logoUrlInput = document.getElementById('logo-url');
const saveLogoBtn = document.getElementById('save-logo-btn');
const sidebarBgColorInput = document.getElementById('sidebar-bg-color');
const mainBgColorInput = document.getElementById('main-bg-color');
const saveColorsBtn = document.getElementById('save-colors-btn');
const colorConfirmModal = document.getElementById('color-confirm-modal');
const colorConfirmYes = document.getElementById('color-confirm-yes');
const colorConfirmNo = document.getElementById('color-confirm-no');
const colorConfirmClose = document.getElementById('color-confirm-close');
const contactIconsList = document.getElementById('contact-icons-list');
const newContactPlatform = document.getElementById('new-contact-platform');
const newContactValue = document.getElementById('new-contact-value');
const addContactBtn = document.getElementById('add-contact-btn');

// هامبورجر للأدمن
const adminHamburger = document.getElementById('admin-hamburger');
const adminSidebar = document.getElementById('admin-sidebar');
const adminMessageModal = document.getElementById('admin-message-modal');
const adminMessageTitle = document.getElementById('admin-message-title');
const adminMessageText = document.getElementById('admin-message-text');
const adminMessageMark = document.getElementById('admin-message-mark');
const adminMessageClose = document.getElementById('admin-message-close');
const adminMessageOk = document.getElementById('admin-message-ok');
let adminMessageTimer = null;

function closeAdminMessage() {
    if (!adminMessageModal) return;
    adminMessageModal.hidden = true;
    adminMessageModal.setAttribute('aria-hidden', 'true');
    if (adminMessageTimer) clearTimeout(adminMessageTimer);
}

function showAdminMessage(message, type = 'success') {
    if (!adminMessageModal) {
        console[type === 'error' ? 'error' : 'log'](message);
        return;
    }
    const isError = type === 'error';
    adminMessageModal.hidden = false;
    adminMessageModal.setAttribute('aria-hidden', 'false');
    adminMessageModal.classList.toggle('is-error', isError);
    if (adminMessageTitle) adminMessageTitle.textContent = isError ? 'Operation needs attention' : 'Operation completed';
    if (adminMessageText) adminMessageText.textContent = message;
    if (adminMessageMark) adminMessageMark.textContent = isError ? '!' : '✓';
    if (adminMessageOk) adminMessageOk.focus({ preventScroll: true });
    if (adminMessageTimer) clearTimeout(adminMessageTimer);
    adminMessageTimer = setTimeout(closeAdminMessage, isError ? 7000 : 4200);
}

adminMessageClose?.addEventListener('click', closeAdminMessage);
adminMessageOk?.addEventListener('click', closeAdminMessage);
adminMessageModal?.addEventListener('click', (event) => {
    if (event.target === adminMessageModal) closeAdminMessage();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && adminMessageModal && !adminMessageModal.hidden) closeAdminMessage();
});

function setAdminSidebarOpen(isOpen) {
    if (!adminSidebar) return;
    const open = Boolean(isOpen);
    adminSidebar.classList.toggle('open', open);
    adminHamburger?.classList.toggle('active', open);
    adminHamburger?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('admin-sidebar-open', open);
}

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
// 4. التنقل بين الأقسام
// ============================================

function activateAdminSection(section, clickedLink = null) {
    const navLinks = document.querySelectorAll('#admin-sidebar .nav-link');
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === section));
    if (clickedLink) clickedLink.classList.add('active');

    Object.keys(sections).forEach(key => {
        const sectionElement = sections[key] || document.getElementById(`section-${key}`);
        if (sectionElement) sectionElement.classList.remove('active');
    });

    const targetSection = sections[section] || document.getElementById(`section-${section}`);
    if (targetSection) targetSection.classList.add('active');

    if (window.innerWidth <= 900) setAdminSidebarOpen(false);

    if (section === 'dashboard') loadDashboardData();
    if (section === 'categories') loadCategories();
    if (section === 'overview') loadOverviewCategories();
    if (section === 'products') loadProducts();
    if (section === 'delivery') loadDeliveryRates();
    if (section === 'orders') loadOrders();
    if (section === 'catalog') loadCatalogExperience();
    if (section === 'library') loadImageLibrary();
    if (section === 'settings') loadSettings();
}

document.addEventListener('click', function(e) {
    const link = e.target.closest?.('#admin-sidebar .nav-link');
    if (!link) return;
    e.preventDefault();
    activateAdminSection(link.dataset.section, link);
});

if (adminHamburger && adminSidebar) {
    adminHamburger.addEventListener('click', () => {
        setAdminSidebarOpen(!adminSidebar.classList.contains('open'));
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) setAdminSidebarOpen(false);
    });

    setAdminSidebarOpen(false);
}

// ============================================
// 5. إدارة الفئات (Products)
// ============================================

async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        allCategories = [];
        querySnapshot.forEach((doc) => {
            allCategories.push({ id: doc.id, ...doc.data() });
        });
        renderCategories();
        populateCategorySelects();
        updateCategoryStats();
        refreshHeroDestinationOptions?.();
    } catch (error) {
        console.error('Error loading categories:', error);
        if (categoriesList) {
            categoriesList.innerHTML = '<p style="color:#c0392b;">Error loading categories.</p>';
        }
    }
}

function renderCategories() {
    if (!categoriesList) return;
    
    const productCategories = allCategories.filter(c => c.type !== 'overview');
    
    if (!productCategories || productCategories.length === 0) {
        categoriesList.innerHTML = '<p>No product categories found. Add your first category above.</p>';
        return;
    }

    let html = '<div class="sortable-categories" id="sortable-products">';
    productCategories.forEach((cat, index) => {
        html += `
            <div class="category-item" data-id="${cat.id}" data-order="${index}">
                <span><strong>${cat.name}</strong></span>
                <div class="cat-actions">
                    <button type="button" class="admin-action-btn edit-btn edit-cat-btn" data-id="${cat.id}" data-name="${cat.name}">Edit</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-cat-btn" data-id="${cat.id}" ${cat.subcategories && cat.subcategories.length > 0 ? 'disabled' : ''}>
                        Delete${cat.subcategories && cat.subcategories.length > 0 ? ' · has sub-categories' : ''}
                    </button>
                </div>
            </div>
        `;
        
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach((sub, subIndex) => {
                const hasProducts = allProducts.some(p => p.category === sub);
                html += `
                    <div class="subcategory-item" style="padding-left:32px;" data-cat-id="${cat.id}" data-sub="${sub}" data-order="${subIndex}">
                        <span>↳ ${sub}</span>
                        <div class="cat-actions">
                            <button type="button" class="admin-action-btn edit-btn edit-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}">Edit</button>
                            <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}" ${hasProducts ? 'disabled' : ''}>
                                Delete${hasProducts ? ' · has products' : ''}
                            </button>
                        </div>
                    </div>
                `;
            });
        }
    });
    html += '</div>';
    html += `<button id="save-products-order-btn" class="btn-primary" style="margin-top:16px;">Save Order</button>`;
    categoriesList.innerHTML = html;

    categoriesList.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => editCategory(btn.dataset.id, btn.dataset.name));
    });
    categoriesList.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });
    categoriesList.querySelectorAll('.edit-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => editSubCategory(btn.dataset.catId, btn.dataset.sub));
    });
    categoriesList.querySelectorAll('.delete-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSubCategory(btn.dataset.catId, btn.dataset.sub));
    });

    const saveOrderBtn = document.getElementById('save-products-order-btn');
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', () => saveCategoriesOrder('products'));
    }

    if (typeof Sortable !== 'undefined') {
        const sortableContainer = document.getElementById('sortable-products');
        if (sortableContainer) {
            new Sortable(sortableContainer, {
                animation: 150,
                handle: '.category-item',
                onEnd: function() {
                    const items = sortableContainer.querySelectorAll('.category-item');
                    items.forEach((item, index) => {
                        item.dataset.order = index;
                    });
                }
            });
        }
    }
}

function populateCategorySelects() {
    const productCategories = allCategories.filter(c => c.type !== 'overview');
    
    if (productCategorySelect) {
        productCategorySelect.innerHTML = '<option value="">Select sub-category</option>';
        productCategories.forEach(cat => {
            if (cat.subcategories) {
                cat.subcategories.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = `${cat.name} → ${sub}`;
                    productCategorySelect.appendChild(option);
                });
            }
        });
    }

    if (parentCategorySelect) {
        parentCategorySelect.innerHTML = '<option value="">Select parent category</option>';
        productCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            parentCategorySelect.appendChild(option);
        });
    }

    populateOverviewCategorySelects();
}

function populateOverviewCategorySelects() {
    const overviewCategories = allCategories.filter(c => c.type === 'overview');
    
    if (productOverviewCategorySelect) {
        productOverviewCategorySelect.innerHTML = '<option value="">Select overview category</option>';
        overviewCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            productOverviewCategorySelect.appendChild(option);
        });
    }

    if (overviewParentCategorySelect) {
        overviewParentCategorySelect.innerHTML = '<option value="">Select parent category</option>';
        overviewCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            overviewParentCategorySelect.appendChild(option);
        });
    }
}

// إضافة فئة رئيسية (Products)
addCategoryBtn?.addEventListener('click', async function() {
    const name = newCategoryName?.value.trim();
    if (!name) {
        showAdminMessage('Please enter a category name.');
        return;
    }

    try {
        await addDoc(collection(db, 'categories'), {
            name: name,
            subcategories: [],
            type: 'products',
            order: allCategories.filter(c => c.type !== 'overview').length
        });
        if (newCategoryName) newCategoryName.value = '';
        await loadCategories();
        showAdminMessage(`Category "${name}" added successfully!`);
    } catch (error) {
        console.error('Error adding category:', error);
        showAdminMessage('Error adding category.');
    }
});

async function editCategory(categoryId, currentName) {
    const newName = prompt(`Edit category name (current: "${currentName}"):`, currentName);
    if (!newName || newName === currentName) return;

    try {
        await updateDoc(doc(db, 'categories', categoryId), { name: newName });
        await loadCategories();
        showAdminMessage('Category updated successfully!');
    } catch (error) {
        console.error('Error editing category:', error);
        showAdminMessage('Error editing category.');
    }
}

async function deleteCategory(categoryId) {
    const cat = allCategories.find(c => c.id === categoryId);
    if (!cat) return;
    if (cat.subcategories && cat.subcategories.length > 0) {
        showAdminMessage('Cannot delete a category that has sub-categories. Please delete all sub-categories first.');
        return;
    }
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        await loadCategories();
        showAdminMessage('Category deleted successfully.');
    } catch (error) {
        console.error('Error deleting category:', error);
        showAdminMessage('Error deleting category.');
    }
}

// إضافة فئة فرعية (Products)
addSubcategoryBtn?.addEventListener('click', async function() {
    const parentId = parentCategorySelect?.value;
    const name = newSubcategoryName?.value.trim();

    if (!parentId || !name) {
        showAdminMessage('Please select a parent category and enter a sub-category name.');
        return;
    }

    try {
        const catRef = doc(db, 'categories', parentId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            if (subcategories.includes(name)) {
                showAdminMessage('This sub-category already exists.');
                return;
            }
            subcategories.push(name);
            await updateDoc(catRef, { subcategories: subcategories });
            if (newSubcategoryName) newSubcategoryName.value = '';
            await loadCategories();
            showAdminMessage(`Sub-category "${name}" added successfully!`);
        }
    } catch (error) {
        console.error('Error adding sub-category:', error);
        showAdminMessage('Error adding sub-category.');
    }
});

async function editSubCategory(categoryId, subName) {
    const newName = prompt(`Edit sub-category name (current: "${subName}"):`, subName);
    if (!newName || newName === subName) return;

    try {
        const catRef = doc(db, 'categories', categoryId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            const index = subcategories.indexOf(subName);
            if (index === -1) {
                showAdminMessage('Sub-category not found.');
                return;
            }
            subcategories[index] = newName;
            await updateDoc(catRef, { subcategories: subcategories });
            
            const productsQuery = query(collection(db, 'products'), where('category', '==', subName));
            const productsSnapshot = await getDocs(productsQuery);
            const batch = writeBatch(db);
            productsSnapshot.forEach((docSnap) => {
                batch.update(docSnap.ref, { category: newName });
            });
            await batch.commit();
            
            await loadCategories();
            await loadProducts();
            showAdminMessage('Sub-category updated successfully!');
        }
    } catch (error) {
        console.error('Error editing sub-category:', error);
        showAdminMessage('Error editing sub-category.');
    }
}

async function deleteSubCategory(categoryId, subName) {
    // ✅ حماية: التحقق من وجود منتجات في هذه الفئة الفرعية
    const hasProducts = allProducts.some(p => p.category === subName);
    if (hasProducts) {
        showAdminMessage('Cannot delete a sub-category that has products. Please delete or move all products first.');
        return;
    }
    if (!confirm(`Are you sure you want to delete sub-category "${subName}"?`)) return;

    try {
        const catRef = doc(db, 'categories', categoryId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            const updated = subcategories.filter(s => s !== subName);
            await updateDoc(catRef, { subcategories: updated });
            await loadCategories();
            showAdminMessage(`Sub-category "${subName}" deleted successfully.`);
        }
    } catch (error) {
        console.error('Error deleting sub-category:', error);
        showAdminMessage('Error deleting sub-category.');
    }
}

async function saveCategoriesOrder(type) {
    try {
        const categoryItems = document.querySelectorAll(`#sortable-${type} .category-item`);
        const orderData = [];
        categoryItems.forEach((item, index) => {
            orderData.push({
                id: item.dataset.id,
                order: index
            });
        });

        const batch = writeBatch(db);
        for (const item of orderData) {
            const ref = doc(db, 'categories', item.id);
            batch.update(ref, { order: item.order });
        }
        await batch.commit();
        showAdminMessage('Category order saved successfully!');
    } catch (error) {
        console.error('Error saving category order:', error);
        showAdminMessage('Error saving category order.');
    }
}

// ============================================
// 6. إدارة فئات Overview
// ============================================

async function loadOverviewCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        allCategoriesOverview = [];
        querySnapshot.forEach((doc) => {
            const cat = { id: doc.id, ...doc.data() };
            if (cat.type === 'overview') {
                allCategoriesOverview.push(cat);
            }
        });
        renderOverviewCategories();
        populateOverviewCategorySelects();
        updateCategoryStats();
        refreshHeroDestinationOptions?.();
    } catch (error) {
        console.error('Error loading overview categories:', error);
        if (overviewCategoriesList) {
            overviewCategoriesList.innerHTML = '<p style="color:#c0392b;">Error loading overview categories.</p>';
        }
    }
}

function renderOverviewCategories() {
    if (!overviewCategoriesList) return;
    
    if (!allCategoriesOverview || allCategoriesOverview.length === 0) {
        overviewCategoriesList.innerHTML = `
            <div class="empty-state-message">
                <span class="empty-icon">📂</span>
                No overview categories found. Add your first category above.
            </div>
        `;
        return;
    }

    let html = '<div class="sortable-categories" id="sortable-overview">';
    allCategoriesOverview.forEach((cat, index) => {
        html += `
            <div class="category-item" data-id="${cat.id}" data-order="${index}">
                <span><strong>${cat.name}</strong></span>
                <div class="cat-actions">
                    <button type="button" class="admin-action-btn edit-btn edit-overview-cat-btn" data-id="${cat.id}" data-name="${cat.name}">Edit</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-overview-cat-btn" data-id="${cat.id}" ${cat.subcategories && cat.subcategories.length > 0 ? 'disabled' : ''}>
                        Delete${cat.subcategories && cat.subcategories.length > 0 ? ' · has sub-categories' : ''}
                    </button>
                </div>
            </div>
        `;
        
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach((sub, subIndex) => {
                const hasProducts = allProducts.some(p => p.overviewCategory === sub || p.overviewCategory === cat.name);
                html += `
                    <div class="subcategory-item" style="padding-left:32px;" data-cat-id="${cat.id}" data-sub="${sub}" data-order="${subIndex}">
                        <span>↳ ${sub}</span>
                        <div class="cat-actions">
                            <button type="button" class="admin-action-btn edit-btn edit-overview-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}">Edit</button>
                            <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-overview-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}" ${hasProducts ? 'disabled' : ''}>
                                Delete${hasProducts ? ' · has products' : ''}
                            </button>
                        </div>
                    </div>
                `;
            });
        }
    });
    html += '</div>';
    html += `<button id="save-overview-order-btn" class="btn-primary" style="margin-top:16px;">Save Order</button>`;
    overviewCategoriesList.innerHTML = html;

    overviewCategoriesList.querySelectorAll('.edit-overview-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => editOverviewCategory(btn.dataset.id, btn.dataset.name));
    });
    overviewCategoriesList.querySelectorAll('.delete-overview-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteOverviewCategory(btn.dataset.id));
    });
    overviewCategoriesList.querySelectorAll('.edit-overview-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => editOverviewSubCategory(btn.dataset.catId, btn.dataset.sub));
    });
    overviewCategoriesList.querySelectorAll('.delete-overview-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteOverviewSubCategory(btn.dataset.catId, btn.dataset.sub));
    });

    const saveOrderBtn = document.getElementById('save-overview-order-btn');
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', () => saveCategoriesOrder('overview'));
    }

    if (typeof Sortable !== 'undefined') {
        const sortableContainer = document.getElementById('sortable-overview');
        if (sortableContainer) {
            new Sortable(sortableContainer, {
                animation: 150,
                handle: '.category-item',
                onEnd: function() {
                    const items = sortableContainer.querySelectorAll('.category-item');
                    items.forEach((item, index) => {
                        item.dataset.order = index;
                    });
                }
            });
        }
    }
}

// إضافة فئة Overview رئيسية
addOverviewCategoryBtn?.addEventListener('click', async function() {
    const name = newOverviewCategoryName?.value.trim();
    if (!name) {
        showAdminMessage('Please enter an overview category name.');
        return;
    }

    try {
        await addDoc(collection(db, 'categories'), {
            name: name,
            subcategories: [],
            type: 'overview',
            order: allCategoriesOverview.length
        });
        if (newOverviewCategoryName) newOverviewCategoryName.value = '';
        await loadOverviewCategories();
        await loadCategories();
        showAdminMessage(`Overview category "${name}" added successfully!`);
    } catch (error) {
        console.error('Error adding overview category:', error);
        showAdminMessage('Error adding overview category.');
    }
});

async function editOverviewCategory(categoryId, currentName) {
    const newName = prompt(`Edit overview category name (current: "${currentName}"):`, currentName);
    if (!newName || newName === currentName) return;

    try {
        await updateDoc(doc(db, 'categories', categoryId), { name: newName });
        await loadOverviewCategories();
        await loadCategories();
        showAdminMessage('Overview category updated successfully!');
    } catch (error) {
        console.error('Error editing overview category:', error);
        showAdminMessage('Error editing overview category.');
    }
}

async function deleteOverviewCategory(categoryId) {
    const cat = allCategoriesOverview.find(c => c.id === categoryId);
    if (!cat) return;
    if (cat.subcategories && cat.subcategories.length > 0) {
        showAdminMessage('Cannot delete a category that has sub-categories. Please delete all sub-categories first.');
        return;
    }
    if (!confirm(`Are you sure you want to delete overview category "${cat.name}"?`)) return;

    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        await loadOverviewCategories();
        await loadCategories();
        showAdminMessage('Overview category deleted successfully.');
    } catch (error) {
        console.error('Error deleting overview category:', error);
        showAdminMessage('Error deleting overview category.');
    }
}

// إضافة فئة فرعية لـ Overview
addOverviewSubcategoryBtn?.addEventListener('click', async function() {
    const parentId = overviewParentCategorySelect?.value;
    const name = newOverviewSubcategoryName?.value.trim();

    if (!parentId || !name) {
        showAdminMessage('Please select a parent category and enter a sub-category name.');
        return;
    }

    try {
        const catRef = doc(db, 'categories', parentId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            if (subcategories.includes(name)) {
                showAdminMessage('This sub-category already exists.');
                return;
            }
            subcategories.push(name);
            await updateDoc(catRef, { subcategories: subcategories });
            if (newOverviewSubcategoryName) newOverviewSubcategoryName.value = '';
            await loadOverviewCategories();
            await loadCategories();
            showAdminMessage(`Overview sub-category "${name}" added successfully!`);
        }
    } catch (error) {
        console.error('Error adding overview sub-category:', error);
        showAdminMessage('Error adding overview sub-category.');
    }
});

async function editOverviewSubCategory(categoryId, subName) {
    const newName = prompt(`Edit overview sub-category name (current: "${subName}"):`, subName);
    if (!newName || newName === subName) return;

    try {
        const catRef = doc(db, 'categories', categoryId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            const index = subcategories.indexOf(subName);
            if (index === -1) {
                showAdminMessage('Sub-category not found.');
                return;
            }
            subcategories[index] = newName;
            await updateDoc(catRef, { subcategories: subcategories });
            
            const productsQuery = query(collection(db, 'products'), where('overviewCategory', '==', subName));
            const productsSnapshot = await getDocs(productsQuery);
            const batch = writeBatch(db);
            productsSnapshot.forEach((docSnap) => {
                batch.update(docSnap.ref, { overviewCategory: newName });
            });
            await batch.commit();
            
            await loadOverviewCategories();
            await loadCategories();
            await loadProducts();
            showAdminMessage('Overview sub-category updated successfully!');
        }
    } catch (error) {
        console.error('Error editing overview sub-category:', error);
        showAdminMessage('Error editing overview sub-category.');
    }
}

async function deleteOverviewSubCategory(categoryId, subName) {
    // ✅ حماية: التحقق من وجود منتجات في هذه الفئة الفرعية
    const hasProducts = allProducts.some(p => p.overviewCategory === subName);
    if (hasProducts) {
        showAdminMessage('Cannot delete an overview sub-category that has products. Please delete or move all products first.');
        return;
    }
    if (!confirm(`Are you sure you want to delete overview sub-category "${subName}"?`)) return;

    try {
        const catRef = doc(db, 'categories', categoryId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            const updated = subcategories.filter(s => s !== subName);
            await updateDoc(catRef, { subcategories: updated });
            await loadOverviewCategories();
            await loadCategories();
            showAdminMessage(`Overview sub-category "${subName}" deleted successfully.`);
        }
    } catch (error) {
        console.error('Error deleting overview sub-category:', error);
        showAdminMessage('Error deleting overview sub-category.');
    }
}

// ============================================
// 6.5 إدارة السمات (Attributes)
// ============================================

async function loadAttributes() {
    try {
        const querySnapshot = await getDocs(query(collection(db, 'attributes'), orderBy('order', 'asc')));
        allAttributes = [];
        querySnapshot.forEach((doc) => {
            allAttributes.push({ id: doc.id, ...doc.data() });
        });
        renderAttributes();
        renderProductAttributeFields(); // تحديث نموذج المنتج
    } catch (error) {
        console.error('Error loading attributes:', error);
        if (attributesList) {
            attributesList.innerHTML = '<p style="color:#c0392b;">Error loading attributes.</p>';
        }
    }
}

function renderAttributes() {
    if (!attributesList) return;
    
    if (!allAttributes || allAttributes.length === 0) {
        attributesList.innerHTML = `
            <div class="empty-state-message">
                <span class="empty-icon">🏷️</span>
                No attributes found. Add your first attribute (e.g. Quality, Size).
            </div>
        `;
        return;
    }

    let html = '';
    allAttributes.forEach(attr => {
        html += `
            <div class="admin-card attribute-card" data-id="${attr.id}">
                <div class="attribute-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                    <h4 style="margin:0;">${attr.label}</h4>
                    <div class="attr-actions">
                        <button type="button" class="admin-action-btn edit-btn edit-attr-btn" data-id="${attr.id}" data-label="${attr.label}">Edit</button>
                        <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-attr-btn" data-id="${attr.id}">Delete</button>
                    </div>
                </div>
                <div class="options-container" id="options-${attr.id}">
                    ${(attr.options || []).map(opt => `
                        <div class="option-tag" style="display:inline-flex; align-items:center; background:#f0f0f0; padding:4px 10px; margin:4px; border-radius:4px; font-size:13px;">
                            ${opt}
                            <button type="button" class="admin-action-btn admin-action-btn--quiet remove-option-btn" data-attr-id="${attr.id}" data-option="${opt}">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <div class="add-option-row" style="margin-top:12px; display:flex; gap:8px;">
                    <input type="text" class="form-input new-option-input" placeholder="New option" style="flex:1;">
                    <button class="add-option-btn btn-primary" data-attr-id="${attr.id}">Add</button>
                </div>
            </div>
        `;
    });
    
    attributesList.innerHTML = html;

    // ربط الأحداث
    attributesList.querySelectorAll('.edit-attr-btn').forEach(btn => {
        btn.addEventListener('click', () => editAttribute(btn.dataset.id, btn.dataset.label));
    });
    attributesList.querySelectorAll('.delete-attr-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAttribute(btn.dataset.id));
    });
    attributesList.querySelectorAll('.add-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const attrId = this.dataset.attrId;
            const input = this.parentElement.querySelector('.new-option-input');
            addOptionToAttribute(attrId, input.value.trim());
        });
    });
    attributesList.querySelectorAll('.remove-option-btn').forEach(btn => {
        btn.addEventListener('click', () => removeOptionFromAttribute(btn.dataset.attrId, btn.dataset.option));
    });
}

addAttributeBtn?.addEventListener('click', async function() {
    const label = newAttributeLabel?.value.trim();
    if (!label) {
        showAdminMessage('Please enter an attribute label.');
        return;
    }

    try {
        await addDoc(collection(db, 'attributes'), {
            label: label,
            options: [],
            order: allAttributes.length
        });
        if (newAttributeLabel) newAttributeLabel.value = '';
        await loadAttributes();
    } catch (error) {
        console.error('Error adding attribute:', error);
        showAdminMessage('Error adding attribute.');
    }
});

async function editAttribute(attrId, currentLabel) {
    const newLabel = prompt(`Edit attribute label (current: "${currentLabel}"):`, currentLabel);
    if (!newLabel || newLabel === currentLabel) return;

    try {
        await updateDoc(doc(db, 'attributes', attrId), { label: newLabel });
        await loadAttributes();
    } catch (error) {
        console.error('Error editing attribute:', error);
        showAdminMessage('Error editing attribute.');
    }
}

async function deleteAttribute(attrId) {
    if (!confirm('Are you sure you want to delete this attribute? This will remove it from all products.')) return;

    try {
        await deleteDoc(doc(db, 'attributes', attrId));
        await loadAttributes();
    } catch (error) {
        console.error('Error deleting attribute:', error);
        showAdminMessage('Error deleting attribute.');
    }
}

async function addOptionToAttribute(attrId, option) {
    if (!option) return;
    const attr = allAttributes.find(a => a.id === attrId);
    if (!attr) return;
    
    const options = attr.options || [];
    if (options.includes(option)) {
        showAdminMessage('Option already exists.');
        return;
    }

    try {
        options.push(option);
        await updateDoc(doc(db, 'attributes', attrId), { options: options });
        await loadAttributes();
    } catch (error) {
        console.error('Error adding option:', error);
        showAdminMessage('Error adding option.');
    }
}

async function removeOptionFromAttribute(attrId, option) {
    if (!confirm(`Remove option "${option}"?`)) return;
    const attr = allAttributes.find(a => a.id === attrId);
    if (!attr) return;
    
    const options = (attr.options || []).filter(o => o !== option);

    try {
        await updateDoc(doc(db, 'attributes', attrId), { options: options });
        await loadAttributes();
    } catch (error) {
        console.error('Error removing option:', error);
        showAdminMessage('Error removing option.');
    }
}

function renderProductAttributeFields() {
    const container = document.getElementById('dynamic-attributes-container');
    if (!container) return;

    if (!allAttributes || allAttributes.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    allAttributes.forEach(attr => {
        html += `
            <div class="form-group attribute-field-group" data-attr-id="${attr.id}">
                <label>${attr.label}</label>
                <div class="attribute-options-grid" style="display:flex; flex-wrap:wrap; gap:10px; padding:10px; background:#f9f9f9; border:1px solid #eee;">
                    ${(attr.options || []).map(opt => `
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px;">
                            <input type="checkbox" class="attr-opt-checkbox" data-attr-id="${attr.id}" value="${opt}">
                            ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// 6.8 تجربة الكتالوج والفلاتر القابلة للإدارة
// ============================================
const CATALOG_EXPERIENCE_DEFAULTS = {
    colorSwatches: true,
    desktopHoverPreview: true,
    mobileColorRail: true,
    lifestyleView: false,
    availabilityFilter: false,
    shareableFilters: true
};

function escapeAdminMarkup(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function normalizeCatalogKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

function normalizeCatalogColor(value) {
    const candidate = String(value || '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : '#D9D0C4';
}

function safeCatalogImageUrl(value) {
    const candidate = String(value || '').trim();
    if (!candidate) return '';
    return /^(https?:\/\/|\/|\.\/|tiddis-logo\.svg)/i.test(candidate) ? candidate : '';
}

function slugCatalogOption(value) {
    return normalizeCatalogKey(value).replace(/-/g, '_') || `option_${Date.now()}`;
}

function legacyAttributeOptions(labelPart) {
    const match = allAttributes.find(attribute => String(attribute.label || '').toLowerCase().includes(labelPart));
    return Array.isArray(match?.options) ? match.options : [];
}

function buildDefaultCatalogOption(filterKey, value, index) {
    const label = String(value || '').trim();
    const knownColors = {
        black: '#171717',
        white: '#F5F2EC',
        beige: '#CDBFAE',
        brown: '#80624A',
        grey: '#9D9D9A',
        gray: '#9D9D9A',
        red: '#8E3137',
        blue: '#536E83',
        green: '#65745D',
        gold: '#B69A62',
        noir: '#171717',
        blanc: '#F5F2EC',
        beige: '#CDBFAE',
        marron: '#80624A',
        gris: '#9D9D9A'
    };
    const colorKey = label.toLowerCase();
    return {
        id: `${filterKey}_${slugCatalogOption(label)}_${index + 1}`,
        label,
        value: label,
        color: knownColors[colorKey] || '#D9D0C4',
        swatchUrl: '',
        status: 'published',
        order: index
    };
}

async function ensureDefaultCatalogFilters() {
    const snapshot = await getDocs(collection(db, 'catalogFilters'));
    if (!snapshot.empty) return snapshot.docs.map(filterDoc => ({ id: filterDoc.id, ...filterDoc.data() }));

    const defaults = [
        {
            id: 'color',
            label: 'Color',
            type: 'single-select',
            display: 'swatches',
            description: 'A single visual color choice; selecting another color replaces the previous one.',
            options: legacyAttributeOptions('color').map((value, index) => buildDefaultCatalogOption('color', value, index)),
            order: 0
        },
        {
            id: 'quality',
            label: 'Quality',
            type: 'multi-select',
            display: 'checklist',
            description: 'Multiple qualities may be selected together.',
            options: legacyAttributeOptions('quality').map((value, index) => buildDefaultCatalogOption('quality', value, index)),
            order: 1
        },
        {
            id: 'size',
            label: 'Size',
            type: 'multi-select',
            display: 'checklist',
            description: 'Multiple sizes may be selected together.',
            options: legacyAttributeOptions('size').map((value, index) => buildDefaultCatalogOption('size', value, index)),
            order: 2
        },
        {
            id: 'price',
            label: 'Price',
            type: 'range',
            display: 'dual-slider',
            description: 'A numeric range based on the product base price.',
            options: [],
            order: 3
        },
        {
            id: 'availability',
            label: 'Availability',
            type: 'toggle',
            display: 'checklist',
            description: 'Show products currently available for order.',
            options: [{ id: 'availability_available', label: 'Available', value: 'available', status: 'published', order: 0 }],
            order: 4
        }
    ];

    await Promise.all(defaults.map(filter => setDoc(doc(db, 'catalogFilters', filter.id), {
        key: filter.id,
        label: filter.label,
        type: filter.type,
        display: filter.display,
        description: filter.description,
        options: filter.options,
        order: filter.order,
        visible: true,
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })));

    return defaults.map(filter => ({ ...filter, key: filter.id, visible: true, status: 'published' }));
}

function syncCatalogExperienceControls() {
    const controls = {
        'catalog-feature-color-swatches': catalogExperience.colorSwatches,
        'catalog-feature-hover-preview': catalogExperience.desktopHoverPreview,
        'catalog-feature-mobile-rail': catalogExperience.mobileColorRail,
        'catalog-feature-lifestyle': catalogExperience.lifestyleView,
        'catalog-feature-stock-filter': catalogExperience.availabilityFilter,
        'catalog-feature-shareable': catalogExperience.shareableFilters
    };
    Object.entries(controls).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.checked = value !== false;
    });
}

function readCatalogExperienceControls() {
    return {
        colorSwatches: document.getElementById('catalog-feature-color-swatches')?.checked !== false,
        desktopHoverPreview: document.getElementById('catalog-feature-hover-preview')?.checked !== false,
        mobileColorRail: document.getElementById('catalog-feature-mobile-rail')?.checked !== false,
        lifestyleView: document.getElementById('catalog-feature-lifestyle')?.checked === true,
        availabilityFilter: document.getElementById('catalog-feature-stock-filter')?.checked === true,
        shareableFilters: document.getElementById('catalog-feature-shareable')?.checked !== false,
        updatedAt: serverTimestamp()
    };
}

function renderCatalogFilters() {
    if (!catalogFiltersList) return;
    const filters = [...allCatalogFilters].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    const publishedCount = filters.filter(filter => filter.status !== 'archived' && filter.visible !== false).length;
    if (catalogFilterSummary) catalogFilterSummary.textContent = `${publishedCount} visitor filters · ${filters.length} total definitions`;

    if (!filters.length) {
        catalogFiltersList.innerHTML = '<div class="empty-state-message"><span class="empty-icon">⌕</span>No catalog filters defined yet.</div>';
        return;
    }

    catalogFiltersList.innerHTML = filters.map((filter, filterIndex) => {
        const filterId = escapeAdminMarkup(filter.id);
        const key = escapeAdminMarkup(filter.key || filter.id);
        const label = escapeAdminMarkup(filter.label || filter.key || filter.id);
        const description = escapeAdminMarkup(filter.description || '');
        const options = Array.isArray(filter.options) ? filter.options : [];
        const archivedClass = filter.status === 'archived' ? ' is-archived' : '';
        return `
            <article class="catalog-filter-editor${archivedClass}" data-filter-id="${filterId}">
                <div class="catalog-filter-editor-head">
                    <div>
                        <span class="catalog-filter-index">${String(filterIndex + 1).padStart(2, '0')}</span>
                        <strong>${label}</strong>
                        <code>${key}</code>
                    </div>
                    <span class="catalog-filter-status">${escapeAdminMarkup(filter.status || 'published')}</span>
                </div>
                <div class="catalog-filter-editor-grid">
                    <label>Visitor label<input class="form-input" data-catalog-filter-field="label" value="${label}"></label>
                    <label>Type<select class="form-input" data-catalog-filter-field="type">
                        ${['single-select', 'multi-select', 'range', 'toggle', 'tree'].map(type => `<option value="${type}" ${filter.type === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select></label>
                    <label>Display<select class="form-input" data-catalog-filter-field="display">
                        ${['checklist', 'swatches', 'dual-slider', 'select'].map(display => `<option value="${display}" ${filter.display === display ? 'selected' : ''}>${display}</option>`).join('')}
                    </select></label>
                    <label>Status<select class="form-input" data-catalog-filter-field="status">
                        ${['draft', 'published', 'archived'].map(status => `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select></label>
                    <label>Order<input type="number" min="0" class="form-input" data-catalog-filter-field="order" value="${Number(filter.order) || 0}"></label>
                    <label class="catalog-filter-visible"><input type="checkbox" data-catalog-filter-field="visible" ${filter.visible !== false ? 'checked' : ''}> Visible to visitors</label>
                </div>
                <label class="catalog-filter-description">Description<textarea class="form-input" rows="2" data-catalog-filter-field="description">${description}</textarea></label>
                <div class="catalog-filter-editor-actions">
                    <button type="button" class="admin-action-btn save-catalog-filter-btn" data-filter-id="${filterId}">Save definition</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger archive-catalog-filter-btn" data-filter-id="${filterId}">${filter.status === 'archived' ? 'Keep archived' : 'Archive filter'}</button>
                </div>
                <div class="catalog-options-editor">
                    <div class="catalog-options-heading"><h4>Options and swatches</h4><span>${options.length} option${options.length === 1 ? '' : 's'}</span></div>
                    <div class="catalog-options-list">
                        ${options.length ? options.map((option, optionIndex) => {
                            const optionLabel = escapeAdminMarkup(option.label || option.value || '');
                            const optionValue = escapeAdminMarkup(option.value || option.label || '');
                            const optionColor = normalizeCatalogColor(option.color);
                            const optionImage = safeCatalogImageUrl(option.swatchUrl);
                            return `
                                <div class="catalog-option-editor" data-option-index="${optionIndex}">
                                    <span class="catalog-option-preview" style="--catalog-swatch-color:${optionColor};">${optionImage ? `<img src="${escapeAdminMarkup(optionImage)}" alt="">` : ''}</span>
                                    <input class="form-input" data-option-field="label" value="${optionLabel}" aria-label="Option label">
                                    <input class="form-input" data-option-field="value" value="${optionValue}" aria-label="Option value">
                                    <input class="form-input catalog-option-color" data-option-field="color" value="${escapeAdminMarkup(option.color || optionColor)}" aria-label="Option color">
                                    <input class="form-input catalog-option-swatch-url" data-option-field="swatchUrl" value="${escapeAdminMarkup(option.swatchUrl || '')}" placeholder="Optional image URL" aria-label="Option swatch image URL">
                                    <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".catalog-option-swatch-url" data-media-usage="other">Library</button>
                                    <button type="button" class="admin-action-btn save-catalog-option-btn" data-filter-id="${filterId}" data-option-index="${optionIndex}">Save</button>
                                    <button type="button" class="admin-action-btn admin-action-btn--danger archive-catalog-option-btn" data-filter-id="${filterId}" data-option-index="${optionIndex}">Archive</button>
                                </div>
                            `;
                        }).join('') : '<p class="admin-helper-text">No options yet. Add the first option below.</p>'}
                    </div>
                    <div class="catalog-option-add-row">
                        <input class="form-input new-catalog-option-label" placeholder="Label, e.g. Ivory">
                        <input class="form-input new-catalog-option-value" placeholder="Stable value">
                        <input class="form-input new-catalog-option-color" placeholder="#D9D0C4">
                        <input class="form-input new-catalog-option-image" placeholder="Optional swatch image URL">
                        <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".new-catalog-option-image" data-media-usage="other">Library</button>
                        <button type="button" class="admin-action-btn add-catalog-option-btn" data-filter-id="${filterId}">Add option</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderCatalogProductFields() {
    if (!catalogProductFields) return;
    const filters = allCatalogFilters
        .filter(filter => filter.status === 'published' && filter.visible !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    if (!filters.length) {
        catalogProductFields.innerHTML = '';
        return;
    }

    catalogProductFields.innerHTML = `
        <div class="catalog-product-fields-heading">
            <h3>Catalog presentation</h3>
            <p>Choose the controlled values that visitors can use for filtering. Legacy attributes remain supported.</p>
        </div>
        ${filters.map(filter => {
            const key = escapeAdminMarkup(filter.key || filter.id);
            const options = (filter.options || []).filter(option => option.status !== 'archived');
            const inputType = filter.type === 'single-select' ? 'radio' : 'checkbox';
            if (filter.type === 'range') {
                return `
                    <fieldset class="catalog-product-field" data-catalog-filter-key="${key}" data-catalog-filter-type="range">
                        <legend>${escapeAdminMarkup(filter.label || key)}</legend>
                        <div class="catalog-range-inputs"><input type="number" class="form-input catalog-range-min" placeholder="Minimum"><span>to</span><input type="number" class="form-input catalog-range-max" placeholder="Maximum"></div>
                    </fieldset>
                `;
            }
            if (filter.type === 'toggle') {
                return `
                    <fieldset class="catalog-product-field" data-catalog-filter-key="${key}" data-catalog-filter-type="toggle">
                        <legend>${escapeAdminMarkup(filter.label || key)}</legend>
                        <label class="catalog-toggle-input"><input type="checkbox" class="catalog-filter-toggle-input"> ${escapeAdminMarkup(filter.description || 'Enable this state')}</label>
                    </fieldset>
                `;
            }
            return `
                <fieldset class="catalog-product-field ${filter.display === 'swatches' ? 'is-swatch-field' : ''}" data-catalog-filter-key="${key}" data-catalog-filter-type="${escapeAdminMarkup(filter.type || 'multi-select')}">
                    <legend>${escapeAdminMarkup(filter.label || key)}</legend>
                    <div class="catalog-product-options">
                        ${options.length ? options.map(option => {
                            const optionValue = escapeAdminMarkup(option.value || option.label || '');
                            const optionColor = normalizeCatalogColor(option.color);
                            const optionImage = safeCatalogImageUrl(option.swatchUrl);
                            return `<label class="catalog-product-option"><input type="${inputType}" name="catalog-${key}" class="catalog-filter-option-input" value="${optionValue}"><span class="catalog-option-chip" ${filter.display === 'swatches' ? `style="--catalog-swatch-color:${optionColor};"` : ''}>${optionImage ? `<img src="${escapeAdminMarkup(optionImage)}" alt="">` : ''}${escapeAdminMarkup(option.label || option.value || '')}</span></label>`;
                        }).join('') : '<span class="admin-helper-text">No published options. Add them in Catalog Experience.</span>'}
                    </div>
                </fieldset>
            `;
        }).join('')}
    `;
}

function readCatalogProductValues() {
    const values = {};
    catalogProductFields?.querySelectorAll('[data-catalog-filter-key]').forEach(field => {
        const key = field.dataset.catalogFilterKey;
        const type = field.dataset.catalogFilterType;
        if (!key) return;
        if (type === 'range') {
            const minValue = field.querySelector('.catalog-range-min')?.value;
            const maxValue = field.querySelector('.catalog-range-max')?.value;
            if (minValue !== '' || maxValue !== '') values[key] = { min: minValue === '' ? null : Number(minValue), max: maxValue === '' ? null : Number(maxValue) };
            return;
        }
        if (type === 'toggle') {
            values[key] = field.querySelector('.catalog-filter-toggle-input')?.checked === true;
            return;
        }
        const selected = Array.from(field.querySelectorAll('.catalog-filter-option-input:checked')).map(input => input.value);
        if (type === 'single-select') values[key] = selected[0] || '';
        else if (selected.length) values[key] = selected;
    });
    return values;
}

function applyCatalogProductValues(values = {}) {
    catalogProductFields?.querySelectorAll('[data-catalog-filter-key]').forEach(field => {
        const key = field.dataset.catalogFilterKey;
        const type = field.dataset.catalogFilterType;
        const value = values[key];
        if (type === 'range' && value && typeof value === 'object') {
            const min = field.querySelector('.catalog-range-min');
            const max = field.querySelector('.catalog-range-max');
            if (min) min.value = value.min ?? '';
            if (max) max.value = value.max ?? '';
            return;
        }
        if (type === 'toggle') {
            const toggle = field.querySelector('.catalog-filter-toggle-input');
            if (toggle) toggle.checked = value === true;
            return;
        }
        const selectedValues = Array.isArray(value) ? value : [value];
        field.querySelectorAll('.catalog-filter-option-input').forEach(input => {
            input.checked = selectedValues.includes(input.value);
        });
    });
}

async function loadCatalogExperience() {
    try {
        const experienceSnap = await getDoc(doc(db, 'settings', 'catalogExperience'));
        catalogExperience = experienceSnap.exists() ? { ...CATALOG_EXPERIENCE_DEFAULTS, ...experienceSnap.data() } : { ...CATALOG_EXPERIENCE_DEFAULTS };
        allCatalogFilters = await ensureDefaultCatalogFilters();
        allCatalogFilters.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        syncCatalogExperienceControls();
        renderCatalogFilters();
        renderCatalogProductFields();
    } catch (error) {
        console.error('Error loading catalog experience:', error);
        if (catalogFiltersList) catalogFiltersList.innerHTML = '<p style="color:#c0392b;">Error loading catalog experience.</p>';
    }
}

async function saveCatalogExperience() {
    try {
        catalogExperience = readCatalogExperienceControls();
        await setDoc(doc(db, 'settings', 'catalogExperience'), catalogExperience, { merge: true });
        showAdminMessage('Catalog experience settings saved.');
    } catch (error) {
        console.error('Error saving catalog experience:', error);
        showAdminMessage('Error saving catalog experience.', 'error');
    }
}

async function saveCatalogFilter(filterId, card) {
    const label = card.querySelector('[data-catalog-filter-field="label"]')?.value.trim();
    if (!label) {
        showAdminMessage('A visitor label is required.', 'error');
        return;
    }
    const filterData = {
        label,
        type: card.querySelector('[data-catalog-filter-field="type"]')?.value || 'multi-select',
        display: card.querySelector('[data-catalog-filter-field="display"]')?.value || 'checklist',
        status: card.querySelector('[data-catalog-filter-field="status"]')?.value || 'draft',
        order: Number(card.querySelector('[data-catalog-filter-field="order"]')?.value) || 0,
        visible: card.querySelector('[data-catalog-filter-field="visible"]')?.checked !== false,
        description: card.querySelector('[data-catalog-filter-field="description"]')?.value.trim() || '',
        updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'catalogFilters', filterId), filterData);
    await loadCatalogExperience();
    showAdminMessage('Filter definition saved.');
}

async function saveCatalogOption(filterId, optionIndex, editor) {
    const filter = allCatalogFilters.find(item => item.id === filterId);
    if (!filter) return;
    const options = Array.isArray(filter.options) ? [...filter.options] : [];
    const current = options[optionIndex];
    if (!current) return;
    const label = editor.querySelector('[data-option-field="label"]')?.value.trim();
    const value = editor.querySelector('[data-option-field="value"]')?.value.trim() || label;
    if (!label || !value) {
        showAdminMessage('Option label and value are required.', 'error');
        return;
    }
    options[optionIndex] = {
        ...current,
        label,
        value,
        color: normalizeCatalogColor(editor.querySelector('[data-option-field="color"]')?.value),
        swatchUrl: safeCatalogImageUrl(editor.querySelector('[data-option-field="swatchUrl"]')?.value),
        status: current.status === 'archived' ? 'published' : (current.status || 'published')
    };
    await updateDoc(doc(db, 'catalogFilters', filterId), { options, updatedAt: serverTimestamp() });
    await loadCatalogExperience();
    showAdminMessage('Catalog option saved.');
}

async function addCatalogOption(filterId, card) {
    const filter = allCatalogFilters.find(item => item.id === filterId);
    if (!filter) return;
    const label = card.querySelector('.new-catalog-option-label')?.value.trim();
    const value = card.querySelector('.new-catalog-option-value')?.value.trim() || label;
    if (!label || !value) {
        showAdminMessage('Option label and value are required.', 'error');
        return;
    }
    const options = Array.isArray(filter.options) ? [...filter.options] : [];
    if (options.some(option => option.value === value && option.status !== 'archived')) {
        showAdminMessage('This option value already exists in the filter.', 'error');
        return;
    }
    options.push({
        id: `${filter.key || filter.id}_${slugCatalogOption(value)}_${Date.now()}`,
        label,
        value,
        color: normalizeCatalogColor(card.querySelector('.new-catalog-option-color')?.value),
        swatchUrl: safeCatalogImageUrl(card.querySelector('.new-catalog-option-image')?.value),
        status: 'published',
        order: options.length
    });
    await updateDoc(doc(db, 'catalogFilters', filterId), { options, updatedAt: serverTimestamp() });
    await loadCatalogExperience();
    showAdminMessage('Catalog option added.');
}

async function archiveCatalogOption(filterId, optionIndex) {
    const filter = allCatalogFilters.find(item => item.id === filterId);
    if (!filter || !Array.isArray(filter.options) || !filter.options[optionIndex]) return;
    const options = filter.options.map((option, index) => index === optionIndex ? { ...option, status: 'archived' } : option);
    await updateDoc(doc(db, 'catalogFilters', filterId), { options, updatedAt: serverTimestamp() });
    await loadCatalogExperience();
    showAdminMessage('Catalog option archived.');
}

async function archiveCatalogFilter(filterId) {
    await updateDoc(doc(db, 'catalogFilters', filterId), { status: 'archived', visible: false, updatedAt: serverTimestamp() });
    await loadCatalogExperience();
    showAdminMessage('Catalog filter archived.');
}

addCatalogFilterBtn?.addEventListener('click', async () => {
    const key = normalizeCatalogKey(catalogFilterKeyInput?.value);
    const label = catalogFilterLabelInput?.value.trim();
    if (!key || !label) {
        showAdminMessage('A stable key and visitor label are required.', 'error');
        return;
    }
    if (allCatalogFilters.some(filter => (filter.key || filter.id) === key)) {
        showAdminMessage('This stable key already exists.', 'error');
        return;
    }
    try {
        await setDoc(doc(db, 'catalogFilters', key), {
            key,
            label,
            type: catalogFilterTypeSelect?.value || 'multi-select',
            display: catalogFilterDisplaySelect?.value || 'checklist',
            description: '',
            options: [],
            order: allCatalogFilters.length,
            visible: true,
            status: 'draft',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        if (catalogFilterKeyInput) catalogFilterKeyInput.value = '';
        if (catalogFilterLabelInput) catalogFilterLabelInput.value = '';
        await loadCatalogExperience();
        showAdminMessage('Catalog filter added as draft.');
    } catch (error) {
        console.error('Error adding catalog filter:', error);
        showAdminMessage('Error adding catalog filter.', 'error');
    }
});

saveCatalogExperienceBtn?.addEventListener('click', saveCatalogExperience);

catalogFiltersList?.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    const filterId = button.dataset.filterId;
    const card = button.closest('[data-filter-id]');
    try {
        if (button.classList.contains('save-catalog-filter-btn')) await saveCatalogFilter(filterId, card);
        if (button.classList.contains('archive-catalog-filter-btn')) await archiveCatalogFilter(filterId);
        if (button.classList.contains('save-catalog-option-btn')) await saveCatalogOption(filterId, Number(button.dataset.optionIndex), button.closest('[data-option-index]'));
        if (button.classList.contains('archive-catalog-option-btn')) await archiveCatalogOption(filterId, Number(button.dataset.optionIndex));
        if (button.classList.contains('add-catalog-option-btn')) await addCatalogOption(filterId, card);
    } catch (error) {
        console.error('Error updating catalog definition:', error);
        showAdminMessage('Catalog definition could not be updated.', 'error');
    }
});

// ============================================
// 7. إدارة المنتجات (Products)
// ============================================

async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        renderProductsList();
        updateProductStats();
        populateCategorySelects();
        populateOverviewCategorySelects();
    } catch (error) {
        console.error('Error loading products:', error);
        if (productsList) {
            productsList.innerHTML = '<p style="color:#c0392b;">Error loading products.</p>';
        }
    }
}

function renderProductsList() {
    if (!productsList) return;
    
    if (!allProducts || allProducts.length === 0) {
        productsList.innerHTML = '<p>No products yet. Add your first product above.</p>';
        return;
    }

    let html = '';
    allProducts.forEach(product => {
        const price = product.basePrice || 0;
        const category = product.category || 'Uncategorized';
        const overview = product.overviewCategory || 'None';
        html += `
            <div class="product-admin-item">
                <div>
                    <strong>${product.name || 'Unnamed'}</strong>
                    <span style="color:#6b6b6b; font-size:13px; margin-left:12px;">${category}</span>
                    <span style="color:#4E1A1D; font-size:12px; margin-left:8px;">OV: ${overview}</span>
                    <span style="color:#4E1A1D; font-weight:600; margin-left:12px;">${price} DZD</span>
                </div>
                <div class="product-admin-actions">
                    <button type="button" class="edit-btn" data-id="${product.id}">Edit</button>
                    <button type="button" class="delete-btn" data-id="${product.id}">Delete</button>
                    <button type="button" class="pdf-btn" data-id="${product.id}">PDF</button>
                </div>
            </div>
        `;
    });

    productsList.innerHTML = html;

    productsList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    productsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
    productsList.querySelectorAll('.pdf-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.generateProductPDF) {
                window.generateProductPDF(this.dataset.id);
            } else {
                showAdminMessage('PDF generation function not loaded. Please refresh the page.');
            }
        });
    });
}

addVariantBtn?.addEventListener('click', function() {
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;';
    row.innerHTML = `
        <input type="text" class="form-input var-size" placeholder="Size (e.g., 200x280 cm)" style="flex:1; min-width:100px;">
        <input type="text" class="form-input var-color" placeholder="Color (e.g., Grouna)" style="flex:1; min-width:80px;">
        <input type="number" class="form-input var-price" placeholder="Price (DZD)" style="flex:0.7; min-width:80px;">
        <input type="text" class="form-input var-image" placeholder="Image URL" style="flex:1.5; min-width:120px;">
        <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".var-image" data-media-usage="product">Library</button>
        <div class="media-inline-preview" data-media-preview-for="var-image" hidden></div>
        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-variant">Remove</button>
    `;
    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
    variantsContainer?.appendChild(row);
    updateMediaFieldPreview(row.querySelector('.var-image'));
});

addImageRowBtn?.addEventListener('click', function() {
    const row = document.createElement('div');
    row.className = 'image-upload-row';
    row.innerHTML = `
        <input type="text" class="additional-image-url form-input" placeholder="Image URL">
        <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".additional-image-url" data-media-usage="product">Library</button>
        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image">Remove</button>
        <div class="media-inline-preview" data-media-preview-for="additional-image-url" hidden></div>
    `;
    row.querySelector('.btn-remove-image').addEventListener('click', () => {
        row.remove();
        updatePDFImageSelector();
        updateAdditionalImagesPreview();
    });
    additionalImagesContainer?.appendChild(row);
    row.querySelector('.additional-image-url').addEventListener('input', () => {
        updateAdditionalImagesPreview();
        updatePDFImageSelector();
    });
});

function getAdditionalImageUrls() {
    if (!additionalImagesContainer) return [];
    const inputs = additionalImagesContainer.querySelectorAll('.additional-image-url');
    return Array.from(inputs).map(input => input.value.trim()).filter(url => url);
}

function updateAdditionalImagesPreview() {
    if (!additionalImagesPreview) return;
    const urls = getAdditionalImageUrls();
    additionalImagesPreview.innerHTML = urls.map(url =>
        `<img src="${url}" alt="Additional image" onerror="this.style.display='none'">`
    ).join('');
}

function getAllImagesForProduct() {
    const images = [];
    const mainImage = productMainImageInput?.value.trim() || '';
    if (mainImage) images.push(mainImage);
    images.push(...getAdditionalImageUrls());
    return images;
}

function updatePDFImageSelector() {
    if (!pdfImageSelector) return;
    const allImages = getAllImagesForProduct();
    pdfImageSelector.innerHTML = allImages.map((url, index) => {
        const checked = index === 0 ? 'checked' : '';
        return `
            <label style="display:inline-block; margin:4px 8px 4px 0; cursor:pointer; position:relative;">
                <input type="radio" name="pdfImage" value="${url}" ${checked} style="margin-right:4px;">
                <img src="${url}" alt="Image ${index+1}" style="width:60px; height:60px; object-fit:cover; border:1px solid #e2e0d8; vertical-align:middle;">
            </label>
        `;
    }).join('');
}

productMainImageInput?.addEventListener('input', function() {
    const url = this.value.trim();
    if (mainImagePreview) {
        if (url) {
            mainImagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
        } else {
            mainImagePreview.innerHTML = '';
        }
    }
    updateMediaFieldPreview(this);
    updatePDFImageSelector();
});

// تحديث معاينات المكتبة لكل حقل صورة، بما في ذلك الحقول الديناميكية.
document.addEventListener('input', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && (input.type === 'text' || input.type === 'url')) {
        updateMediaFieldPreview(input);
    }
});

productForm?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = productNameInput?.value.trim();
    const category = productCategorySelect?.value;
    const overviewCategory = productOverviewCategorySelect?.value || null;
    const basePrice = parseFloat(productBasePriceInput?.value);
    const imageUrl = productMainImageInput?.value.trim();
    const customizableSize = productCustomizableCheckbox?.checked || false;
    const status = document.getElementById('product-status')?.value || 'published';
    const publishAtRaw = document.getElementById('product-publish-at')?.value || '';
    const sortOrder = Number(document.getElementById('product-sort-order')?.value || 0);
    const publishAt = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;
    const filterValues = readCatalogProductValues();

    // جمع السمات
    const attributes = {};
    const attrCheckboxes = document.querySelectorAll('.attr-opt-checkbox:checked');
    attrCheckboxes.forEach(cb => {
        const attrId = cb.dataset.attrId;
        const val = cb.value;
        if (!attributes[attrId]) attributes[attrId] = [];
        attributes[attrId].push(val);
    });

    if (!name || !category || !basePrice || !imageUrl) {
        showAdminMessage('Please fill in all required fields (Name, Category, Price, Main Image).');
        return;
    }

    const variantRows = variantsContainer?.querySelectorAll('.variant-row') || [];
    const variants = [];
    variantRows.forEach(row => {
        const size = row.querySelector('.var-size')?.value.trim() || '';
        const color = row.querySelector('.var-color')?.value.trim() || '';
        const price = parseFloat(row.querySelector('.var-price')?.value) || basePrice;
        const image = row.querySelector('.var-image')?.value.trim() || imageUrl;
        if (size || color) {
            variants.push({ size, color, price, image });
        }
    });

    const additionalImages = getAdditionalImageUrls();
    const pdfImageRadio = document.querySelector('input[name="pdfImage"]:checked');
    const pdfImage = pdfImageRadio ? pdfImageRadio.value : (imageUrl || '');

    const productData = {
        name,
        category,
        overviewCategory,
        basePrice,
        imageUrl,
        additionalImages,
        pdfImage,
        customizableSize,
        variants,
        attributes,
        filterValues,
        status,
        publishAt,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        updatedAt: serverTimestamp()
    };

    try {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), productData);
            await logAdminActivity('updated', 'product', editingProductId, `${name} (${status})`);
            showAdminMessage('Product updated successfully!');
        } else {
            productData.createdAt = new Date().toISOString();
            const createdProduct = await addDoc(collection(db, 'products'), productData);
            await logAdminActivity('created', 'product', createdProduct.id, `${name} (${status})`);
            showAdminMessage('Product added successfully!');
        }

        editingProductId = null;
        productForm.reset();
        if (variantsContainer) variantsContainer.innerHTML = '';
        if (additionalImagesContainer) {
            additionalImagesContainer.innerHTML = `
                <div class="image-upload-row">
                    <input type="text" class="additional-image-url form-input" placeholder="Image URL">
                    <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".additional-image-url" data-media-usage="product">Library</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image" style="display:none;">Remove</button>
                    <div class="media-inline-preview" data-media-preview-for="additional-image-url" hidden></div>
                </div>
            `;
        }
        if (mainImagePreview) mainImagePreview.innerHTML = '';
        if (additionalImagesPreview) additionalImagesPreview.innerHTML = '';
        if (pdfImageSelector) pdfImageSelector.innerHTML = '';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }

        await loadProducts();
        populateCategorySelects();
        populateOverviewCategorySelects();

    } catch (error) {
        console.error('Error saving product:', error);
        showAdminMessage('Error saving product. Please check console for details.');
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
    }
});

async function editProduct(productId) {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            showAdminMessage('Product not found.');
            return;
        }

        const product = docSnap.data();
        editingProductId = productId;

        if (productNameInput) productNameInput.value = product.name || '';
        if (productCategorySelect) productCategorySelect.value = product.category || '';
        if (productOverviewCategorySelect) productOverviewCategorySelect.value = product.overviewCategory || '';
        if (productBasePriceInput) productBasePriceInput.value = product.basePrice || '';
        const productStatusInput = document.getElementById('product-status');
        const productPublishAtInput = document.getElementById('product-publish-at');
        const productSortOrderInput = document.getElementById('product-sort-order');
        if (productStatusInput) productStatusInput.value = product.status || 'published';
        if (productPublishAtInput) productPublishAtInput.value = product.publishAt ? new Date(product.publishAt).toISOString().slice(0, 16) : '';
        if (productSortOrderInput) productSortOrderInput.value = product.sortOrder ?? 0;
        if (productMainImageInput) productMainImageInput.value = product.imageUrl || '';
        if (productCustomizableCheckbox) productCustomizableCheckbox.checked = product.customizableSize || false;

        // تعبئة السمات
        const attributes = product.attributes || {};
        document.querySelectorAll('.attr-opt-checkbox').forEach(cb => {
            const attrId = cb.dataset.attrId;
            const val = cb.value;
            cb.checked = attributes[attrId] && attributes[attrId].includes(val);
        });
        applyCatalogProductValues(product.filterValues || {});

        if (product.imageUrl && mainImagePreview) {
            mainImagePreview.innerHTML = `<img src="${product.imageUrl}" alt="Preview">`;
        }

        if (additionalImagesContainer) {
            additionalImagesContainer.innerHTML = '';
            if (product.additionalImages && product.additionalImages.length > 0) {
                product.additionalImages.forEach(url => {
                    const row = document.createElement('div');
                    row.className = 'image-upload-row';
                    row.innerHTML = `
                        <input type="text" class="additional-image-url form-input" value="${url}">
                        <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".additional-image-url" data-media-usage="product">Library</button>
                        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image">Remove</button>
                        <div class="media-inline-preview" data-media-preview-for="additional-image-url" hidden></div>
                    `;
                    row.querySelector('.btn-remove-image').addEventListener('click', () => {
                        row.remove();
                        updatePDFImageSelector();
                        updateAdditionalImagesPreview();
                    });
                    additionalImagesContainer.appendChild(row);
                });
            } else {
                const row = document.createElement('div');
                row.className = 'image-upload-row';
                row.innerHTML = `
                    <input type="text" class="additional-image-url form-input" placeholder="Image URL">
                    <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".additional-image-url" data-media-usage="product">Library</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image" style="display:none;">Remove</button>
                    <div class="media-inline-preview" data-media-preview-for="additional-image-url" hidden></div>
                `;
                additionalImagesContainer.appendChild(row);
            }
            additionalImagesContainer.querySelectorAll('.additional-image-url').forEach(input => {
                input.addEventListener('input', () => {
                    updateAdditionalImagesPreview();
                    updatePDFImageSelector();
                });
            });
            updateAdditionalImagesPreview();
        }

        if (variantsContainer) {
            variantsContainer.innerHTML = '';
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(v => {
                    const row = document.createElement('div');
                    row.className = 'variant-row';
                    row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;';
                    row.innerHTML = `
                        <input type="text" class="form-input var-size" value="${v.size || ''}" placeholder="Size" style="flex:1; min-width:100px;">
                        <input type="text" class="form-input var-color" value="${v.color || ''}" placeholder="Color" style="flex:1; min-width:80px;">
                        <input type="number" class="form-input var-price" value="${v.price || ''}" placeholder="Price" style="flex:0.7; min-width:80px;">
                        <input type="text" class="form-input var-image" value="${v.image || ''}" placeholder="Image URL" style="flex:1.5; min-width:120px;">
                        <button type="button" class="admin-action-btn media-library-trigger" data-media-target=".var-image" data-media-usage="product">Library</button>
                        <div class="media-inline-preview" data-media-preview-for="var-image" hidden></div>
                        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-variant">Remove</button>
                    `;
                    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
                    variantsContainer.appendChild(row);
                    updateMediaFieldPreview(row.querySelector('.var-image'));
                });
            }
        }

        updatePDFImageSelector();

        adminNavLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-section="products"]')?.classList.add('active');
        Object.keys(sections).forEach(key => {
            if (sections[key]) sections[key].classList.remove('active');
        });
        if (sections.products) sections.products.classList.add('active');

        if (productFormWrapper) productFormWrapper.classList.add('open');
        if (toggleProductFormBtn) {
            toggleProductFormBtn.classList.add('is-editing');
            toggleProductFormBtn.innerHTML = '<span class="plus-icon">−</span> Close Product Form';
        }
        productForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Error loading product for edit:', error);
        showAdminMessage('Error loading product.');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product permanently?')) return;

    try {
        await deleteDoc(doc(db, 'products', productId));
        await loadProducts();
        showAdminMessage('Product deleted successfully.');
    } catch (error) {
        console.error('Error deleting product:', error);
        showAdminMessage('Error deleting product.');
    }
}

// ============================================
// 8. إدارة أسعار التوصيل
// ============================================

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
        renderDeliveryTable();
    } catch (error) {
        console.error('Error loading delivery rates:', error);
        if (deliveryTableBody) {
            deliveryTableBody.innerHTML = '<tr><td colspan="4" style="color:#c0392b;">Error loading delivery rates.</td></tr>';
        }
    }
}

function renderDeliveryTable() {
    if (!deliveryTableBody) return;
    
    if (!deliveryRates || Object.keys(deliveryRates).length === 0) {
        deliveryTableBody.innerHTML = '<tr><td colspan="4">No delivery rates configured.</td></tr>';
        return;
    }

    let html = '';
    WILAYAS.forEach(w => {
        const rate = deliveryRates[w.code] || { price: 0, free: false };
        html += `
            <tr>
                <td class="wilaya-code">${w.code}</td>
                <td>${w.name}</td>
                <td>
                    <input type="number" class="delivery-price-input" 
                           data-code="${w.code}" value="${rate.price || 0}" min="0">
                </td>
                <td>
                    <input type="checkbox" class="free-delivery-checkbox" 
                           data-code="${w.code}" ${rate.free ? 'checked' : ''}>
                </td>
            </tr>
        `;
    });

    deliveryTableBody.innerHTML = html;

    deliveryTableBody.querySelectorAll('.delivery-price-input').forEach(input => {
        input.addEventListener('change', function() {
            const code = this.dataset.code;
            const price = parseFloat(this.value) || 0;
            if (deliveryRates[code]) {
                deliveryRates[code].price = price;
                saveDeliveryRates();
            }
        });
    });

    deliveryTableBody.querySelectorAll('.free-delivery-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const code = this.dataset.code;
            const free = this.checked;
            if (deliveryRates[code]) {
                deliveryRates[code].free = free;
                const priceInput = this.closest('tr').querySelector('.delivery-price-input');
                if (free) {
                    if (priceInput) {
                        priceInput.value = 0;
                        priceInput.disabled = true;
                    }
                    deliveryRates[code].price = 0;
                } else {
                    if (priceInput) {
                        priceInput.disabled = false;
                    }
                }
                saveDeliveryRates();
            }
        });
    });

    deliveryTableBody.querySelectorAll('.free-delivery-checkbox').forEach(checkbox => {
        const priceInput = checkbox.closest('tr').querySelector('.delivery-price-input');
        if (checkbox.checked && priceInput) {
            priceInput.disabled = true;
            priceInput.value = 0;
        }
    });
}

async function saveDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        await setDoc(docRef, deliveryRates);
    } catch (error) {
        console.error('Error saving delivery rates:', error);
        showAdminMessage('Error saving delivery rates.');
    }
}

applyBulkPriceBtn?.addEventListener('click', function() {
    const price = parseFloat(bulkDeliveryPrice?.value);
    if (isNaN(price) || price < 0) {
        showAdminMessage('Please enter a valid price.');
        return;
    }
    if (!confirm(`Apply ${price} DZD to all wilayas?`)) return;

    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = price;
            deliveryRates[w.code].free = false;
        }
    });
    saveDeliveryRates();
    renderDeliveryTable();
    showAdminMessage(`Price of ${price} DZD applied to all wilayas.`);
});

setAllFreeBtn?.addEventListener('click', function() {
    if (!confirm('Set all wilayas to Free Delivery?')) return;
    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = 0;
            deliveryRates[w.code].free = true;
        }
    });
    saveDeliveryRates();
    renderDeliveryTable();
    showAdminMessage('All wilayas set to Free Delivery.');
});

resetAllDeliveryBtn?.addEventListener('click', function() {
    if (!confirm('Reset all delivery prices to default (500 DZD)?')) return;
    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = 500;
            deliveryRates[w.code].free = false;
        }
    });
    saveDeliveryRates();
    renderDeliveryTable();
    showAdminMessage('All delivery prices reset to 500 DZD.');
});

// ============================================
// 9. إدارة الطلبات
// ============================================

async function loadOrders() {
    try {
        const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        allOrders = [];
        querySnapshot.forEach((doc) => {
            allOrders.push({ id: doc.id, ...doc.data() });
        });
        renderOrders();
        updateOrderStats();
    } catch (error) {
        console.error('Error loading orders:', error);
        if (ordersList) {
            ordersList.innerHTML = '<p style="color:#c0392b;">Error loading orders.</p>';
        }
    }
}

function renderOrders() {
    if (!ordersList) return;
    
    if (!allOrders || allOrders.length === 0) {
        ordersList.innerHTML = '<p>No orders yet.</p>';
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    allOrders.forEach(order => {
        const date = order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'N/A';
        const status = order.status || 'en attente';
        const statusOptions = ['en attente', 'en cours', 'livrée'];
        
        html += `
            <tr>
                <td>${date}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${order.customerPhone || 'N/A'}</td>
                <td>${order.productName || 'N/A'}</td>
                <td>${order.productSize || 'N/A'}</td>
                <td style="font-weight:600; color:#4E1A1D;">${order.total || 0} DZD</td>
                <td>
                    <select class="order-status-select" data-order-id="${order.id}">
                        ${statusOptions.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button type="button" class="admin-action-btn admin-action-btn--danger delete-order-btn" data-order-id="${order.id}">Delete</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    ordersList.innerHTML = html;

    ordersList.querySelectorAll('.order-status-select').forEach(select => {
        select.addEventListener('change', async function() {
            const orderId = this.dataset.orderId;
            const newStatus = this.value;
            try {
                await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
                showAdminMessage('Order status updated successfully!');
            } catch (error) {
                console.error('Error updating order status:', error);
                showAdminMessage('Error updating order status.');
            }
        });
    });

    ordersList.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const orderId = this.dataset.orderId;
            if (!confirm('Are you sure you want to delete this order?')) return;
            try {
                await deleteDoc(doc(db, 'orders', orderId));
                await loadOrders();
                showAdminMessage('Order deleted successfully.');
            } catch (error) {
                console.error('Error deleting order:', error);
                showAdminMessage('Error deleting order.');
            }
        });
    });
}

function updateOrderStats() {
    if (statOrders) {
        statOrders.textContent = allOrders.length;
    }
}

// ============================================
// 10. إعدادات المتجر
// ============================================

function normalizeImageSources(sources) {
    if (!Array.isArray(sources)) return [];
    return sources
        .filter(source => source && typeof source === 'object')
        .map(source => ({
            provider: ['imgbb', 'cloudinary', 'pixeldrain', 'direct'].includes(source.provider) ? source.provider : 'imgbb',
            apiKey: typeof source.apiKey === 'string' ? source.apiKey : '',
            label: typeof source.label === 'string' ? source.label : providerLabel(source.provider),
            enabled: source.enabled !== false
        }))
        .filter(source => source.provider === 'direct' || source.apiKey);
}

function readCachedPrivateImageSources() {
    try {
        const raw = localStorage.getItem(PRIVATE_IMAGE_SOURCES_KEY);
        return raw ? normalizeImageSources(JSON.parse(raw)) : [];
    } catch (error) {
        console.warn('Unable to read the cached private image sources from this browser.', error);
        return [];
    }
}

function cachePrivateImageSources(sources) {
    try {
        localStorage.setItem(PRIVATE_IMAGE_SOURCES_KEY, JSON.stringify(normalizeImageSources(sources)));
        return true;
    } catch (error) {
        console.warn('Unable to cache private image sources locally:', error);
        return false;
    }
}

async function readPrivateImageSources() {
    const cachedSources = readCachedPrivateImageSources();
    try {
        const privateSourcesRef = doc(db, PRIVATE_IMAGE_SOURCES_COLLECTION, PRIVATE_IMAGE_SOURCES_DOCUMENT);
        const privateSourcesSnap = await getDoc(privateSourcesRef);
        if (privateSourcesSnap.exists()) {
            const remoteSources = normalizeImageSources(privateSourcesSnap.data().sources);
            cachePrivateImageSources(remoteSources);
            return { sources: remoteSources, remoteAvailable: true, remoteExists: true };
        }
        return { sources: cachedSources, remoteAvailable: true, remoteExists: false };
    } catch (error) {
        console.warn('Unable to read private image sources from Firestore; using the local cache.', error);
        return { sources: cachedSources, remoteAvailable: false, remoteExists: false };
    }
}

async function savePrivateImageSources({ silent = false } = {}) {
    const normalizedSources = normalizeImageSources(imageApiSources);
    try {
        const privateSourcesRef = doc(db, PRIVATE_IMAGE_SOURCES_COLLECTION, PRIVATE_IMAGE_SOURCES_DOCUMENT);
        await setDoc(privateSourcesRef, {
            sources: normalizedSources,
            updatedAt: serverTimestamp()
        });
        cachePrivateImageSources(normalizedSources);
        return true;
    } catch (error) {
        console.error('Unable to sync private image sources to Firestore:', error);
        cachePrivateImageSources(normalizedSources);
        if (!silent) {
            showAdminMessage('Could not sync the image source to private Firestore storage. Publish the updated Firestore rules; a local fallback was kept on this browser.', 'error');
        }
        return false;
    }
}

async function loadSettings() {
    try {
        const settingsRef = doc(db, 'settings', 'storeSettings');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            storeSettings = settingsSnap.data();
        } else {
            storeSettings = {
                aboutText: 'Tiddis Tapis is inspired by the deep-rooted history and ancient heritage of Constantine. We transform this timeless legacy into modern rugs.',
                aboutImage: 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg',
                logoUrl: 'tiddis-logo.svg',
                sidebarBgColor: '#ffffff',
                mainBgColor: '#faf9f6',
                contacts: [],
                googleSheetsUrl: '',
                imageProvider: 'imgbb',
                imageApiKey: '',
                imageSources: [],
                marketing: { metaPixelId: '', tiktokPixelId: '', privacyPolicyUrl: 'privacy.html', termsUrl: 'terms.html', consentTitle: 'Your privacy matters', consentText: 'We use essential storage to operate the store. Optional analytics and marketing tools load only when you agree.' }
            };
            await setDoc(settingsRef, storeSettings);
        }

        if (googleSheetsUrlInput) googleSheetsUrlInput.value = storeSettings.googleSheetsUrl || '';
        const legacyImageSources = normalizeImageSources(
            storeSettings.imageSources?.length
                ? storeSettings.imageSources
                : (storeSettings.imageProvider || storeSettings.imageApiKey)
                    ? [{
                        provider: storeSettings.imageProvider || 'imgbb',
                        apiKey: storeSettings.imageApiKey || '',
                        label: storeSettings.imageProvider || 'Image source',
                        enabled: true
                    }]
                    : []
        );
        const privateSourceState = await readPrivateImageSources();
        const privateSources = privateSourceState.sources;
        imageApiSources = privateSources.length || privateSourceState.remoteExists ? privateSources : legacyImageSources;
        if (!privateSourceState.remoteExists && imageApiSources.length) {
            await savePrivateImageSources({ silent: true });
        }
        renderImageApiSourcesList();
        closeImageApiEditor();
        if (aboutUsTextarea) aboutUsTextarea.value = storeSettings.aboutText || '';
        if (aboutImageUrlInput) {
            aboutImageUrlInput.value = storeSettings.aboutImage || 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg';
            updateMediaFieldPreview(aboutImageUrlInput);
        }
        if (logoUrlInput) {
            logoUrlInput.value = getAdminLogoUrl(storeSettings.logoUrl);
            updateMediaFieldPreview(logoUrlInput);
        }
        if (sidebarBgColorInput) sidebarBgColorInput.value = storeSettings.sidebarBgColor || '#ffffff';
        if (mainBgColorInput) mainBgColorInput.value = storeSettings.mainBgColor || '#faf9f6';
        const marketing = storeSettings.marketing || {};
        const setField = (id, value) => { const field = document.getElementById(id); if (field) field.value = value || ''; };
        setField('meta-pixel-id', marketing.metaPixelId);
        setField('tiktok-pixel-id', marketing.tiktokPixelId);
        setField('privacy-policy-url', marketing.privacyPolicyUrl || 'privacy.html');
        setField('terms-url', marketing.termsUrl || 'terms.html');
        setField('cookie-consent-title', marketing.consentTitle || 'Your privacy matters');
        setField('cookie-consent-text', marketing.consentText || 'We use essential storage to operate the store. Optional analytics and marketing tools load only when you agree.');

        renderContactIconsList(storeSettings.contacts || []);
        
        // Add default template slide if none exists to help the user start
        if (!storeSettings.heroSlides || storeSettings.heroSlides.length === 0) {
            storeSettings.heroSlides = [{
                image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80",
                title: "MONUMENTAL CONSTANTINE",
                subtitle: "INSPIRED BY HISTORY — WOVEN FOR YOUR SPACE",
                btnText: "DISCOVER COLLECTION",
                linkType: "all",
                btnUrl: "",
                svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
            }];
            // We don't necessarily save it to Firestore yet, just show it in the UI
            // But if the user wants it to be "editable", it's better to show it.
        }
        renderHeroSlidesList(storeSettings.heroSlides);

    } catch (error) {
        console.error('Error loading settings:', error);
        showAdminMessage('Error loading settings.');
    }
}

async function saveStoreSettings() {
    try {
        const settingsRef = doc(db, 'settings', 'storeSettings');
        const publicSettings = { ...storeSettings };
        delete publicSettings.imageSources;
        delete publicSettings.imageApiKey;
        delete publicSettings.imageProvider;
        await setDoc(settingsRef, publicSettings);
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        showAdminMessage('Error saving settings.');
        return false;
    }
}

saveColorsBtn?.addEventListener('click', function() {
    const sidebarColor = sidebarBgColorInput?.value || '#ffffff';
    const mainColor = mainBgColorInput?.value || '#faf9f6';
    
    if (colorConfirmModal) {
        const confirmText = document.getElementById('color-confirm-text');
        if (confirmText) {
            confirmText.innerHTML = `
                <p>Are you sure you want to change the colors?</p>
                <div style="display:flex; gap:20px; justify-content:center; margin-top:12px;">
                    <div>
                        <span style="font-size:12px; color:#6b6b6b;">Sidebar</span>
                        <div style="width:40px; height:40px; border:1px solid #e2e0d8; background:${sidebarColor}; margin:0 auto;"></div>
                        <span style="font-size:11px; font-family:monospace;">${sidebarColor}</span>
                    </div>
                    <div>
                        <span style="font-size:12px; color:#6b6b6b;">Main</span>
                        <div style="width:40px; height:40px; border:1px solid #e2e0d8; background:${mainColor}; margin:0 auto;"></div>
                        <span style="font-size:11px; font-family:monospace;">${mainColor}</span>
                    </div>
                </div>
            `;
        }
        colorConfirmModal.style.display = 'flex';
        
        colorConfirmYes.onclick = async function() {
            colorConfirmModal.style.display = 'none';
            storeSettings.sidebarBgColor = sidebarColor;
            storeSettings.mainBgColor = mainColor;
            if (await saveStoreSettings()) {
                document.documentElement.style.setProperty('--sidebar-bg', sidebarColor);
                document.documentElement.style.setProperty('--bg-color', mainColor);
                const sidebarEl = document.querySelector('.sidebar');
                if (sidebarEl) sidebarEl.style.backgroundColor = sidebarColor;
                document.body.style.backgroundColor = mainColor;
                showAdminMessage('Colors updated successfully!');
            }
        };
        colorConfirmNo.onclick = function() {
            colorConfirmModal.style.display = 'none';
        };
        if (colorConfirmClose) {
            colorConfirmClose.onclick = function() {
                colorConfirmModal.style.display = 'none';
            };
        }
    }
});

testSheetsBtn?.addEventListener('click', async function() {
    const url = googleSheetsUrlInput?.value.trim();
    if (!url) {
        showAdminMessage('Please paste a Google Sheets Web App URL first.');
        return;
    }

    try {
        this.disabled = true;
        this.textContent = 'Testing...';
        storeSettings.googleSheetsUrl = url;
        await saveStoreSettings();

        const testData = {
            productName: 'TEST_CONNECTION',
            price: '0 DZD',
            customerDetails: 'System Test'
        };

        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        showAdminMessage('✅ Connection successful! (Check your Google Sheet for a test entry.)');
    } catch (error) {
        console.error('Test error:', error);
        showAdminMessage('❌ Connection failed. Please check your URL and try again.');
    } finally {
        this.disabled = false;
        this.textContent = 'Test Connection';
    }
});

saveAboutBtn?.addEventListener('click', async function() {
    const text = aboutUsTextarea?.value.trim();
    const imageUrl = aboutImageUrlInput?.value.trim() || 'https://i.ibb.co/CK9zNFVq/about-tiddis.jpg';
    const validImagePath = /^(https?:\/\/|\/|\.\/|\.\.\/|assets\/)/i.test(imageUrl);
    if (!text) {
        showAdminMessage('Please enter some text for the About section.', 'error');
        return;
    }
    if (!validImagePath) {
        showAdminMessage('Use an HTTPS image URL for the About image.', 'error');
        return;
    }
    storeSettings.aboutText = text;
    storeSettings.aboutImage = imageUrl;
    if (await saveStoreSettings()) {
        showAdminMessage('About Us text and image saved successfully!');
    }
});

saveLogoBtn?.addEventListener('click', async function() {
    const url = logoUrlInput?.value.trim();
    storeSettings.logoUrl = url;
    if (await saveStoreSettings()) {
        showAdminMessage('Logo URL saved successfully!');
    }
});

addContactBtn?.addEventListener('click', async function() {
    const platform = newContactPlatform?.value;
    const value = newContactValue?.value.trim();

    if (!platform || !value) {
        showAdminMessage('Please select a platform and enter a value.');
        return;
    }

    if (!storeSettings.contacts) storeSettings.contacts = [];
    storeSettings.contacts.push({ platform, value });

    if (await saveStoreSettings()) {
        if (newContactValue) newContactValue.value = '';
        renderContactIconsList(storeSettings.contacts);
        showAdminMessage('Contact added successfully!');
    }
});

function renderContactIconsList(contacts) {
    if (!contactIconsList) return;
    
    if (!contacts || contacts.length === 0) {
        contactIconsList.innerHTML = '<p style="color:#6b6b6b;">No contacts configured yet.</p>';
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

    let html = '';
    contacts.forEach((contact, index) => {
        const icon = iconMap[contact.platform] || '🔗';
        html += `
            <div class="contact-item">
                <div class="contact-info">
                    <span>${icon}</span>
                    <span>${contact.platform}:</span>
                    <span style="color:#6b6b6b; font-size:13px;">${contact.value}</span>
                </div>
                <button type="button" class="admin-action-btn admin-action-btn--danger remove-contact-btn" data-index="${index}">Delete</button>
            </div>
        `;
    });

    contactIconsList.innerHTML = html;

    contactIconsList.querySelectorAll('.remove-contact-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const index = parseInt(this.dataset.index);
            if (!confirm('Remove this contact?')) return;
            storeSettings.contacts.splice(index, 1);
            if (await saveStoreSettings()) {
                renderContactIconsList(storeSettings.contacts);
                showAdminMessage('Contact removed.');
            }
        });
    });
}

const IMAGE_LIBRARY_COLLECTION = 'imageLibrary';
const LIBRARY_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_LIBRARY_LOCAL_KEY = 'tiddis-tapis:image-library-pending:v1';

const libraryEscapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const libraryUsageLabels = {
    hero: 'Hero',
    product: 'Product',
    about: 'About Us',
    technical: 'Technical Sheet',
    logo: 'Logo / Icon',
    other: 'Other'
};

let activeMediaPickerTarget = null;

function resolveMediaPickerTarget(trigger) {
    const selector = trigger?.dataset.mediaTarget;
    if (!selector) return null;
    const row = trigger.closest('.image-upload-row, .variant-row, .catalog-option-editor, .catalog-option-add-row');
    if (row && selector.startsWith('.')) return row.querySelector(selector);
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn('Invalid media picker target:', selector, error);
        return null;
    }
}

function updateMediaFieldPreview(inputElement) {
    if (!inputElement) return;
    const url = String(inputElement.value || '').trim();
    const previews = Array.from(document.querySelectorAll('.media-field-preview-row, .media-inline-preview'))
        .filter(preview => {
            const key = String(preview.dataset.mediaPreviewFor || '').replace(/^\./, '');
            return preview.dataset.mediaPreviewFor === `#${inputElement.id}`
                || preview.dataset.mediaPreviewFor === inputElement.dataset.mediaPreviewKey
                || (key && inputElement.classList.contains(key));
        });
    previews.forEach(preview => {
        preview.innerHTML = url
            ? `<img src="${libraryEscapeHtml(url)}" alt="Selected image preview" loading="lazy" onerror="this.classList.add('is-broken')"><span>${libraryEscapeHtml(url.split('/').pop()?.split('?')[0] || 'Selected image')}</span>`
            : '';
        preview.hidden = !url;
    });
}

function renderMediaPickerOptions() {
    const grid = document.getElementById('media-picker-grid');
    const summary = document.getElementById('media-picker-summary');
    const empty = document.getElementById('media-picker-empty');
    if (!grid) return;
    const search = String(document.getElementById('media-picker-search')?.value || '').trim().toLowerCase();
    const usage = document.getElementById('media-picker-usage')?.value || 'all';
    const records = imageLibrary.filter(record => {
        const haystack = [record.name, record.url, record.provider, record.section, record.originalFileName, ...(record.tags || []), ...(record.usedBy || [])].join(' ').toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        const matchesUsage = usage === 'all' || record.usage === usage || (record.usages || []).includes(usage);
        return matchesSearch && matchesUsage;
    });
    if (summary) summary.textContent = `${records.length} image${records.length === 1 ? '' : 's'} available · choose one to use in this field.`;
    if (empty) empty.hidden = records.length > 0;
    grid.innerHTML = records.map(record => {
        const usageText = (record.usages?.length ? record.usages : [record.usage]).map(item => libraryUsageLabels[item] || item).join(' · ');
        return `<button type="button" class="media-picker-option" data-media-url="${libraryEscapeHtml(record.url)}" data-media-name="${libraryEscapeHtml(record.name)}">
            <span class="media-picker-option-thumb"><img src="${libraryEscapeHtml(record.thumbnailUrl || record.url)}" alt="${libraryEscapeHtml(record.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.classList.add('is-broken')"></span>
            <span class="media-picker-option-copy"><strong>${libraryEscapeHtml(record.name)}</strong><small>${libraryEscapeHtml(String(record.provider || 'source').toUpperCase())} · ${libraryEscapeHtml(usageText || 'Image')}</small></span>
        </button>`;
    }).join('');

    grid.querySelectorAll('.media-picker-option').forEach(option => {
        option.addEventListener('click', () => {
            if (!activeMediaPickerTarget) return;
            activeMediaPickerTarget.value = option.dataset.mediaUrl || '';
            activeMediaPickerTarget.dispatchEvent(new Event('input', { bubbles: true }));
            activeMediaPickerTarget.dispatchEvent(new Event('change', { bubbles: true }));
            updateMediaFieldPreview(activeMediaPickerTarget);
            closeMediaPicker();
            showAdminMessage(`Selected ${option.dataset.mediaName || 'image'} from Image Library.`);
        });
    });
}

function openMediaPicker(trigger) {
    const target = resolveMediaPickerTarget(trigger);
    const modal = document.getElementById('media-picker-modal');
    if (!target || !modal) {
        showAdminMessage('This image field is not available.', 'error');
        return;
    }
    activeMediaPickerTarget = target;
    const search = document.getElementById('media-picker-search');
    const usage = document.getElementById('media-picker-usage');
    if (search) search.value = '';
    if (usage) usage.value = trigger.dataset.mediaUsage || 'all';
    renderMediaPickerOptions();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    search?.focus({ preventScroll: true });
}

function closeMediaPicker() {
    const modal = document.getElementById('media-picker-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    activeMediaPickerTarget = null;
}

document.addEventListener('click', event => {
    const trigger = event.target.closest('.media-library-trigger');
    if (trigger) {
        event.preventDefault();
        openMediaPicker(trigger);
        return;
    }
    if (event.target.closest('#media-picker-close')) {
        closeMediaPicker();
        return;
    }
    if (event.target.id === 'media-picker-modal') closeMediaPicker();
});
document.getElementById('media-picker-search')?.addEventListener('input', renderMediaPickerOptions);
document.getElementById('media-picker-usage')?.addEventListener('change', renderMediaPickerOptions);


function providerFromImageUrl(url = '') {
    const value = String(url).trim();
    if (/^(?:\.?\.?\/)?assets\//i.test(value) || /^\/assets\//i.test(value)) return 'local';
    if (/imgbb\.com|ibb\.co/i.test(value)) return 'imgbb';
    return /^https?:\/\//i.test(value) ? 'direct' : 'local';
}

function normalizeLibraryRecord(id, data = {}) {
    const usage = libraryUsageLabels[data.usage] ? data.usage : 'other';
    const usages = Array.isArray(data.usages) ? data.usages.filter(item => libraryUsageLabels[item]) : [usage];
    const usedBy = Array.isArray(data.usedBy) ? data.usedBy.filter(Boolean) : [];
    const tags = Array.isArray(data.tags)
        ? data.tags.map(tag => String(tag).trim()).filter(Boolean)
        : String(data.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
    return {
        id,
        name: String(data.name || 'Untitled image').trim().slice(0, 100),
        provider: ['imgbb', 'direct', 'local'].includes(data.provider) ? data.provider : providerFromImageUrl(data.url),
        url: String(data.url || '').trim(),
        thumbnailUrl: String(data.thumbnailUrl || data.url || '').trim(),
        deleteUrl: String(data.deleteUrl || '').trim(),
        usage,
        usages: [...new Set(usages)],
        section: String(data.section || '').trim().slice(0, 100),
        tags,
        usedBy,
        originalFileName: String(data.originalFileName || '').trim(),
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    };
}

function libraryTimestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function libraryDateLabel(value) {
    const timestamp = libraryTimestampValue(value);
    return timestamp ? new Date(timestamp).toLocaleDateString('en-GB') : '—';
}

function readLocalLibraryRecords() {
    try {
        const raw = localStorage.getItem(IMAGE_LIBRARY_LOCAL_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.map(record => normalizeLibraryRecord(record.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, record))
            : [];
    } catch (error) {
        console.warn('Unable to read pending image metadata:', error);
        return [];
    }
}

function writeLocalLibraryRecords(records) {
    try {
        localStorage.setItem(IMAGE_LIBRARY_LOCAL_KEY, JSON.stringify(records));
    } catch (error) {
        console.warn('Unable to persist pending image metadata:', error);
    }
}

function saveLocalLibraryRecord(record) {
    const records = readLocalLibraryRecords().filter(item => item.url !== record.url);
    records.push(normalizeLibraryRecord(record.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, record));
    writeLocalLibraryRecords(records);
}

function removeLocalLibraryRecord(id) {
    writeLocalLibraryRecords(readLocalLibraryRecords().filter(record => record.id !== id));
}

function mergeLibraryRecords(...groups) {
    const merged = new Map();
    groups.flat().forEach(record => {
        const normalized = normalizeLibraryRecord(record.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, record);
        if (!normalized.url) return;
        const current = merged.get(normalized.url);
        if (!current) {
            merged.set(normalized.url, normalized);
            return;
        }
        merged.set(normalized.url, normalizeLibraryRecord(current.id, {
            ...current,
            ...normalized,
            name: normalized.name !== 'Untitled image' ? normalized.name : current.name,
            usages: [...new Set([...(current.usages || []), ...(normalized.usages || [])])],
            usedBy: [...new Set([...(current.usedBy || []), ...(normalized.usedBy || [])])],
            tags: [...new Set([...(current.tags || []), ...(normalized.tags || [])])]
        }));
    });
    return [...merged.values()].sort((a, b) => libraryTimestampValue(b.createdAt) - libraryTimestampValue(a.createdAt) || a.name.localeCompare(b.name));
}

function getImageUrlsFromValue(value) {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    if (Array.isArray(value)) return value.flatMap(item => getImageUrlsFromValue(item));
    if (value && typeof value === 'object') return Object.values(value).flatMap(item => getImageUrlsFromValue(item));
    return [];
}

function buildKnownSiteImages() {
    const known = new Map();
    const addKnown = (url, usage, usedBy, section = '') => {
        const normalizedUrl = String(url || '').trim();
        if (!normalizedUrl) return;
        const key = normalizedUrl;
        const existing = known.get(key) || {
            name: normalizedUrl.split('/').pop()?.split('?')[0] || 'site-image',
            provider: providerFromImageUrl(normalizedUrl),
            url: normalizedUrl,
            thumbnailUrl: normalizedUrl,
            usage,
            usages: new Set(),
            usedBy: new Set(),
            section: String(section || '').trim(),
            tags: new Set()
        };
        existing.usages.add(libraryUsageLabels[usage] ? usage : 'other');
        if (usedBy) existing.usedBy.add(String(usedBy));
        if (section && !existing.section) existing.section = String(section).trim();
        known.set(key, existing);
    };

    (storeSettings.heroSlides || []).forEach((slide, index) => {
        const slideLabel = `Hero slide ${index + 1}${slide.title ? ` · ${slide.title}` : ''}`;
        addKnown(slide.image, 'hero', slideLabel);
        addKnown(slide.desktopImage, 'hero', `${slideLabel} · Desktop`);
        addKnown(slide.mobileImage, 'hero', `${slideLabel} · Mobile`);
    });
    addKnown(storeSettings.aboutImage, 'about', 'About Us');
    addKnown(getAdminLogoUrl(storeSettings.logoUrl), 'logo', 'Store logo');

    allProducts.forEach(product => {
        const productLabel = `Product · ${product.name || product.id || 'Untitled'}`;
        addKnown(product.imageUrl || product.image, 'product', productLabel, product.category || '');
        getImageUrlsFromValue(product.additionalImages).forEach(url => addKnown(url, 'product', productLabel, product.category || ''));
        addKnown(product.pdfImage, 'technical', `${productLabel} · Technical sheet`, product.category || '');
        (product.variants || []).forEach((variant, index) => {
            addKnown(variant.image, 'product', `${productLabel} · Variant ${index + 1}`, product.category || '');
        });
    });

    return [...known.values()].map(item => ({
        ...item,
        usages: [...item.usages],
        usedBy: [...item.usedBy],
        tags: [...item.tags]
    }));
}

async function syncKnownSiteImages() {
    const known = buildKnownSiteImages();
    if (!known.length) return false;
    const existingSnapshot = await getDocs(collection(db, IMAGE_LIBRARY_COLLECTION));
    const existingByUrl = new Map(existingSnapshot.docs.map(snapshot => [snapshot.data().url, snapshot]));
    const batch = writeBatch(db);
    let changed = false;

    known.forEach(item => {
        const existing = existingByUrl.get(item.url);
        if (!existing) {
            const reference = doc(collection(db, IMAGE_LIBRARY_COLLECTION));
            batch.set(reference, {
                name: item.name,
                provider: item.provider,
                url: item.url,
                thumbnailUrl: item.thumbnailUrl,
                usage: item.usages[0] || 'other',
                usages: item.usages,
                section: item.section,
                tags: item.tags,
                usedBy: item.usedBy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            changed = true;
            return;
        }

        const current = normalizeLibraryRecord(existing.id, existing.data());
        const mergedUsages = [...new Set([...(current.usages || []), ...item.usages])];
        const mergedUsedBy = [...new Set([...(current.usedBy || []), ...item.usedBy])];
        const needsUpdate = mergedUsages.length !== current.usages.length || mergedUsedBy.length !== current.usedBy.length;
        if (needsUpdate) {
            batch.update(existing.ref, {
                usages: mergedUsages,
                usedBy: mergedUsedBy,
                updatedAt: serverTimestamp()
            });
            changed = true;
        }
    });

    if (changed) await batch.commit();
    return changed;
}

function getLibraryUsageReferences(record) {
    if (!record?.url) return [];
    const references = [];
    const addReference = (condition, label) => {
        if (condition && !references.includes(label)) references.push(label);
    };
    (storeSettings.heroSlides || []).forEach((slide, index) => addReference(slide.image === record.url, `Hero slide ${index + 1}`));
    addReference(storeSettings.aboutImage === record.url, 'About Us');
    addReference(storeSettings.logoUrl === record.url, 'Store logo');
    allProducts.forEach(product => {
        const productLabel = product.name || product.id || 'Untitled product';
        addReference(product.imageUrl === record.url || product.image === record.url, `Product · ${productLabel}`);
        addReference(getImageUrlsFromValue(product.additionalImages).includes(record.url), `Product gallery · ${productLabel}`);
        addReference(product.pdfImage === record.url, `Technical sheet · ${productLabel}`);
        addReference((product.variants || []).some(variant => variant.image === record.url), `Product variant · ${productLabel}`);
    });
    return references;
}

function renderImageLibrary() {
    if (!imageLibraryList) return;
    const search = String(librarySearchInput?.value || '').trim().toLowerCase();
    const provider = libraryProviderFilter?.value || 'all';
    const usage = libraryUsageFilter?.value || 'all';
    const filtered = imageLibrary.filter(record => {
        const haystack = [record.name, record.url, record.provider, record.section, record.originalFileName, ...(record.tags || []), ...(record.usedBy || [])].join(' ').toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        const matchesProvider = provider === 'all' || record.provider === provider;
        const matchesUsage = usage === 'all' || record.usage === usage || (record.usages || []).includes(usage);
        return matchesSearch && matchesProvider && matchesUsage;
    });

    if (librarySummary) librarySummary.textContent = `${filtered.length} shown · ${imageLibrary.length} catalogued image${imageLibrary.length === 1 ? '' : 's'}`;
    if (!filtered.length) {
        imageLibraryList.innerHTML = '<p class="admin-empty-state">No images match the current filters.</p>';
        return;
    }

    imageLibraryList.innerHTML = filtered.map(record => {
        const usageText = (record.usages?.length ? record.usages : [record.usage]).map(item => libraryUsageLabels[item] || item).join(' · ');
        const usedByText = record.usedBy?.length ? record.usedBy.join(' · ') : 'No usage reference recorded';
        return `
            <details class="library-item" data-library-id="${libraryEscapeHtml(record.id)}">
                <summary class="library-item-summary">
                    <span class="library-thumb-wrap"><img src="${libraryEscapeHtml(record.thumbnailUrl || record.url)}" alt="${libraryEscapeHtml(record.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.classList.add('is-broken')"></span>
                    <span class="library-item-heading"><strong>${libraryEscapeHtml(record.name)}</strong><span>${libraryEscapeHtml(record.provider.toUpperCase())} · ${libraryEscapeHtml(usageText)}</span></span>
                    <span class="library-item-date">${libraryDateLabel(record.createdAt)}</span>
                </summary>
                <div class="library-item-details">
                    <div class="form-row library-edit-grid">
                        <label class="form-group"><span>Name</span><input class="form-input library-name-input" value="${libraryEscapeHtml(record.name)}" maxlength="100"></label>
                        <label class="form-group"><span>Usage</span><select class="form-input library-usage-input">${Object.entries(libraryUsageLabels).map(([key, label]) => `<option value="${key}" ${key === record.usage ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
                        <label class="form-group"><span>Section</span><input class="form-input library-section-input" value="${libraryEscapeHtml(record.section)}" maxlength="100"></label>
                    </div>
                    <label class="form-group"><span>Tags</span><input class="form-input library-tags-input" value="${libraryEscapeHtml((record.tags || []).join(', '))}" maxlength="180"></label>
                    <div class="library-url-row"><input class="form-input library-url-input" value="${libraryEscapeHtml(record.url)}" readonly aria-label="Image URL"><button type="button" class="admin-action-btn library-copy-btn" data-library-id="${libraryEscapeHtml(record.id)}">Copy URL</button></div>
                    <p class="admin-help-text">Used by: ${libraryEscapeHtml(usedByText)}</p>
                    <div class="admin-inline-actions library-item-actions"><button type="button" class="admin-action-btn edit-btn library-save-btn" data-library-id="${libraryEscapeHtml(record.id)}">Save metadata</button><button type="button" class="admin-action-btn admin-action-btn--danger library-delete-btn" data-library-id="${libraryEscapeHtml(record.id)}">Delete</button></div>
                </div>
            </details>
        `;
    }).join('');

    imageLibraryList.querySelectorAll('.library-copy-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const input = button.closest('.library-item-details')?.querySelector('.library-url-input');
            if (!input) return;
            try {
                await navigator.clipboard.writeText(input.value);
                showAdminMessage('Image URL copied to clipboard.');
            } catch (error) {
                input.select();
                document.execCommand('copy');
                showAdminMessage('Image URL copied to clipboard.');
            }
        });
    });

    imageLibraryList.querySelectorAll('.library-save-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const item = button.closest('.library-item');
            const record = imageLibrary.find(entry => entry.id === button.dataset.libraryId);
            if (!item || !record) return;
            const nextName = item.querySelector('.library-name-input')?.value.trim();
            const nextUsage = item.querySelector('.library-usage-input')?.value || 'other';
            const nextSection = item.querySelector('.library-section-input')?.value.trim() || '';
            const nextTags = item.querySelector('.library-tags-input')?.value.split(',').map(tag => tag.trim()).filter(Boolean) || [];
            if (!nextName) {
                showAdminMessage('Image name cannot be empty.', 'error');
                return;
            }
            button.disabled = true;
            try {
                const nextMetadata = { name: nextName, usage: nextUsage, usages: [nextUsage], section: nextSection, tags: nextTags, updatedAt: new Date().toISOString() };
                if (String(record.id).startsWith('local-')) {
                    const pending = readLocalLibraryRecords().map(item => item.id === record.id ? { ...item, ...nextMetadata } : item);
                    writeLocalLibraryRecords(pending);
                } else {
                    await updateDoc(doc(db, IMAGE_LIBRARY_COLLECTION, record.id), { ...nextMetadata, updatedAt: serverTimestamp() });
                }
                await loadImageLibrary();
                showAdminMessage(String(record.id).startsWith('local-') ? 'Image metadata saved locally and is waiting for Firestore rules.' : 'Image metadata saved.');
            } catch (error) {
                console.error('Unable to save image metadata:', error);
                showAdminMessage('Could not save image metadata.', 'error');
            } finally {
                button.disabled = false;
            }
        });
    });

    imageLibraryList.querySelectorAll('.library-delete-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const record = imageLibrary.find(entry => entry.id === button.dataset.libraryId);
            if (!record) return;
            const references = getLibraryUsageReferences(record);
            if (references.length) {
                showAdminMessage(`This image is still used by: ${references.join(', ')}. Update those references first.`, 'error');
                return;
            }
            if (!confirm(`Delete the catalog record for ${record.name}? The remote image will not be deleted automatically.`)) return;
            button.disabled = true;
            try {
                if (String(record.id).startsWith('local-')) {
                    removeLocalLibraryRecord(record.id);
                } else {
                    await deleteDoc(doc(db, IMAGE_LIBRARY_COLLECTION, record.id));
                }
                await loadImageLibrary();
                showAdminMessage('Image catalog record deleted. The remote image was kept safely.');
            } catch (error) {
                console.error('Unable to delete image metadata:', error);
                showAdminMessage('Could not delete image metadata.', 'error');
                button.disabled = false;
            }
        });
    });
}

async function loadImageLibrary() {
    if (!imageLibraryList) return;
    if (librarySummary) librarySummary.textContent = 'Synchronizing site image references...';
    const known = buildKnownSiteImages();
    const pending = readLocalLibraryRecords();
    try {
        const changed = await syncKnownSiteImages();
        const snapshot = await getDocs(collection(db, IMAGE_LIBRARY_COLLECTION));
        const cloudRecords = snapshot.docs.map(item => normalizeLibraryRecord(item.id, item.data()));
        imageLibrary = mergeLibraryRecords(cloudRecords, pending, known);
        renderImageLibrary();
        if (librarySummary) librarySummary.textContent = `${imageLibrary.length} catalogued images synchronized from site references.`;
        if (changed && pending.length) librarySummary.textContent += ' Pending local metadata is shown until it is synchronized.';
    } catch (error) {
        console.error('Unable to load image library from Firestore:', error);
        imageLibrary = mergeLibraryRecords(pending, known);
        renderImageLibrary();
        if (librarySummary) librarySummary.textContent = imageLibrary.length
            ? `${imageLibrary.length} images shown locally · Firestore sync is waiting for the imageLibrary rule.`
            : 'Image library is waiting for the Firestore imageLibrary rule.';
    }
}

function resetLibraryUploadForm() {
    if (libraryImageFile) libraryImageFile.value = '';
    if (libraryImageName) libraryImageName.value = '';
    if (libraryImageUsage) libraryImageUsage.value = 'other';
    if (libraryImageSection) libraryImageSection.value = '';
    if (libraryImageTags) libraryImageTags.value = '';
    if (libraryUploadStatus) libraryUploadStatus.textContent = '';
    if (libraryUploadPanel) libraryUploadPanel.hidden = true;
}

async function uploadLibraryFileToImgBB(file) {
    const imgbbSource = imageApiSources.find(source => source.provider === 'imgbb' && source.enabled !== false);
    const apiKey = imgbbSource?.apiKey || '';
    if (!apiKey) throw new Error('IMG_BB_KEY_MISSING');
    if (!file || !file.type.startsWith('image/')) throw new Error('IMAGE_FILE_REQUIRED');
    if (file.size > LIBRARY_MAX_UPLOAD_BYTES) throw new Error('IMAGE_FILE_TOO_LARGE');
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok || !data.success || !data.data?.url) throw new Error(data.error?.message || 'IMGBB_UPLOAD_FAILED');
    return data.data;
}

refreshImageLibraryBtn?.addEventListener('click', loadImageLibrary);
toggleLibraryUploadBtn?.addEventListener('click', () => {
    if (!libraryUploadPanel) return;
    libraryUploadPanel.hidden = !libraryUploadPanel.hidden;
    if (!libraryUploadPanel.hidden) libraryImageFile?.focus({ preventScroll: true });
});
cancelLibraryUploadBtn?.addEventListener('click', resetLibraryUploadForm);
[librarySearchInput, libraryProviderFilter, libraryUsageFilter].forEach(input => input?.addEventListener('input', renderImageLibrary));
[libraryProviderFilter, libraryUsageFilter].forEach(input => input?.addEventListener('change', renderImageLibrary));

uploadLibraryImageBtn?.addEventListener('click', async () => {
    const file = libraryImageFile?.files?.[0];
    if (!file) {
        showAdminMessage('Choose an image file first.', 'error');
        return;
    }
    const name = libraryImageName?.value.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    const usage = libraryImageUsage?.value || 'other';
    const section = libraryImageSection?.value.trim() || '';
    const tags = libraryImageTags?.value.split(',').map(tag => tag.trim()).filter(Boolean) || [];
    uploadLibraryImageBtn.disabled = true;
    if (libraryUploadStatus) libraryUploadStatus.textContent = 'Uploading to ImgBB and saving metadata...';
    try {
        const data = await uploadLibraryFileToImgBB(file);
        const record = {
            name: name.slice(0, 100),
            provider: 'imgbb',
            url: data.url,
            thumbnailUrl: data.thumb?.url || data.url,
            deleteUrl: data.delete_url || '',
            usage,
            usages: [usage],
            section: section.slice(0, 100),
            tags,
            usedBy: [],
            originalFileName: file.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        try {
            const reference = await addDoc(collection(db, IMAGE_LIBRARY_COLLECTION), { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            removeLocalLibraryRecord(`local-${record.url}`);
            record.id = reference.id;
            await loadImageLibrary();
            resetLibraryUploadForm();
            showAdminMessage('Image uploaded to ImgBB and added to the library.');
        } catch (metadataError) {
            console.warn('ImgBB upload succeeded but Firestore metadata is pending:', metadataError);
            record.id = `local-${record.url}`;
            saveLocalLibraryRecord(record);
            imageLibrary = mergeLibraryRecords(readLocalLibraryRecords(), buildKnownSiteImages());
            renderImageLibrary();
            resetLibraryUploadForm();
            showAdminMessage('Image uploaded to ImgBB. Metadata is saved locally until the Firestore imageLibrary rule is published.', 'warning');
        }
    } catch (error) {
        console.error('Image Library upload error:', error);
        const message = error.message === 'IMG_BB_KEY_MISSING'
            ? 'Add and save an ImgBB API source in Settings before uploading.'
            : error.message === 'IMAGE_FILE_TOO_LARGE'
                ? 'Please choose an image smaller than 20 MB.'
                : error.message === 'IMAGE_FILE_REQUIRED'
                    ? 'Please choose a valid image file.'
                    : `Image upload failed: ${error.message || 'Unknown error'}`;
        if (libraryUploadStatus) libraryUploadStatus.textContent = message;
        showAdminMessage(message, 'error');
    } finally {
        uploadLibraryImageBtn.disabled = false;
    }
    });

function maskApiKey(value = '') {
    if (!value) return 'Not configured';
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function providerLabel(provider) {
    return {
        imgbb: 'ImgBB API',
        cloudinary: 'Cloudinary API',
        pixeldrain: 'Pixeldrain API',
        direct: 'Direct Link (Manual)'
    }[provider] || provider;
}

function renderImageApiSourcesList() {
    if (!imageApiSourcesList) return;
    if (!imageApiSources.length) {
        imageApiSourcesList.innerHTML = '<p class="admin-empty-state">No image source saved yet. Add one to enable uploads.</p>';
        return;
    }
    imageApiSourcesList.innerHTML = imageApiSources.map((source, index) => `
        <div class="api-source-row ${source.enabled === false ? 'is-disabled' : ''}">
            <div class="api-source-summary">
                <strong>${providerLabel(source.provider)}</strong>
                <span>${source.enabled === false ? 'Disabled' : 'Ready'} · ${maskApiKey(source.apiKey)}</span>
            </div>
            <div class="admin-inline-actions">
                <button type="button" class="admin-action-btn edit-btn api-edit-source-btn" data-index="${index}">Edit</button>
                <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn api-remove-source-btn" data-index="${index}">Delete</button>
            </div>
        </div>
    `).join('');
    imageApiSourcesList.querySelectorAll('.api-edit-source-btn').forEach(button => {
        button.addEventListener('click', () => openImageApiEditor(Number(button.dataset.index)));
    });
    imageApiSourcesList.querySelectorAll('.api-remove-source-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const index = Number(button.dataset.index);
            if (!confirm('Delete this image source?')) return;
            imageApiSources.splice(index, 1);
            if (!(await savePrivateImageSources())) return;
            if (await saveStoreSettings()) renderImageApiSourcesList();
        });
    });
}

function setImageApiEditorMode(isEditing) {
    imageApiEditing = Boolean(isEditing);
    if (imageApiKeyInput) {
        imageApiKeyInput.readOnly = !imageApiEditing;
        imageApiKeyInput.type = imageApiEditing ? 'text' : 'password';
    }
    if (imageProviderSelect) imageProviderSelect.disabled = !imageApiEditing;
    if (editImageApiBtn) editImageApiBtn.hidden = imageApiEditing || imageApiEditingIndex < 0;
    if (saveImageApiBtn) saveImageApiBtn.hidden = !imageApiEditing;
    if (cancelImageApiBtn) cancelImageApiBtn.hidden = !imageApiEditing;
}

function openImageApiEditor(index = -1) {
    imageApiEditingIndex = index;
    if (!imageApiEditor) return;
    imageApiEditor.hidden = false;
    const source = imageApiSources[index] || { provider: 'imgbb', apiKey: '' };
    if (imageApiSourceIndex) imageApiSourceIndex.value = String(index);
    if (imageProviderSelect) imageProviderSelect.value = source.provider || 'imgbb';
    if (imageApiKeyInput) imageApiKeyInput.value = source.apiKey || '';
    setImageApiEditorMode(index < 0);
    updateImageApiKeyVisibility();
    if (index >= 0) imageApiKeyInput?.focus({ preventScroll: true });
}

function closeImageApiEditor() {
    imageApiEditingIndex = -1;
    imageApiEditing = false;
    if (imageApiEditor) imageApiEditor.hidden = true;
    if (imageApiKeyInput) {
        imageApiKeyInput.value = '';
        imageApiKeyInput.readOnly = true;
        imageApiKeyInput.type = 'password';
    }
    if (imageProviderSelect) imageProviderSelect.disabled = false;
}

function updateImageApiKeyVisibility() {
    const isDirect = imageProviderSelect?.value === 'direct';
    const apiKeyGroup = document.getElementById('api-key-group');
    if (apiKeyGroup) apiKeyGroup.hidden = isDirect;
    if (imageApiKeyInput && !isDirect) imageApiKeyInput.placeholder = `Enter your ${imageProviderSelect?.value || 'provider'} API key`;
}

addImageApiBtn?.addEventListener('click', () => openImageApiEditor(-1));
editImageApiBtn?.addEventListener('click', () => setImageApiEditorMode(true));
imageProviderSelect?.addEventListener('change', updateImageApiKeyVisibility);
cancelImageApiBtn?.addEventListener('click', closeImageApiEditor);
saveImageApiBtn?.addEventListener('click', async () => {
    const provider = imageProviderSelect?.value || 'imgbb';
    const apiKey = imageApiKeyInput?.value.trim() || '';
    if (provider !== 'direct' && !apiKey) {
        showAdminMessage('Please enter an API key before saving.', 'error');
        return;
    }
    const source = { provider, apiKey, label: providerLabel(provider), enabled: true };
    if (imageApiEditingIndex >= 0) imageApiSources[imageApiEditingIndex] = source;
    else imageApiSources.push(source);
    if (!(await savePrivateImageSources())) return;
    if (await saveStoreSettings()) {
        renderImageApiSourcesList();
        closeImageApiEditor();
        showAdminMessage('Image source saved to private admin storage.');
    }
});

// ============================================
// Hero Slides Management Logic
// ============================================
const heroSlideImage = document.getElementById('hero-slide-image');
const heroSlideDesktopImage = document.getElementById('hero-slide-desktop-image');
const heroSlideMobileImage = document.getElementById('hero-slide-mobile-image');
const heroSlideTitle = document.getElementById('hero-slide-title');
const heroSlideSubtitle = document.getElementById('hero-slide-subtitle');
const heroSlideBtnText = document.getElementById('hero-slide-btn-text');
const heroSlideLinkType = document.getElementById('hero-slide-link-type');
const heroSlideBtnUrl = document.getElementById('hero-slide-btn-url');
const heroSlideSvgIcon = document.getElementById('hero-slide-svg-icon');
const saveHeroSlideBtn = document.getElementById('save-hero-slide-btn');
const cancelHeroEditBtn = document.getElementById('cancel-hero-edit-btn');
const editingHeroIndexInput = document.getElementById('editing-hero-index');
const heroSlidesList = document.getElementById('hero-slides-list');
const heroFormTitle = document.getElementById('hero-form-title');
const heroExternalUrl = document.getElementById('hero-slide-external-url');
const heroExternalUrlGroup = document.getElementById('hero-external-url-group');

/**
 * Builds the Hero destination list from the same category source used by the
 * admin category managers. Values are real storefront URLs, not display names,
 * so renamed categories are refreshed before the next save.
 */
function getHeroDestinationOptions() {
    const options = [
        { value: 'index.html#hero-slider-container', label: 'Overview' },
        { value: 'index.html#products-grid', label: 'All Products' },
        { value: 'index.html#about-section', label: 'About Us' },
        { value: 'index.html#contact-section', label: 'Contact' }
    ];
    const seen = new Set();

    // Keep the first occurrence of the shared All Products destination.
    const uniqueOptions = [];
    options.forEach(option => {
        if (!seen.has(option.value)) {
            seen.add(option.value);
            uniqueOptions.push(option);
        }
    });

    const categories = Array.isArray(allCategories) ? allCategories : [];
    const grouped = [
        { type: 'overview', label: 'Overview', items: categories.filter(cat => cat.type === 'overview') },
        { type: 'products', label: 'Products', items: categories.filter(cat => cat.type !== 'overview') }
    ];

    grouped.forEach(group => {
        group.items
            .slice()
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name)))
            .forEach(category => {
                const categoryUrl = `index.html?category=${encodeURIComponent(category.name)}&type=${encodeURIComponent(group.type)}`;
                if (!seen.has(categoryUrl)) {
                    seen.add(categoryUrl);
                    uniqueOptions.push({ value: categoryUrl, label: `${group.label} · ${category.name}` });
                }

                (category.subcategories || []).forEach(subcategory => {
                    const subcategoryUrl = `index.html?category=${encodeURIComponent(subcategory)}&type=${encodeURIComponent(group.type)}`;
                    if (!seen.has(subcategoryUrl)) {
                        seen.add(subcategoryUrl);
                        uniqueOptions.push({ value: subcategoryUrl, label: `${group.label} · ${category.name} → ${subcategory}` });
                    }
                });
            });
    });

    return uniqueOptions;
}

function refreshHeroDestinationOptions(selectedValue = heroSlideBtnUrl?.value || '') {
    if (!heroSlideBtnUrl) return;
    const options = getHeroDestinationOptions();
    heroSlideBtnUrl.innerHTML = options.map(option =>
        `<option value="${option.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${option.label}</option>`
    ).join('');

    const hasSelectedValue = options.some(option => option.value === selectedValue);
    if (hasSelectedValue) {
        heroSlideBtnUrl.value = selectedValue;
    } else if (selectedValue && /^index\.html(?:\?|#)/.test(selectedValue)) {
        // Preserve a legacy/custom internal URL until the administrator edits it.
        const legacyOption = document.createElement('option');
        legacyOption.value = selectedValue;
        legacyOption.textContent = `Current saved destination · ${selectedValue}`;
        heroSlideBtnUrl.appendChild(legacyOption);
        heroSlideBtnUrl.value = selectedValue;
    } else {
        heroSlideBtnUrl.value = options[0]?.value || '';
    }
}

function updateHeroDestinationMode() {
    const isExternal = heroSlideLinkType?.value === 'external';
    if (heroExternalUrlGroup) heroExternalUrlGroup.style.display = isExternal ? 'block' : 'none';
    if (heroSlideBtnUrl) {
        heroSlideBtnUrl.disabled = isExternal;
        heroSlideBtnUrl.setAttribute('aria-hidden', String(isExternal));
    }
    if (heroExternalUrl) heroExternalUrl.disabled = !isExternal;
}

function getSavedHeroDestination(slide) {
    if (!slide) return { linkType: 'section', internalUrl: 'index.html#hero-slider-container', externalUrl: '' };
    if (slide.linkType === 'external') {
        return { linkType: 'external', internalUrl: '', externalUrl: slide.btnUrl || '' };
    }
    if (slide.linkType === 'all') {
        return { linkType: 'section', internalUrl: 'index.html#products-grid', externalUrl: '' };
    }
    if (slide.linkType === 'category' && slide.btnUrl && !/^index\.html(?:\?|#)/.test(slide.btnUrl)) {
        const matchingCategory = (Array.isArray(allCategories) ? allCategories : []).find(cat =>
            cat.name === slide.btnUrl || (cat.subcategories || []).includes(slide.btnUrl)
        );
        const type = matchingCategory?.type === 'overview' ? 'overview' : 'products';
        return {
            linkType: 'section',
            internalUrl: `index.html?category=${encodeURIComponent(slide.btnUrl)}&type=${type}`,
            externalUrl: ''
        };
    }
    return { linkType: 'section', internalUrl: slide.btnUrl || 'index.html#products-grid', externalUrl: '' };
}

heroSlideLinkType?.addEventListener('change', updateHeroDestinationMode);
refreshHeroDestinationOptions();
updateHeroDestinationMode();

function renderHeroSlidesList(slides) {
    if (!heroSlidesList) return;
    if (!slides || slides.length === 0) {
        heroSlidesList.innerHTML = '<p style="color:#6b6b6b; font-size:14px;">No hero slides added yet.</p>';
        return;
    }

    let html = '';
    slides.forEach((slide, index) => {
        html += `
            <div class="admin-item-row" style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:#fff; border:1px solid var(--border-color, #e0e0e0); border-radius:8px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <picture>
                        ${slide.mobileImage ? `<source media="(max-width: 767px)" srcset="${slide.mobileImage}">` : ''}
                        <img src="${slide.desktopImage || slide.image}" alt="Slide" style="width:60px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='https://via.placeholder.com/60x40?text=No+Img'">
                    </picture>
                    <div>
                        <h4 style="margin:0; font-size:14px; font-weight:600;">${slide.title || 'Untitled Slide'}</h4>
                        <p style="margin:2px 0 0; font-size:12px; color:#6b6b6b;">Sub: ${slide.subtitle || '—'} | Btn: ${slide.btnText || '—'} (${slide.linkType || 'category'})</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" class="admin-action-btn edit-btn edit-hero-btn" data-index="${index}">Edit</button>
                    <button type="button" class="admin-action-btn admin-action-btn--danger delete-btn delete-hero-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `;
    });
    heroSlidesList.innerHTML = html;

    // Attach event listeners
    heroSlidesList.querySelectorAll('.edit-hero-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const slide = storeSettings.heroSlides[index];
            if (!slide) return;

            editingHeroIndexInput.value = index;
            if (heroFormTitle) heroFormTitle.textContent = `Edit Hero Slide #${index + 1}`;
            if (heroSlideImage) heroSlideImage.value = slide.image || slide.desktopImage || slide.mobileImage || '';
            if (heroSlideDesktopImage) heroSlideDesktopImage.value = slide.desktopImage || slide.image || '';
            if (heroSlideMobileImage) heroSlideMobileImage.value = slide.mobileImage || '';
            if (heroSlideTitle) heroSlideTitle.value = slide.title || '';
            if (heroSlideSubtitle) heroSlideSubtitle.value = slide.subtitle || '';
            if (heroSlideBtnText) heroSlideBtnText.value = slide.btnText || '';
            const destination = getSavedHeroDestination(slide);
            if (heroSlideLinkType) heroSlideLinkType.value = destination.linkType;
            refreshHeroDestinationOptions(destination.internalUrl);
            if (heroExternalUrl) heroExternalUrl.value = destination.externalUrl;
            updateHeroDestinationMode();
            if (heroSlideSvgIcon) heroSlideSvgIcon.value = slide.svgIcon || '';
            if (cancelHeroEditBtn) cancelHeroEditBtn.style.display = 'inline-block';

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    heroSlidesList.querySelectorAll('.delete-hero-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const index = parseInt(this.dataset.index);
            if (!confirm('Are you sure you want to delete this hero slide?')) return;
            if (!storeSettings.heroSlides) storeSettings.heroSlides = [];
            storeSettings.heroSlides.splice(index, 1);
            if (await saveStoreSettings()) {
                renderHeroSlidesList(storeSettings.heroSlides);
                showAdminMessage('Slide deleted successfully.');
            }
        });
    });
}

/**
 * دالة عامة لرفع الصور إلى ImgBB API
 */
async function uploadToImgBB(file, buttonElement, inputElement) {
    if (!file) return;

    const imgbbSource = imageApiSources.find(source => source.provider === 'imgbb' && source.enabled !== false);
    const apiKey = imgbbSource?.apiKey || '';
    if (!apiKey) {
        showAdminMessage('Add and save an ImgBB API source in Settings before uploading images.', 'error');
        return;
    }
    const formData = new FormData();
    formData.append('image', file);

    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Uploading...';
    buttonElement.disabled = true;

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success && data.data && data.data.url) {
            if (inputElement) inputElement.value = data.data.url;
            // إطلاق حدث تغيير يدوي لتحديث المعاينة إذا لزم الأمر
            inputElement.dispatchEvent(new Event('input'));
            showAdminMessage('Image uploaded successfully!');
        } else {
            showAdminMessage('Upload failed: ' + (data.error?.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Upload error:', err);
        showAdminMessage('Network error during upload.');
    } finally {
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
    }
}

// ربط رفع صور Hero: fallback وdesktop وmobile
const uploadHeroImgBtn = document.getElementById('upload-hero-img-btn');
const heroImageFile = document.getElementById('hero-image-file');
const uploadHeroDesktopBtn = document.getElementById('upload-hero-desktop-btn');
const heroDesktopImageFile = document.getElementById('hero-desktop-image-file');
const uploadHeroMobileBtn = document.getElementById('upload-hero-mobile-btn');
const heroMobileImageFile = document.getElementById('hero-mobile-image-file');

uploadHeroImgBtn?.addEventListener('click', () => heroImageFile?.click());
heroImageFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadHeroImgBtn, heroSlideImage);
});
uploadHeroDesktopBtn?.addEventListener('click', () => heroDesktopImageFile?.click());
heroDesktopImageFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadHeroDesktopBtn, heroSlideDesktopImage);
});
uploadHeroMobileBtn?.addEventListener('click', () => heroMobileImageFile?.click());
heroMobileImageFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadHeroMobileBtn, heroSlideMobileImage);
});

// 2. ربط رفع صورة المنتج الرئيسية
const uploadProductMainBtn = document.getElementById('upload-product-main-btn');
const productMainFile = document.getElementById('product-main-file');
uploadProductMainBtn?.addEventListener('click', () => productMainFile?.click());
productMainFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadProductMainBtn, document.getElementById('product-main-image'));
});

// 3. ربط رفع صور المنتج الإضافية (دعم العناصر الديناميكية)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('upload-additional-btn')) {
        const fileInput = e.target.nextElementSibling;
        fileInput?.click();
    }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('additional-image-file')) {
        const textInput = e.target.previousElementSibling.previousElementSibling;
        const button = e.target.previousElementSibling;
        uploadToImgBB(e.target.files[0], button, textInput);
    }
});

// 4. ربط رفع الشعار (Logo)
const uploadLogoBtn = document.getElementById('upload-logo-btn');
const logoFile = document.getElementById('logo-file');
uploadLogoBtn?.addEventListener('click', () => logoFile?.click());
logoFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadLogoBtn, document.getElementById('logo-url'));
});

saveHeroSlideBtn?.addEventListener('click', async function() {
    const image = heroSlideImage?.value.trim();
    const desktopImage = heroSlideDesktopImage?.value.trim() || '';
    const mobileImage = heroSlideMobileImage?.value.trim() || '';
    const fallbackImage = image || desktopImage || mobileImage;
    if (!fallbackImage) {
        showAdminMessage('Please provide at least one Hero image URL.');
        return;
    }

    const slideData = {
        image: fallbackImage,
        desktopImage: desktopImage || fallbackImage,
        mobileImage: mobileImage || '',
        title: heroSlideTitle?.value.trim() || '',
        subtitle: heroSlideSubtitle?.value.trim() || '',
        btnText: heroSlideBtnText?.value.trim() || '',
        linkType: heroSlideLinkType?.value || 'section',
        btnUrl: heroSlideLinkType?.value === 'external'
            ? (heroExternalUrl?.value.trim() || '')
            : (heroSlideBtnUrl?.value || ''),
        svgIcon: heroSlideSvgIcon?.value.trim() || ''
    };

    if (!storeSettings.heroSlides) storeSettings.heroSlides = [];
    const editingIndex = parseInt(editingHeroIndexInput?.value ?? '-1');

    if (editingIndex >= 0) {
        storeSettings.heroSlides[editingIndex] = slideData;
    } else {
        storeSettings.heroSlides.push(slideData);
    }

    if (await saveStoreSettings()) {
        renderHeroSlidesList(storeSettings.heroSlides);
        resetHeroForm();
        showAdminMessage('Hero slide saved successfully.');
    }
});

cancelHeroEditBtn?.addEventListener('click', function() {
    resetHeroForm();
});

function resetHeroForm() {
    if (editingHeroIndexInput) editingHeroIndexInput.value = '-1';
    if (heroFormTitle) heroFormTitle.textContent = 'Add New Hero Slide';
    if (heroSlideImage) heroSlideImage.value = '';
    if (heroSlideDesktopImage) heroSlideDesktopImage.value = '';
    if (heroSlideMobileImage) heroSlideMobileImage.value = '';
    if (heroSlideTitle) heroSlideTitle.value = '';
    if (heroSlideSubtitle) heroSlideSubtitle.value = '';
    if (heroSlideBtnText) heroSlideBtnText.value = '';
    if (heroSlideLinkType) heroSlideLinkType.value = 'section';
    refreshHeroDestinationOptions();
    if (heroExternalUrl) heroExternalUrl.value = '';
    if (heroSlideSvgIcon) heroSlideSvgIcon.value = '';
    updateHeroDestinationMode();
    if (cancelHeroEditBtn) cancelHeroEditBtn.style.display = 'none';
}

// ============================================
// 11. لوحة المعلومات (Dashboard)
// ============================================

function updateCategoryStats() {
    const productCats = allCategories.filter(c => c.type !== 'overview');
    const overviewCats = allCategories.filter(c => c.type === 'overview');
    if (statCategories) {
        statCategories.textContent = productCats.length;
    }
    if (statCategoriesOverview) {
        statCategoriesOverview.textContent = overviewCats.length;
    }
}

function updateProductStats() {
    if (statProducts) {
        statProducts.textContent = allProducts.length;
    }
}

async function loadDashboardData() {
    updateCategoryStats();
    updateProductStats();
    updateOrderStats();

    if (recentOrdersList) {
        const recent = allOrders.slice(0, 5);
        if (recent.length === 0) {
            recentOrdersList.innerHTML = '<p style="color:#6b6b6b; font-size:14px;">No recent orders.</p>';
        } else {
            let html = '<div style="margin-top:12px;"><h4 style="font-family:var(--font-mono); font-size:14px; margin-bottom:8px;">Recent Orders</h4>';
            recent.forEach(order => {
                const date = order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'N/A';
                html += `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e0d8; font-size:14px;">
                        <span>${order.customerName || 'N/A'}</span>
                        <span style="color:#4E1A1D; font-weight:600;">${order.total || 0} DZD</span>
                        <span style="color:#6b6b6b; font-size:12px;">${date}</span>
                    </div>
                `;
            });
            html += '</div>';
            recentOrdersList.innerHTML = html;
        }
    }
}

// ============================================
// 11. Tiddis API & Data Service (معيارية متطورة مستوحاة من AFAK)
// ============================================
const TiddisAPI = {
    async getProducts() {
        try {
            const snap = await getDocs(collection(db, 'products'));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('API Error [getProducts]:', e);
            return [];
        }
    },
    async saveProduct(id, data) {
        if (id) {
            await updateDoc(doc(db, 'products', id), data);
            return id;
        } else {
            data.createdAt = new Date().toISOString();
            const ref = await addDoc(collection(db, 'products'), data);
            return ref.id;
        }
    },
    async deleteProduct(id) {
        await deleteDoc(doc(db, 'products', id));
        return true;
    },
    async getCategories() {
        try {
            const snap = await getDocs(collection(db, 'categories'));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('API Error [getCategories]:', e);
            return [];
        }
    }
};

// جعل الـ API متاحاً عالمياً للتصحيح والاستخدام
window.TiddisAPI = TiddisAPI;

// ============================================
// 12. التحميل الأولي
// ============================================

async function initAdmin() {
    try {
        await loadCategories();
        await loadOverviewCategories();
        await loadAttributes();
        await loadCatalogExperience();
        await loadProducts();
        await loadDeliveryRates();
        await loadOrders();
        await loadSettings();
        await loadImageLibrary();
        await initTiddisAdminEnhancements();

        updateCategoryStats();
        updateProductStats();
        updateOrderStats();

        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                if (key === 'dashboard') {
                    sections[key].classList.add('active');
                } else {
                    sections[key].classList.remove('active');
                }
            }
        });

        console.log('✅ TIDDIS TAPIS Admin Panel initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
        throw error; // إعادة الرمي ليتم التقاطه في admin-auth.js
    }
}

export { initAdmin };


// ============================================
// 13. Governance, analytics, backups and operations
// ============================================
const TIDDIS_ADMIN_ENHANCEMENTS_KEY = 'tiddis-admin-enhancements-v1';
let adminEnhancementsReady = false;

function adminEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function currentAdminRole() {
    return String(sessionStorage.getItem('tiddisAdminRole') || 'admin').toLowerCase();
}

async function logAdminActivity(action, entity, entityId = '', detail = '') {
    const actor = auth.currentUser;
    const payload = {
        actorUid: actor?.uid || 'unknown',
        actorEmail: actor?.email || sessionStorage.getItem('tiddisAdminEmail') || '',
        role: currentAdminRole(),
        action: String(action).slice(0, 80),
        entity: String(entity).slice(0, 80),
        entityId: String(entityId).slice(0, 120),
        detail: String(detail).slice(0, 500),
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, 'activityLog'), payload);
    } catch (error) {
        const local = JSON.parse(localStorage.getItem('tiddisActivityFallback') || '[]');
        local.unshift({ ...payload, createdAt: new Date().toISOString() });
        localStorage.setItem('tiddisActivityFallback', JSON.stringify(local.slice(0, 100)));
        console.warn('Activity log could not be written to Firestore:', error);
    }
}

async function loadActivityLog() {
    const target = document.getElementById('activity-log-list');
    if (!target) return;
    try {
        const snap = await getDocs(collection(db, 'activityLog'));
        const items = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        const fallback = JSON.parse(localStorage.getItem('tiddisActivityFallback') || '[]');
        const merged = [...items, ...fallback].sort((a, b) => String(b.createdAt?.toDate?.() || b.createdAt || '').localeCompare(String(a.createdAt?.toDate?.() || a.createdAt || ''))).slice(0, 80);
        target.innerHTML = merged.length ? merged.map(item => {
            const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || Date.now());
            return `<div class="activity-log-row"><div><strong>${adminEscape(item.action)}</strong><span>${adminEscape(item.entity)} ${adminEscape(item.entityId)}</span></div><div><span>${adminEscape(item.actorEmail || 'Unknown actor')}</span><time datetime="${date.toISOString()}">${date.toLocaleString()}</time></div></div>`;
        }).join('') : '<p class="admin-empty-state">No activity recorded yet.</p>';
    } catch (error) {
        const fallback = JSON.parse(localStorage.getItem('tiddisActivityFallback') || '[]');
        target.innerHTML = fallback.length ? fallback.map(item => `<div class="activity-log-row"><div><strong>${adminEscape(item.action)}</strong><span>${adminEscape(item.entity)}</span></div><div><span>Local fallback</span><time>${new Date(item.createdAt).toLocaleString()}</time></div></div>`).join('') : '<p class="admin-empty-state">Activity log is waiting for the Firestore rule to be published.</p>';
    }
}

function renderOperationalInsights() {
    const chart = document.getElementById('orders-status-chart');
    const health = document.getElementById('catalog-health-summary');
    const statuses = ['pending', 'processing', 'contacted', 'completed', 'cancelled'];
    const labels = { pending: 'Pending', processing: 'Processing', contacted: 'Contacted', completed: 'Completed', cancelled: 'Cancelled' };
    const counts = statuses.map(status => ({ status, count: allOrders.filter(order => String(order.status || 'pending').toLowerCase() === status).length }));
    if (chart) {
        const max = Math.max(1, ...counts.map(item => item.count));
        chart.innerHTML = counts.map(item => `<div class="status-bar-row"><span>${labels[item.status]}</span><div class="status-bar-track"><i style="width:${Math.round((item.count / max) * 100)}%"></i></div><strong>${item.count}</strong></div>`).join('');
    }
    if (health) {
        const published = allProducts.filter(product => product.status !== 'draft' && product.status !== 'archived' && (!product.publishAt || new Date(product.publishAt) <= new Date())).length;
        const draft = allProducts.filter(product => product.status === 'draft').length;
        const archived = allProducts.filter(product => product.status === 'archived').length;
        health.innerHTML = `<div class="health-stat"><span>Visible now</span><strong>${published}</strong></div><div class="health-stat"><span>Draft</span><strong>${draft}</strong></div><div class="health-stat"><span>Archived</span><strong>${archived}</strong></div>`;
    }
    const publishedEl = document.getElementById('stat-published-products');
    const weekEl = document.getElementById('stat-orders-week');
    if (publishedEl) publishedEl.textContent = String(allProducts.filter(product => product.status !== 'draft' && product.status !== 'archived' && (!product.publishAt || new Date(product.publishAt) <= new Date())).length);
    if (weekEl) {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        weekEl.textContent = String(allOrders.filter(order => { const d = order.timestamp?.toDate ? order.timestamp.toDate().getTime() : Date.parse(order.timestamp || ''); return Number.isFinite(d) && d >= weekAgo; }).length);
    }
}

function enforceAdminRolePresentation() {
    const role = currentAdminRole();
    document.documentElement.dataset.adminRole = role;
    document.querySelectorAll('[data-required-role]').forEach(element => {
        const required = String(element.dataset.requiredRole || 'admin').toLowerCase();
        const allowed = role === 'admin' || role === required;
        element.hidden = !allowed;
        element.setAttribute('aria-hidden', String(!allowed));
    });
    const roleBadge = document.getElementById('admin-role-badge');
    if (roleBadge) roleBadge.textContent = role.toUpperCase();
}

function setupProductImageDragDrop() {
    const container = document.getElementById('additional-images-container');
    if (!container || container.dataset.dragReady === 'true') return;
    container.dataset.dragReady = 'true';
    container.addEventListener('dragstart', event => {
        const row = event.target.closest('.image-upload-row');
        if (!row) return;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
    });
    container.addEventListener('dragend', event => event.target.closest('.image-upload-row')?.classList.remove('is-dragging'));
    container.addEventListener('dragover', event => {
        event.preventDefault();
        const dragging = container.querySelector('.is-dragging');
        const target = event.target.closest('.image-upload-row');
        if (!dragging || !target || dragging === target) return;
        const rect = target.getBoundingClientRect();
        target.parentElement.insertBefore(dragging, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
    });
    container.querySelectorAll('.image-upload-row').forEach(row => row.setAttribute('draggable', 'true'));
    new MutationObserver(() => container.querySelectorAll('.image-upload-row').forEach(row => row.setAttribute('draggable', 'true'))).observe(container, { childList: true });
}

function setupHeroContrastAnalyzer() {
    const button = document.getElementById('analyze-hero-text-color-btn');
    const imageInput = document.getElementById('hero-slide-image');
    const colorInput = document.getElementById('hero-text-color');
    const result = document.getElementById('hero-text-analysis-result');
    if (!button || button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', () => {
        const src = imageInput?.value.trim();
        if (!src) { if (result) result.textContent = 'Add an image URL first.'; return; }
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 16; canvas.height = 16;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, 16, 16);
                const pixels = ctx.getImageData(0, 0, 16, 16).data;
                let luminance = 0; let count = 0;
                for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] < 20) continue; const r = pixels[i] / 255; const g = pixels[i + 1] / 255; const b = pixels[i + 2] / 255; const convert = value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; luminance += 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b); count++; }
                const average = count ? luminance / count : 0.5;
                const suggested = average > 0.48 ? '#241f20' : '#ffffff';
                if (colorInput) colorInput.value = suggested;
                if (result) result.innerHTML = `<span class="contrast-swatch" style="background:${suggested}"></span> Suggested ${suggested} based on sampled image luminance. You can override it.`;
            } catch (error) { if (result) result.textContent = 'The image blocked pixel sampling. Choose the text color manually.'; }
        };
        image.onerror = () => { if (result) result.textContent = 'Could not load this image for analysis.'; };
        image.src = src;
    });
}

function setupMarketingSettings() {
    const button = document.getElementById('save-marketing-settings-btn');
    if (!button || button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', async () => {
        storeSettings.marketing = {
            metaPixelId: document.getElementById('meta-pixel-id')?.value.trim() || '',
            tiktokPixelId: document.getElementById('tiktok-pixel-id')?.value.trim() || '',
            privacyPolicyUrl: document.getElementById('privacy-policy-url')?.value.trim() || 'privacy.html',
            termsUrl: document.getElementById('terms-url')?.value.trim() || 'terms.html',
            consentTitle: document.getElementById('cookie-consent-title')?.value.trim() || 'Your privacy matters',
            consentText: document.getElementById('cookie-consent-text')?.value.trim() || ''
        };
        if (await saveStoreSettings()) { await logAdminActivity('updated', 'marketingSettings', 'storeSettings', 'Consent-controlled pixels and legal links'); showAdminMessage('Marketing and privacy settings saved.'); }
    });
}

function setupBackupTools() {
    const exportButton = document.getElementById('export-backup-btn');
    const importInput = document.getElementById('import-backup-file');
    const status = document.getElementById('backup-status');
    const collections = ['products', 'categories', 'attributes', 'catalogFilters', 'orders', 'settings'];
    const download = (name, data) => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };
    exportButton?.addEventListener('click', async () => {
        try {
            const snapshot = { schema: 'tiddis-backup', version: 1, exportedAt: new Date().toISOString(), collections: {} };
            for (const name of collections) { const snap = await getDocs(collection(db, name)); snapshot.collections[name] = snap.docs.map(item => ({ id: item.id, data: item.data() })); }
            download(`tiddis-backup-${new Date().toISOString().slice(0, 10)}.json`, snapshot);
            if (status) status.textContent = 'Backup exported successfully.';
            await logAdminActivity('exported', 'backup', '', 'JSON snapshot');
        } catch (error) { if (status) status.textContent = 'Backup export failed. Check Firestore permissions.'; console.error(error); }
    });
    importInput?.addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            if (data.schema !== 'tiddis-backup' || !data.collections || typeof data.collections !== 'object') throw new Error('Invalid Tiddis backup');
            const allowed = new Set(collections);
            const batch = writeBatch(db); let count = 0;
            Object.entries(data.collections).forEach(([name, rows]) => { if (!allowed.has(name) || !Array.isArray(rows)) return; rows.forEach(row => { if (!row?.id || !row?.data || typeof row.data !== 'object') return; batch.set(doc(db, name, row.id), row.data, { merge: true }); count++; }); });
            if (count > 450) throw new Error('Backup is too large for one safe batch. Split it before importing.');
            await batch.commit();
            if (status) status.textContent = `Imported ${count} documents. Reload the relevant sections.`;
            await logAdminActivity('imported', 'backup', '', `${count} documents`);
        } catch (error) { if (status) status.textContent = `Import failed: ${error.message}`; console.error(error); }
        event.target.value = '';
    });
}

function setupAdminEnhancementListeners() {
    document.getElementById('refresh-activity-btn')?.addEventListener('click', loadActivityLog);
    document.getElementById('refresh-insights-btn')?.addEventListener('click', renderOperationalInsights);
}

async function initTiddisAdminEnhancements() {
    if (adminEnhancementsReady) return;
    adminEnhancementsReady = true;
    enforceAdminRolePresentation();
    setupProductImageDragDrop();
    setupHeroContrastAnalyzer();
    setupMarketingSettings();
    setupBackupTools();
    setupAdminEnhancementListeners();
    renderOperationalInsights();
    await loadActivityLog();
}
