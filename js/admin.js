import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Handle adding dynamic variants (Size, Color, Price, Image)
const addVariantBtn = document.getElementById('add-variant-btn');
const variantsContainer = document.getElementById('variants-container');

addVariantBtn.addEventListener('click', () => {
    const variantRow = document.createElement('div');
    variantRow.className = 'variant-row form-group';
    variantRow.style.display = 'flex';
    variantRow.style.gap = '10px';
    variantRow.style.marginBottom = '10px';

    variantRow.innerHTML = `
        <input type="text" class="form-input var-size" placeholder="Size (e.g., 200x280 cm)" style="flex: 1;">
        <input type="text" class="form-input var-color" placeholder="Color" style="flex: 1;">
        <input type="number" class="form-input var-price" placeholder="Price (DZD)" style="flex: 1;">
        <input type="text" class="form-input var-img" placeholder="Image URL (Optional)" style="flex: 1;">
        <button type="button" class="btn-primary remove-variant-btn" style="background: #dc3545; padding: 10px; width: auto;">X</button>
    `;

    // Remove variant row
    variantRow.querySelector('.remove-variant-btn').addEventListener('click', () => {
        variantRow.remove();
    });

    variantsContainer.appendChild(variantRow);
});

// Handle Product Submission to Firebase
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = "Saving to Database...";
    submitBtn.disabled = true;

    const title = document.getElementById('prod-title').value;
    const collectionName = document.getElementById('prod-collection').value;
    const basePrice = document.getElementById('prod-price').value;
    const imageUrl = document.getElementById('prod-image').value;

    // Extract variants
    const variants = [];
    document.querySelectorAll('.variant-row').forEach(row => {
        const size = row.querySelector('.var-size').value;
        const color = row.querySelector('.var-color').value;
        const price = row.querySelector('.var-price').value;
        const img = row.querySelector('.var-img').value;
        
        if (size || color) {
            variants.push({
                size: size,
                color: color,
                price: price || basePrice, // fallback to base price if left empty
                image: img || imageUrl     // fallback to main image if left empty
            });
        }
    });

    try {
        await addDoc(collection(db, "products"), {
            title,
            collection: collectionName,
            basePrice,
            imageUrl,
            variants,
            createdAt: new Date()
        });
        
        alert("Product successfully added to the store!");
        e.target.reset();
        variantsContainer.innerHTML = ''; // Clear variant rows
    } catch (error) {
        console.error("Error adding product: ", error);
        alert("Failed to add product. Check the console for details.");
    } finally {
        submitBtn.textContent = "Save Product to Database";
        submitBtn.disabled = false;
    }
});

// Handle External Connections Saving (Google Sheets & ImgBB)
const saveSettingsBtn = document.getElementById('save-settings-btn');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        const sheetsUrl = document.getElementById('google-sheet-url').value;
        const imgbbKey = document.getElementById('imgbb-api-key').value;
        
        if(sheetsUrl) localStorage.setItem('googleSheetsUrl', sheetsUrl);
        if(imgbbKey) localStorage.setItem('imgbbApiKey', imgbbKey);
        
        alert("Connection settings saved successfully!");
    });
}

// Load saved connection settings on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedSheetsUrl = localStorage.getItem('googleSheetsUrl');
    const savedImgbbKey = localStorage.getItem('imgbbApiKey');
    
    if(savedSheetsUrl) document.getElementById('google-sheet-url').value = savedSheetsUrl;
    if(savedImgbbKey) document.getElementById('imgbb-api-key').value = savedImgbbKey;
});
