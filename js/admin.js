// ============================================
// TIDDIS TAPIS — Admin Panel Logic (محدث بالكامل)
// لوحة التحكم الإدارية مع تحسينات خوارزمية:
// - إدارة حالة مركزية
// - عمليات CRUD محسّنة
// - حماية كاملة للحذف (على مستوى العميل)
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

// ============================================
// 2. عناصر DOM الرئيسية
// ============================================
const sections = {
    dashboard: document.getElementById('section-dashboard'),
    hero: document.getElementById('section-hero'),
    categories: document.getElementById('section-categories'),
    overview: document.getElementById('section-overview'),
    products: document.getElementById('section-products'),
    delivery: document.getElementById('section-delivery'),
    orders: document.getElementById('section-orders'),
    attributes: document.getElementById('section-attributes'),
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

// عناصر إدارة التوصيل
const deliveryTableBody = document.getElementById('delivery-table-body');
const bulkDeliveryPrice = document.getElementById('bulk-delivery-price');
const applyBulkPriceBtn = document.getElementById('apply-bulk-price-btn');
const setAllFreeBtn = document.getElementById('set-all-free-btn');
const resetAllDeliveryBtn = document.getElementById('reset-all-delivery-btn');

// عناصر إدارة الطلبات
const ordersList = document.getElementById('orders-list');

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

adminNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;

        adminNavLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        Object.keys(sections).forEach(key => {
            if (sections[key]) sections[key].classList.remove('active');
        });

        if (sections[section]) {
            sections[section].classList.add('active');
        }

        if (window.innerWidth <= 900) {
            setAdminSidebarOpen(false);
        }

        if (section === 'dashboard') loadDashboardData();
        if (section === 'categories') loadCategories();
        if (section === 'overview') loadOverviewCategories();
        if (section === 'products') loadProducts();
        if (section === 'delivery') loadDeliveryRates();
        if (section === 'orders') loadOrders();
        if (section === 'settings') loadSettings();
    });
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
        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-variant">Remove</button>
    `;
    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
    variantsContainer?.appendChild(row);
});

addImageRowBtn?.addEventListener('click', function() {
    const row = document.createElement('div');
    row.className = 'image-upload-row';
    row.innerHTML = `
        <input type="text" class="additional-image-url form-input" placeholder="Image URL">
        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image">Remove</button>
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
    updatePDFImageSelector();
});

productForm?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = productNameInput?.value.trim();
    const category = productCategorySelect?.value;
    const overviewCategory = productOverviewCategorySelect?.value || null;
    const basePrice = parseFloat(productBasePriceInput?.value);
    const imageUrl = productMainImageInput?.value.trim();
    const customizableSize = productCustomizableCheckbox?.checked || false;

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
            showAdminMessage('Product updated successfully!');
        } else {
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'products'), productData);
            showAdminMessage('Product added successfully!');
        }

        editingProductId = null;
        productForm.reset();
        if (variantsContainer) variantsContainer.innerHTML = '';
        if (additionalImagesContainer) {
            additionalImagesContainer.innerHTML = `
                <div class="image-upload-row">
                    <input type="text" class="additional-image-url form-input" placeholder="Image URL">
                    <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image" style="display:none;">Remove</button>
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
        if (productMainImageInput) productMainImageInput.value = product.imageUrl || '';
        if (productCustomizableCheckbox) productCustomizableCheckbox.checked = product.customizableSize || false;

        // تعبئة السمات
        const attributes = product.attributes || {};
        document.querySelectorAll('.attr-opt-checkbox').forEach(cb => {
            const attrId = cb.dataset.attrId;
            const val = cb.value;
            cb.checked = attributes[attrId] && attributes[attrId].includes(val);
        });

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
                        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image">Remove</button>
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
                    <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-image" style="display:none;">Remove</button>
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
                        <button type="button" class="admin-action-btn admin-action-btn--danger btn-remove-variant">Remove</button>
                    `;
                    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
                    variantsContainer.appendChild(row);
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

function readPrivateImageSources() {
    try {
        const raw = localStorage.getItem(PRIVATE_IMAGE_SOURCES_KEY);
        return raw ? normalizeImageSources(JSON.parse(raw)) : [];
    } catch (error) {
        console.warn('Unable to read private image sources from this browser.', error);
        return [];
    }
}

function savePrivateImageSources() {
    try {
        localStorage.setItem(PRIVATE_IMAGE_SOURCES_KEY, JSON.stringify(normalizeImageSources(imageApiSources)));
        return true;
    } catch (error) {
        console.error('Unable to save private image sources locally:', error);
        showAdminMessage('Could not save the private image sources on this device.', 'error');
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
                aboutImage: 'assets/about-tiddis.jpg',
                logoUrl: '',
                sidebarBgColor: '#ffffff',
                mainBgColor: '#faf9f6',
                contacts: [],
                googleSheetsUrl: '',
                imageProvider: 'imgbb',
                imageApiKey: '',
                imageSources: []
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
        const privateSources = readPrivateImageSources();
        imageApiSources = privateSources.length ? privateSources : legacyImageSources;
        if (!privateSources.length && legacyImageSources.length) savePrivateImageSources();
        renderImageApiSourcesList();
        closeImageApiEditor();
        if (aboutUsTextarea) aboutUsTextarea.value = storeSettings.aboutText || '';
        if (aboutImageUrlInput) aboutImageUrlInput.value = storeSettings.aboutImage || 'assets/about-tiddis.jpg';
        if (logoUrlInput) logoUrlInput.value = storeSettings.logoUrl || '';
        if (sidebarBgColorInput) sidebarBgColorInput.value = storeSettings.sidebarBgColor || '#ffffff';
        if (mainBgColorInput) mainBgColorInput.value = storeSettings.mainBgColor || '#faf9f6';

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
    const imageUrl = aboutImageUrlInput?.value.trim() || 'assets/about-tiddis.jpg';
    const validImagePath = /^(https?:\/\/|\/|\.\/|\.\.\/|assets\/)/i.test(imageUrl);
    if (!text) {
        showAdminMessage('Please enter some text for the About section.', 'error');
        return;
    }
    if (!validImagePath) {
        showAdminMessage('Use an HTTPS image URL or a local path such as assets/about-tiddis.jpg.', 'error');
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
        telegram: '✈️',
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
            if (!savePrivateImageSources()) return;
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
    if (!savePrivateImageSources()) return;
    if (await saveStoreSettings()) {
        renderImageApiSourcesList();
        closeImageApiEditor();
        showAdminMessage('Image source saved securely.');
    }
});

// ============================================
// Hero Slides Management Logic
// ============================================
const heroSlideImage = document.getElementById('hero-slide-image');
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
                    <img src="${slide.image}" alt="Slide" style="width:60px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='https://via.placeholder.com/60x40?text=No+Img'">
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
            if (heroSlideImage) heroSlideImage.value = slide.image || '';
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

// 1. ربط رفع صورة الهيرو
const uploadHeroImgBtn = document.getElementById('upload-hero-img-btn');
const heroImageFile = document.getElementById('hero-image-file');
uploadHeroImgBtn?.addEventListener('click', () => heroImageFile?.click());
heroImageFile?.addEventListener('change', function() {
    uploadToImgBB(this.files[0], uploadHeroImgBtn, document.getElementById('hero-slide-image'));
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
    if (!image) {
        showAdminMessage('Please provide a Slide Image URL.');
        return;
    }

    const slideData = {
        image: image,
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
        await loadProducts();
        await loadDeliveryRates();
        await loadOrders();
        await loadSettings();

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
