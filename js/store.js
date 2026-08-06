import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const GOOGLE_SHEETS_API = "https://script.google.com/macros/s/AKfycbzlbJnN-m68KAWZCKi1ELBetMTXVkHbDWG7t6TrV1v3tvL-LPyKxT6yW8Wu2WfO744EGQ/exec";

async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        grid.innerHTML = "";

        if (querySnapshot.empty) {
            grid.innerHTML = "<p>No products available right now.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            renderProductCard(product, grid);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        grid.innerHTML = "<p>Unable to load collection right now.</p>";
    }
}

function renderProductCard(product, container) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const hasVariants = product.variants && product.variants.length > 0;
    const initialVariant = hasVariants ? product.variants[0] : null;

    const initialImage = (initialVariant && initialVariant.image) ? initialVariant.image : (product.imageUrl || '');
    const initialPrice = (initialVariant && initialVariant.price) ? initialVariant.price : (product.basePrice || 12500);

    let variantOptionsHtml = '';
    if (hasVariants) {
        variantOptionsHtml = `
            <select class="variant-select">
                ${product.variants.map((v, idx) => `
                    <option value="${idx}" data-price="${v.price}" data-image="${v.image || product.imageUrl || ''}">
                        ${v.size ? v.size : ''} ${v.color ? '- ' + v.color : ''}
                    </option>
                `).join('')}
            </select>
        `;
    }

    card.innerHTML = `
        <img class="product-img" src="${initialImage}" alt="${product.title || 'KSOR Rug'}" loading="eager">
        <div class="product-body">
            ${variantOptionsHtml}
            <div class="product-details-line">
                <div class="product-info">
                    <span class="product-title">${product.title || 'KSOR Tapis'}</span>
                    <span class="product-price">${initialPrice} DZD</span>
                </div>
                <button class="order-btn">Order Now</button>
            </div>
        </div>
    `;

    // Instant variant selection (price & image update)
    const select = card.querySelector('.variant-select');
    const img = card.querySelector('.product-img');
    const price = card.querySelector('.product-price');
    const orderBtn = card.querySelector('.order-btn');

    if (select) {
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const newPrice = selectedOption.getAttribute('data-price');
            const newImg = selectedOption.getAttribute('data-image');

            if (newPrice) price.textContent = `${newPrice} DZD`;
            if (newImg) img.src = newImg;
        });
    }

    // Direct dispatch to Google Sheet Web App
    orderBtn.addEventListener('click', async () => {
        const customerDetails = prompt("Enter your name and phone number for delivery:");
        if (!customerDetails) return;

        let selectedDetails = product.title || 'KSOR Tapis';
        let finalPrice = initialPrice;

        if (select) {
            const selectedOption = select.options[select.selectedIndex];
            selectedDetails += ` (${selectedOption.text.trim()})`;
            finalPrice = selectedOption.getAttribute('data-price');
        }

        orderBtn.disabled = true;
        orderBtn.textContent = "Sending...";

        try {
            await fetch(GOOGLE_SHEETS_API, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: selectedDetails,
                    price: `${finalPrice} DZD`,
                    customerDetails: customerDetails
                })
            });

            alert("Order sent successfully!");
        } catch (err) {
            console.error("Order error:", err);
            alert("Error placing order. Please try again.");
        } finally {
            orderBtn.disabled = false;
            orderBtn.textContent = "Order Now";
        }
    });

    container.appendChild(card);
}

document.addEventListener('DOMContentLoaded', loadProducts);
