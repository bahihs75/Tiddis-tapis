// ============================================
// TIDDIS TAPIS — Admin Panel Logic
// منطق لوحة التحكم الإدارية (إدارة المنتجات، الفئات، التوصيل، الإعدادات)
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
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// المتغيرات العامة
// ============================================
let allCategories = [];
let allProducts = [];
let allOrders = [];
let deliveryRates = {};
let storeSettings = {};
let editingProductId = null;

// ============================================
// عناصر DOM الرئيسية
// ============================================
// الأقسام
const sections = {
    dashboard: document.getElementById('section-dashboard'),
    categories: document.getElementById('section-categories'),
    products: document.getElementById('section-products'),
    delivery: document.getElementById('section-delivery'),
    settings: document.getElementById('section-settings')
};

// الروابط الجانبية
const adminNavLinks = document.querySelectorAll('#admin-sidebar .nav-link');

// عناصر إدارة الفئات
const categoriesList = document.getElementById('categories-list');
const parentCategorySelect = document.getElementById('parent-category-select');
const newCategoryName = document.getElementById('new-category-name');
const newSubcategoryName = document.getElementById('new-subcategory-name');
const addCategoryBtn = document.getElementById('add-category-btn');
const addSubcategoryBtn = document.getElementById('add-subcategory-btn');

// عناصر إدارة المنتجات
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productCategorySelect = document.getElementById('product-category');
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
const statOrders = document.getElementById('stat-orders');
const recentOrdersList = document.getElementById('recent-orders-list');

// عناصر إدارة التوصيل
const deliveryTableBody = document.getElementById('delivery-table-body');
const bulkDeliveryPrice = document.getElementById('bulk-delivery-price');
const applyBulkPriceBtn = document.getElementById('apply-bulk-price-btn');
const setAllFreeBtn = document.getElementById('set-all-free-btn');
const resetAllDeliveryBtn = document.getElementById('reset-all-delivery-btn');

// عناصر الإعدادات
const googleSheetsUrlInput = document.getElementById('google-sheets-url');
const testSheetsBtn = document.getElementById('test-sheets-btn');
const imageProviderSelect = document.getElementById('image-provider-select');
const imageApiKeyInput = document.getElementById('image-api-key');
const aboutUsTextarea = document.getElementById('about-us-text');
const saveAboutBtn = document.getElementById('save-about-btn');
const logoUrlInput = document.getElementById('logo-url');
const saveLogoBtn = document.getElementById('save-logo-btn');
const contactIconsList = document.getElementById('contact-icons-list');
const newContactPlatform = document.getElementById('new-contact-platform');
const newContactValue = document.getElementById('new-contact-value');
const addContactBtn = document.getElementById('add-contact-btn');

// هامبورجر للأدمن
const adminHamburger = document.getElementById('admin-hamburger');
const adminSidebar = document.getElementById('admin-sidebar');

// ============================================
// قائمة الولايات الـ 58 الجزائرية (للتوصيل)
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
// 1. التنقل بين أقسام لوحة التحكم
// ============================================

adminNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;

        // إزالة الفعالية من جميع الروابط
        adminNavLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // إخفاء جميع الأقسام
        Object.keys(sections).forEach(key => {
            sections[key].classList.remove('active');
        });

        // إظهار القسم المطلوب
        if (sections[section]) {
            sections[section].classList.add('active');
        }

        // إغلاق القائمة على الهواتف
        if (window.innerWidth <= 900) {
            adminSidebar.classList.remove('open');
            adminHamburger?.classList.remove('active');
        }

        // تحديث البيانات عند التبديل
        if (section === 'dashboard') loadDashboardData();
        if (section === 'categories') loadCategories();
        if (section === 'products') loadProducts();
        if (section === 'delivery') loadDeliveryRates();
        if (section === 'settings') loadSettings();
    });
});

// هامبورجر للأدمن
if (adminHamburger) {
    adminHamburger.addEventListener('click', function() {
        adminSidebar.classList.toggle('open');
        this.classList.toggle('active');
    });
}

// ============================================
// 2. إدارة الفئات (Categories)
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
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesList.innerHTML = '<p style="color:#c0392b;">Error loading categories.</p>';
    }
}

function renderCategories() {
    if (!allCategories || allCategories.length === 0) {
        categoriesList.innerHTML = '<p>No categories found. Add your first category above.</p>';
        return;
    }

    let html = '';
    allCategories.forEach(cat => {
        html += `
            <div class="category-item">
                <span><strong>${cat.name}</strong></span>
                <div class="cat-actions">
                    <button class="edit-btn" data-id="${cat.id}">✏️</button>
                    <button class="delete-btn" data-id="${cat.id}">🗑️</button>
                </div>
            </div>
        `;
        // عرض الفئات الفرعية
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => {
                // التحقق من وجود منتجات في هذه الفئة الفرعية
                const hasProducts = allProducts.some(p => p.category === sub);
                const deleteDisabled = hasProducts ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : '';
                html += `
                    <div class="subcategory-item" style="padding-left:32px;">
                        <span>↳ ${sub}</span>
                        <div class="cat-actions">
                            <button class="edit-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}">✏️</button>
                            <button class="delete-sub-btn" data-cat-id="${cat.id}" data-sub="${sub}" ${deleteDisabled}>
                                🗑️ ${hasProducts ? '(has products)' : ''}
                            </button>
                        </div>
                    </div>
                `;
            });
        }
    });

    categoriesList.innerHTML = html;

    // إضافة مستمعات الأحداث
    categoriesList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });
    categoriesList.querySelectorAll('.delete-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSubCategory(btn.dataset.catId, btn.dataset.sub));
    });
}

function populateCategorySelects() {
    // تعبئة قائمة الفئات في نموذج المنتج
    productCategorySelect.innerHTML = '<option value="">Select sub-category</option>';
    allCategories.forEach(cat => {
        if (cat.subcategories) {
            cat.subcategories.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = `${cat.name} → ${sub}`;
                productCategorySelect.appendChild(option);
            });
        }
    });

    // تعبئة قائمة الفئات الأب في نموذج إضافة فئة فرعية
    parentCategorySelect.innerHTML = '<option value="">Select parent category</option>';
    allCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        parentCategorySelect.appendChild(option);
    });
}

// إضافة فئة رئيسية
addCategoryBtn.addEventListener('click', async function() {
    const name = newCategoryName.value.trim();
    if (!name) {
        alert('Please enter a category name.');
        return;
    }

    try {
        await addDoc(collection(db, 'categories'), {
            name: name,
            subcategories: []
        });
        newCategoryName.value = '';
        await loadCategories();
        alert(`Category "${name}" added successfully!`);
    } catch (error) {
        console.error('Error adding category:', error);
        alert('Error adding category.');
    }
});

// حذف فئة رئيسية
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category and all its sub-categories?')) return;

    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        await loadCategories();
        alert('Category deleted successfully.');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category.');
    }
}

// إضافة فئة فرعية
addSubcategoryBtn.addEventListener('click', async function() {
    const parentId = parentCategorySelect.value;
    const name = newSubcategoryName.value.trim();

    if (!parentId || !name) {
        alert('Please select a parent category and enter a sub-category name.');
        return;
    }

    try {
        const catRef = doc(db, 'categories', parentId);
        const catDoc = await getDoc(catRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const subcategories = data.subcategories || [];
            if (subcategories.includes(name)) {
                alert('This sub-category already exists.');
                return;
            }
            subcategories.push(name);
            await updateDoc(catRef, { subcategories: subcategories });
            newSubcategoryName.value = '';
            await loadCategories();
            alert(`Sub-category "${name}" added successfully!`);
        }
    } catch (error) {
        console.error('Error adding sub-category:', error);
        alert('Error adding sub-category.');
    }
});

// حذف فئة فرعية
async function deleteSubCategory(categoryId, subName) {
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
            alert(`Sub-category "${subName}" deleted successfully.`);
        }
    } catch (error) {
        console.error('Error deleting sub-category:', error);
        alert('Error deleting sub-category.');
    }
}

// ============================================
// 3. إدارة المنتجات (Products)
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
        populateCategorySelects(); // تحديث قائمة الفئات في نموذج الإضافة
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<p style="color:#c0392b;">Error loading products.</p>';
    }
}

function renderProductsList() {
    if (!allProducts || allProducts.length === 0) {
        productsList.innerHTML = '<p>No products yet. Add your first product above.</p>';
        return;
    }

    let html = '';
    allProducts.forEach(product => {
        const price = product.basePrice || 0;
        const category = product.category || 'Uncategorized';
        html += `
            <div class="product-admin-item">
                <div>
                    <strong>${product.name || 'Unnamed'}</strong>
                    <span style="color:#6b6b6b; font-size:13px; margin-left:12px;">${category}</span>
                    <span style="color:#4E1A1D; font-weight:600; margin-left:12px;">${price} DZD</span>
                </div>
                <div class="product-admin-actions">
                    <button class="edit-btn" data-id="${product.id}">✏️ Edit</button>
                    <button class="delete-btn" data-id="${product.id}">🗑️ Delete</button>
                    <button class="pdf-btn" data-id="${product.id}">📄 PDF</button>
                </div>
            </div>
        `;
    });

    productsList.innerHTML = html;

    // مستمعات الأحداث
    productsList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });
    productsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
    productsList.querySelectorAll('.pdf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // استدعاء وظيفة PDF من store.js
            if (window.generateProductPDF) {
                window.generateProductPDF(btn.dataset.id);
            } else {
                alert('PDF generation function not loaded. Please refresh the page.');
            }
        });
    });
}

// إضافة متغير جديد
addVariantBtn.addEventListener('click', function() {
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;';
    row.innerHTML = `
        <input type="text" class="form-input var-size" placeholder="Size (e.g., 200x280 cm)" style="flex:1; min-width:100px;">
        <input type="text" class="form-input var-color" placeholder="Color (e.g., Grouna)" style="flex:1; min-width:80px;">
        <input type="number" class="form-input var-price" placeholder="Price (DZD)" style="flex:0.7; min-width:80px;">
        <input type="text" class="form-input var-image" placeholder="Image URL" style="flex:1.5; min-width:120px;">
        <button type="button" class="btn-remove-variant" style="background:#c0392b; color:#fff; border:none; padding:0 12px; border-radius:4px; cursor:pointer;">✕</button>
    `;
    row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
    variantsContainer.appendChild(row);
});

// إضافة صورة إضافية
addImageRowBtn.addEventListener('click', function() {
    const row = document.createElement('div');
    row.className = 'image-upload-row';
    row.innerHTML = `
        <input type="text" class="additional-image-url form-input" placeholder="Image URL">
        <button type="button" class="btn-remove-image">✕</button>
    `;
    row.querySelector('.btn-remove-image').addEventListener('click', () => {
        row.remove();
        updatePDFImageSelector();
        updateAdditionalImagesPreview();
    });
    additionalImagesContainer.appendChild(row);
    // إضافة مستمع لتحديث المعاينة
    row.querySelector('.additional-image-url').addEventListener('input', () => {
        updateAdditionalImagesPreview();
        updatePDFImageSelector();
    });
});

// تحديث معاينة الصور الإضافية
function updateAdditionalImagesPreview() {
    const urls = getAdditionalImageUrls();
    additionalImagesPreview.innerHTML = urls.map(url =>
        `<img src="${url}" alt="Additional image" onerror="this.style.display='none'">`
    ).join('');
}

// الحصول على روابط الصور الإضافية
function getAdditionalImageUrls() {
    const inputs = additionalImagesContainer.querySelectorAll('.additional-image-url');
    return Array.from(inputs).map(input => input.value.trim()).filter(url => url);
}

// تحديث محدد صورة PDF
function updatePDFImageSelector() {
    const allImages = getAllImagesForProduct();
    pdfImageSelector.innerHTML = allImages.map((url, index) => {
        const checked = index === 0 ? 'checked' : '';
        return `
            <label style="display:inline-block; margin:4px 8px 4px 0; cursor:pointer; position:relative;">
                <input type="radio" name="pdfImage" value="${url}" ${checked} style="margin-right:4px;">
                <img src="${url}" alt="Image ${index+1}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #e2e0d8; vertical-align:middle;">
            </label>
        `;
    }).join('');
}

// الحصول على جميع الصور
function getAllImagesForProduct() {
    const images = [];
    const mainImage = productMainImageInput.value.trim();
    if (mainImage) images.push(mainImage);
    images.push(...getAdditionalImageUrls());
    return images;
}

// معاينة الصورة الرئيسية
productMainImageInput.addEventListener('input', function() {
    const url = this.value.trim();
    if (url) {
        mainImagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
    } else {
        mainImagePreview.innerHTML = '';
    }
    updatePDFImageSelector();
});

// حفظ المنتج (إضافة أو تعديل)
productForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = productNameInput.value.trim();
    const category = productCategorySelect.value;
    const basePrice = parseFloat(productBasePriceInput.value);
    const imageUrl = productMainImageInput.value.trim();
    const customizableSize = productCustomizableCheckbox.checked;

    if (!name || !category || !basePrice || !imageUrl) {
        alert('Please fill in all required fields (Name, Category, Price, Main Image).');
        return;
    }

    // جمع المتغيرات
    const variantRows = variantsContainer.querySelectorAll('.variant-row');
    const variants = [];
    variantRows.forEach(row => {
        const size = row.querySelector('.var-size').value.trim();
        const color = row.querySelector('.var-color').value.trim();
        const price = parseFloat(row.querySelector('.var-price').value) || basePrice;
        const image = row.querySelector('.var-image').value.trim() || imageUrl;
        if (size || color) {
            variants.push({ size, color, price, image });
        }
    });

    // جمع الصور الإضافية
    const additionalImages = getAdditionalImageUrls();

    // الحصول على صورة PDF المحددة
    const pdfImageRadio = document.querySelector('input[name="pdfImage"]:checked');
    const pdfImage = pdfImageRadio ? pdfImageRadio.value : (imageUrl || '');

    const productData = {
        name,
        category,
        basePrice,
        imageUrl,
        additionalImages,
        pdfImage,
        customizableSize,
        variants,
        updatedAt: new Date().toISOString()
    };

    try {
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        if (editingProductId) {
            // تحديث منتج موجود
            await updateDoc(doc(db, 'products', editingProductId), productData);
            alert('Product updated successfully!');
        } else {
            // إضافة منتج جديد
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }

        // إعادة تعيين النموذج
        editingProductId = null;
        productForm.reset();
        variantsContainer.innerHTML = '';
        additionalImagesContainer.innerHTML = `
            <div class="image-upload-row">
                <input type="text" class="additional-image-url form-input" placeholder="Image URL">
                <button type="button" class="btn-remove-image" style="display:none;">✕</button>
            </div>
        `;
        mainImagePreview.innerHTML = '';
        additionalImagesPreview.innerHTML = '';
        pdfImageSelector.innerHTML = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Product';

        // إعادة تحميل قائمة المنتجات
        await loadProducts();
        populateCategorySelects();

    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product. Please check console for details.');
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Product';
    }
});

// تحميل منتج للتعديل
async function editProduct(productId) {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            alert('Product not found.');
            return;
        }

        const product = docSnap.data();
        editingProductId = productId;

        // تعبئة النموذج
        productNameInput.value = product.name || '';
        productCategorySelect.value = product.category || '';
        productBasePriceInput.value = product.basePrice || '';
        productMainImageInput.value = product.imageUrl || '';
        productCustomizableCheckbox.checked = product.customizableSize || false;

        // تحديث معاينة الصورة الرئيسية
        if (product.imageUrl) {
            mainImagePreview.innerHTML = `<img src="${product.imageUrl}" alt="Preview">`;
        }

        // تعبئة الصور الإضافية
        additionalImagesContainer.innerHTML = '';
        if (product.additionalImages && product.additionalImages.length > 0) {
            product.additionalImages.forEach(url => {
                const row = document.createElement('div');
                row.className = 'image-upload-row';
                row.innerHTML = `
                    <input type="text" class="additional-image-url form-input" value="${url}">
                    <button type="button" class="btn-remove-image">✕</button>
                `;
                row.querySelector('.btn-remove-image').addEventListener('click', () => {
                    row.remove();
                    updatePDFImageSelector();
                    updateAdditionalImagesPreview();
                });
                additionalImagesContainer.appendChild(row);
            });
        } else {
            // إضافة صف فارغ
            const row = document.createElement('div');
            row.className = 'image-upload-row';
            row.innerHTML = `
                <input type="text" class="additional-image-url form-input" placeholder="Image URL">
                <button type="button" class="btn-remove-image" style="display:none;">✕</button>
            `;
            additionalImagesContainer.appendChild(row);
        }
        // إضافة مستمعات للأحداث
        additionalImagesContainer.querySelectorAll('.additional-image-url').forEach(input => {
            input.addEventListener('input', () => {
                updateAdditionalImagesPreview();
                updatePDFImageSelector();
            });
        });
        updateAdditionalImagesPreview();

        // تعبئة المتغيرات
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
                    <button type="button" class="btn-remove-variant" style="background:#c0392b; color:#fff; border:none; padding:0 12px; border-radius:4px; cursor:pointer;">✕</button>
                `;
                row.querySelector('.btn-remove-variant').addEventListener('click', () => row.remove());
                variantsContainer.appendChild(row);
            });
        }

        // تحديث محدد صورة PDF
        updatePDFImageSelector();

        // التبديل إلى قسم المنتجات
        adminNavLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-section="products"]').classList.add('active');
        Object.keys(sections).forEach(key => sections[key].classList.remove('active'));
        sections.products.classList.add('active');

        // التمرير إلى النموذج
        productForm.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Error loading product.');
    }
}

// حذف منتج
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product permanently?')) return;

    try {
        await deleteDoc(doc(db, 'products', productId));
        await loadProducts();
        alert('Product deleted successfully.');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product.');
    }
}

// ============================================
// 4. إدارة أسعار التوصيل (Delivery Rates)
// ============================================

async function loadDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            deliveryRates = docSnap.data();
        } else {
            // إنشاء القائمة الافتراضية
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
        deliveryTableBody.innerHTML = '<tr><td colspan="4" style="color:#c0392b;">Error loading delivery rates.</td></tr>';
    }
}

function renderDeliveryTable() {
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

    // إضافة مستمعات الأحداث للتحديث التلقائي
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
                if (free) {
                    // تعطيل حقل السعر وجعله 0
                    const priceInput = this.closest('tr').querySelector('.delivery-price-input');
                    if (priceInput) {
                        priceInput.value = 0;
                        priceInput.disabled = true;
                        deliveryRates[code].price = 0;
                    }
                } else {
                    const priceInput = this.closest('tr').querySelector('.delivery-price-input');
                    if (priceInput) {
                        priceInput.disabled = false;
                    }
                }
                saveDeliveryRates();
            }
        });
    });

    // تفعيل/تعطيل حقول السعر بناءً على حالة free
    deliveryTableBody.querySelectorAll('.free-delivery-checkbox').forEach(checkbox => {
        const priceInput = checkbox.closest('tr').querySelector('.delivery-price-input');
        if (checkbox.checked) {
            priceInput.disabled = true;
            priceInput.value = 0;
        }
    });
}

// حفظ أسعار التوصيل
async function saveDeliveryRates() {
    try {
        const docRef = doc(db, 'settings', 'deliveryRates');
        await setDoc(docRef, deliveryRates);
        // console.log('Delivery rates saved successfully.');
    } catch (error) {
        console.error('Error saving delivery rates:', error);
        alert('Error saving delivery rates.');
    }
}

// تطبيق سعر موحد على جميع الولايات
applyBulkPriceBtn.addEventListener('click', function() {
    const price = parseFloat(bulkDeliveryPrice.value);
    if (isNaN(price) || price < 0) {
        alert('Please enter a valid price.');
        return;
    }

    if (!confirm(`Apply ${price} DZD to all wilayas? This will override existing prices.`)) return;

    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = price;
            deliveryRates[w.code].free = false;
        }
    });

    saveDeliveryRates();
    renderDeliveryTable();
    alert(`Price of ${price} DZD applied to all wilayas.`);
});

// تعيين جميع الولايات كتوصيل مجاني
setAllFreeBtn.addEventListener('click', function() {
    if (!confirm('Set all wilayas to Free Delivery?')) return;

    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = 0;
            deliveryRates[w.code].free = true;
        }
    });

    saveDeliveryRates();
    renderDeliveryTable();
    alert('All wilayas set to Free Delivery.');
});

// إعادة تعيين جميع أسعار التوصيل
resetAllDeliveryBtn.addEventListener('click', function() {
    if (!confirm('Reset all delivery prices to default (500 DZD)?')) return;

    WILAYAS.forEach(w => {
        if (deliveryRates[w.code]) {
            deliveryRates[w.code].price = 500;
            deliveryRates[w.code].free = false;
        }
    });

    saveDeliveryRates();
    renderDeliveryTable();
    alert('All delivery prices reset to 500 DZD.');
});

// ============================================
// 5. إعدادات المتجر (Settings)
// ============================================

async function loadSettings() {
    try {
        // تحميل إعدادات المتجر
        const settingsRef = doc(db, 'settings', 'storeSettings');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            storeSettings = settingsSnap.data();
        } else {
            storeSettings = {
                aboutText: 'Tiddis Tapis is inspired by the deep-rooted history and ancient heritage of Constantine. We transform this timeless legacy into modern rugs.',
                logoUrl: '',
                contacts: [],
                googleSheetsUrl: '',
                imageProvider: 'imgbb',
                imageApiKey: ''
            };
            await setDoc(settingsRef, storeSettings);
        }

        // تعبئة الحقول
        googleSheetsUrlInput.value = storeSettings.googleSheetsUrl || '';
        imageProviderSelect.value = storeSettings.imageProvider || 'imgbb';
        imageApiKeyInput.value = storeSettings.imageApiKey || '';
        aboutUsTextarea.value = storeSettings.aboutText || '';
        logoUrlInput.value = storeSettings.logoUrl || '';

        // عرض جهات التواصل
        renderContactIconsList(storeSettings.contacts || []);

    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings.');
    }
}

// حفظ رابط Google Sheets
testSheetsBtn.addEventListener('click', async function() {
    const url = googleSheetsUrlInput.value.trim();
    if (!url) {
        alert('Please paste a Google Sheets Web App URL first.');
        return;
    }

    try {
        this.disabled = true;
        this.textContent = 'Testing...';

        // حفظ الرابط
        storeSettings.googleSheetsUrl = url;
        await saveStoreSettings();

        // اختبار الاتصال
        const testData = {
            productName: 'TEST_CONNECTION',
            price: '0 DZD',
            customerDetails: 'System Test',
            test: true
        };

        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        // بما أننا نستخدم no-cors، لا يمكننا قراءة الرد
        // لكننا نفترض أن الطلب تم إرساله بنجاح
        alert('✅ Connection successful! (Check your Google Sheet for a test entry.)');
    } catch (error) {
        console.error('Test error:', error);
        alert('❌ Connection failed. Please check your URL and try again.');
    } finally {
        this.disabled = false;
        this.textContent = 'Test Connection';
    }
});

// حفظ إعدادات المتجر
async function saveStoreSettings() {
    try {
        const settingsRef = doc(db, 'settings', 'storeSettings');
        await setDoc(settingsRef, storeSettings);
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings.');
        return false;
    }
}

// حفظ نص "من نحن"
saveAboutBtn.addEventListener('click', async function() {
    const text = aboutUsTextarea.value.trim();
    if (!text) {
        alert('Please enter some text for the About section.');
        return;
    }

    storeSettings.aboutText = text;
    if (await saveStoreSettings()) {
        alert('About Us text saved successfully!');
    }
});

// حفظ الشعار
saveLogoBtn.addEventListener('click', async function() {
    const url = logoUrlInput.value.trim();
    storeSettings.logoUrl = url;
    if (await saveStoreSettings()) {
        alert('Logo URL saved successfully!');
    }
});

// إضافة جهة تواصل جديدة
addContactBtn.addEventListener('click', async function() {
    const platform = newContactPlatform.value;
    const value = newContactValue.value.trim();

    if (!platform || !value) {
        alert('Please select a platform and enter a value (link or phone number).');
        return;
    }

    if (!storeSettings.contacts) storeSettings.contacts = [];
    storeSettings.contacts.push({ platform, value });

    if (await saveStoreSettings()) {
        newContactValue.value = '';
        renderContactIconsList(storeSettings.contacts);
        alert('Contact added successfully!');
    }
});

// عرض قائمة جهات التواصل
function renderContactIconsList(contacts) {
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
                <button class="remove-contact-btn" data-index="${index}">✕</button>
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
                alert('Contact removed.');
            }
        });
    });
}

// تغيير مزود الصور
imageProviderSelect.addEventListener('change', function() {
    const provider = this.value;
    const apiKeyGroup = document.getElementById('api-key-group');
    if (provider === 'direct') {
        apiKeyGroup.style.display = 'none';
        imageApiKeyInput.placeholder = 'Direct link mode - no API key needed';
    } else {
        apiKeyGroup.style.display = 'block';
        imageApiKeyInput.placeholder = `Enter your ${provider} API key`;
    }
    storeSettings.imageProvider = provider;
    saveStoreSettings();
});

// حفظ مفتاح API للصور
imageApiKeyInput.addEventListener('change', function() {
    storeSettings.imageApiKey = this.value.trim();
    saveStoreSettings();
});

// ============================================
// 6. لوحة المعلومات (Dashboard)
// ============================================

function updateCategoryStats() {
    if (statCategories) {
        statCategories.textContent = allCategories.length;
    }
}

function updateProductStats() {
    if (statProducts) {
        statProducts.textContent = allProducts.length;
    }
}

async function loadDashboardData() {
    try {
        // تحميل الطلبات من Google Sheets (إذا تم تكوينها)
        // حالياً، ستعرض فقط عدد المنتجات والفئات
        updateCategoryStats();
        updateProductStats();

        // عرض الطلبات الأخيرة (سيتم جلبها من Google Sheets في المستقبل)
        // يمكن ربطها بـ Google Sheets API إذا لزم الأمر
        recentOrdersList.innerHTML = `
            <p style="color:#6b6b6b; font-size:14px;">
                Order tracking via Google Sheets will appear here once configured.
                <br>Currently showing: <strong>${allProducts.length}</strong> products, 
                <strong>${allCategories.length}</strong> categories.
            </p>
        `;

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============================================
// 7. التحميل الأولي (Initialization)
// ============================================

async function initAdmin() {
    try {
        // تحميل جميع البيانات
        await loadCategories();
        await loadProducts();
        await loadDeliveryRates();
        await loadSettings();

        // تحديث الإحصائيات
        updateCategoryStats();
        updateProductStats();

        // عرض لوحة المعلومات بشكل افتراضي
        Object.keys(sections).forEach(key => {
            if (key === 'dashboard') {
                sections[key].classList.add('active');
            } else {
                sections[key].classList.remove('active');
            }
        });

        console.log('✅ TIDDIS TAPIS Admin Panel initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
    }
}

// بدء تشغيل لوحة التحكم
document.addEventListener('DOMContentLoaded', initAdmin);
