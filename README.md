# TIDDIS TAPIS

## Developer Documentation for the Luxury Rug Storefront

**Tiddis Tapis** is a static, responsive luxury-rug storefront connected to Firebase. It combines an editorial product catalogue, a full-screen Liquid Glass hero experience, advanced filtering, product detail pages, order capture, technical-sheet PDF generation, and a Firebase-powered administration panel.

The project is intentionally built with plain HTML, CSS, and browser-native JavaScript modules. It does not require React, a Node.js build pipeline, or a SQL database to run the current storefront. Firebase provides the dynamic data layer, authentication, and order storage.

> **Repository:** `bahihs75/Tiddis-tapis`  
> **Production site:** [tiddis-tapis.pages.dev](https://tiddis-tapis.pages.dev/)  
> **Primary language of the current interface:** English  
> **Current deployment model:** Static hosting + Firebase client SDKs

---

## 1. Project Goals

Tiddis Tapis is designed for customers who expect a premium buying experience rather than a generic product grid. The interface gives the rug image visual priority, keeps the information hierarchy calm, and reduces the number of decisions required before a visitor can request a quotation or order.

The project has four complementary goals:

1. **Present rugs as collectible interior objects.** Large imagery, negative space, restrained typography, and contextual photography help the visitor evaluate the rug as part of a space.
2. **Make catalogue discovery efficient.** Search, hierarchical categories, dynamic attributes, price ranges, and responsive product density allow visitors to move from a large catalogue to a relevant shortlist.
3. **Convert interest into a structured request.** The product detail page exposes the information needed for a decision and sends a structured order document to Firestore.
4. **Give the team control without editing the storefront manually.** The administration panel manages catalogue content, categories, attributes, hero slides, delivery prices, orders, image sources, branding, About Us, and contact settings.

The design direction is inspired by quiet editorial commerce: the interface should feel **clean, expensive, smooth, and trustworthy** while remaining practical for daily content operations.

---

## 2. Product Experience

### 2.1 Storefront flow

The public website follows this primary journey:

```text
Hero Slider
    ↓
Search and Filters
    ↓
Product Grid
    ↓
Product Detail
    ↓
Variant and Size Selection
    ↓
Order Modal
    ↓
Firestore Order
    ↓
Success Modal and Technical Sheet PDF
```

### 2.2 Public pages

| File | Responsibility |
|---|---|
| `index.html` | Public storefront, navigation, hero slider mount point, search, filters, product grid, About Us, contact, and order modals. |
| `product.html` | Product detail route. The product is resolved from the URL query parameter `id`. |
| `bahi2005.html` | Protected administration interface. It includes the login shell and all management sections. |
| `404.html` | Custom not-found page when included by the deployment. |

### 2.3 Header and navigation

The storefront uses a fixed desktop header and a dedicated mobile header. The `TIDDIS TAPIS` brand remains visible while the visitor scrolls. Hamburger buttons share the same navigation state and open a glass sidebar containing the site sections generated from the current Firestore content.

The sidebar is not hardcoded as a permanent catalogue list. Its links are generated from categories, subcategories, Overview sections, About Us, and Contact data, so the navigation can evolve when the administrator creates a new category or subcategory.

### 2.4 Hero Slider

The element `<div id="hero-slider-container">` is populated by `store.js`. A hero slide may contain:

- Main image.
- Editable title.
- Editable subtitle or supporting text.
- Editable button label.
- Internal destination selected from the available site sections.
- External URL when an outside destination is required.
- Optional SVG icon.
- Background color or automatically derived ambient background treatment.
- Slide ordering and visibility controls managed from the administration panel.

The hero is intended to occupy the primary visual area on desktop and mobile. The main photo remains dominant, while the blurred background extends toward the edges to create a soft Liquid Glass frame rather than a white empty band.

Hero interaction includes automatic progression and pointer/touch dragging support. When modifying the slider, test both manual dragging and automatic transitions, including a slow connection and a narrow viewport.

### 2.5 Search

The storefront contains a desktop search field and a collapsible mobile search bar. Search is designed for rug names, sizes, colors, categories, and related product data. The implementation is handled in `js/store.js` and is applied before rendering the visible product list.

### 2.6 Filters

The filter panel is mounted in `index.html` and populated dynamically from Firestore data. Current filter groups include:

- Categories and subcategories.
- Price ranges.
- Dynamic attributes such as quality, size, color, or any custom attribute created by the administrator.

The intended matching model is:

- **OR inside one filter group:** choosing two categories returns products matching either category.
- **AND between different groups:** choosing a category and a price range returns products that match the selected category and the selected price range.
- **Parent-category expansion:** selecting a parent category includes products assigned to its descendant categories.
- **Single-select color behaviour:** the current product colour selection UI is intended to keep the latest selected colour active and remove the previous active colour immediately.

If filter behaviour changes, update both the data shape and `getFilteredProducts` rather than adding a visual-only checkbox rule.

### 2.7 Product grid

The grid supports two desktop densities:

- Loose mode: three columns.
- Dense mode: up to six columns.

On mobile, the grid becomes a single-column layout with cards using the available width and a controlled side margin. The mobile layout is intentionally separate from the desktop density control; changing desktop density must not make mobile cards unnecessarily narrow.

The grid uses skeleton cards during the initial loading state and supports a Load More interaction when the result set is larger than the first rendered batch.

### 2.8 Product detail page

`product.html` is a dedicated, image-led product workspace. It currently supports:

- Product name and category context.
- Main product image.
- Additional image thumbnails.
- Horizontally scrollable thumbnail navigation when many images exist.
- Quality, size, colour, price, and other product attributes.
- Product variants with their own size, colour, or price values.
- Optional custom-size selection.
- Order action.
- Large back navigation control beside the image area.
- Technical Sheet PDF action.
- Responsive layout that avoids unnecessary page-level horizontal scrolling.

The main image must preserve its original aspect ratio. The technical sheet image uses containment rather than forced cropping so that the complete rug remains visible in the generated document.

### 2.9 Order modal

The order modal is located in `index.html` and is controlled by `js/store.js`. The current fields are:

- Full name.
- Phone number.
- Wilaya.
- Optional custom size when the selected product allows it.
- Product and selected variant context.
- Subtotal.
- Delivery fee.
- Total.

A public visitor can create an order without an account. The completed order is written to the `orders` collection. A success modal confirms the request and can expose the technical sheet download action.

### 2.10 About Us and Contact

The storefront includes a responsive About Us section. Its image is managed through the admin Image Library and may use an ImgBB-hosted URL or another trusted HTTPS source configured by the administrator.

The Contact section is populated dynamically. Each configured social or contact platform can be displayed with its platform name, link, and optional custom SVG icon. Do not assume that the footer contains a public administration link; the administration route is a separate operational interface.

---

## 3. Design System

### 3.1 Liquid Glass principles

Liquid Glass is used as a controlled surface treatment, not as a replacement for layout. It appears in:

- Hero framing and ambient backgrounds.
- Filter panels.
- Product information surfaces.
- Order and success modals.
- Administrative controls and action rows.
- Back-navigation elements and selected states.

When adding a new component, preserve the following rules:

1. Keep the content hierarchy readable without blur.
2. Use transparency and backdrop blur only where the background can support it.
3. Prefer thin borders and restrained shadows over heavy card decoration.
4. Keep buttons consistent with the existing Edit/Delete and primary-action vocabulary.
5. Maintain visible keyboard focus states.
6. Test the surface on both light imagery and dark imagery.
7. Never use a glass effect to hide a contrast problem that should be solved with typography or spacing.

### 3.2 Typography and spacing

The storefront uses a restrained editorial hierarchy. Titles, labels, metadata, and actions should remain distinguishable at a glance. Avoid introducing unrelated font families, excessive rounded cards, or dense dashboard patterns that compete with the product photography.

### 3.3 Images

Every image has a role. Before adding a new image, decide whether it is intended for:

- Full-screen hero.
- About Us or editorial storytelling.
- Product card.
- Product detail gallery.
- Technical sheet.
- Contact or project section.
- Mobile crop.

Use the correct aspect ratio for the role. Do not force a portrait product image into a wide hero slot without testing the crop and the text contrast.

---

## 4. Repository Structure

```text
Tiddis-tapis/
├── index.html
├── product.html
├── bahi2005.html
├── firestore.rules
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js
│   ├── admin-auth.js
│   ├── admin.js
│   └── store.js
├── DATA_STRUCTURE_V2.md
├── BASELINE_AUDIT.md
├── PHASE2_DATA_SECURITY_DESIGN.md
└── TIDDIS_TAPIS_FINAL_ENHANCEMENT_REPORT.md
```

The repository is a static site. There is currently no `package.json`, bundler, framework build, server route, or SQL migration layer required for the storefront.

### 4.1 HTML entry points

`index.html` contains the public shell. It defines the DOM mount points that `store.js` expects, including:

```html
<div id="hero-slider-container"></div>
<section id="search-filter-section"></section>
<div id="products-grid"></div>
<section id="about-section"></section>
<section id="contact-section"></section>
<div id="order-modal"></div>
<div id="order-success-modal"></div>
```

Do not rename these IDs without updating every corresponding query in `js/store.js`.

`product.html` contains the detail-page mount points and the hidden technical-sheet template. `bahi2005.html` contains the administration DOM and form controls consumed by `admin.js`.

---

## 5. JavaScript Modules

### 5.1 `js/firebase-config.js`

This module initializes the Firebase application, Firestore client, and Firebase Authentication client. It is imported by the store and administration modules.

Developer responsibilities:

- Keep the Firebase project configuration consistent with the deployed environment.
- Do not put ImgBB, Cloudinary, or other server-side secrets in this file.
- Keep Firebase configuration separate from UI logic.
- Verify that the production hostname is listed in Firebase Authentication Authorized Domains.

### 5.2 `js/admin-auth.js`

This module owns the administration authentication flow. It listens for the Firebase authentication state and controls the transition between the login shell and the administrative workspace.

When changing login behaviour, test:

- Invalid credentials.
- A valid newly-created Firebase user.
- Refresh after successful login.
- Logout and return to the login screen.
- Expired or missing sessions.
- A narrow mobile viewport.

Authentication is not the same as authorization. The current Firestore rules allow any authenticated user to write to several content collections. Role-based access must be added before giving the panel to multiple teams.

### 5.3 `js/store.js`

This is the main storefront controller. It owns the public application state and UI operations, including:

- Firestore content subscriptions or reads.
- Product and category loading.
- Category hierarchy resolution.
- Dynamic attribute loading.
- Search state.
- Category, price, colour, and attribute filters.
- Product grid rendering.
- Grid density switching.
- Hero slider rendering and interaction.
- Sidebar and hamburger state.
- Product detail loading.
- Variant selection.
- Delivery calculation.
- Order modal state.
- Firestore order creation.
- Success modal handling.
- Technical sheet PDF generation.
- Contact and About Us settings.

The module uses shared application state and derived indexes to avoid rebuilding all relationships on every click. Keep data normalization in one place so that product cards, the detail page, and filters do not interpret the same field differently.

### 5.4 `js/admin.js`

This module controls the management experience. It is responsible for:

- Loading content collections.
- Opening and closing management sections.
- Adding, editing, and deleting products.
- Adding, editing, and deleting categories and subcategories.
- Managing dynamic attributes and values.
- Managing Hero slides.
- Managing image uploads and image-source configuration.
- Managing delivery fees.
- Reading, updating, and deleting orders.
- Updating settings, About Us, branding, colours, social links, and contact data.
- Showing internal success and error messages instead of browser `alert()` dialogs.
- Maintaining consistent action button classes and responsive rows.

When adding an administration feature, implement the complete loop:

```text
HTML control
    ↓
DOM reference
    ↓
Validation
    ↓
Firestore read/write
    ↓
UI refresh
    ↓
Success/error feedback
```

A button that changes only the DOM but does not update Firestore is not a complete feature.

---

## 6. Firestore Data Model

The current project uses separate Firestore collections.

| Collection | Public read | Public create | Authenticated read/write | Purpose |
|---|---:|---:|---:|---|
| `products` | Yes | No | Yes, under current rules | Product catalogue, images, attributes, and variants. |
| `categories` | Yes | No | Yes, under current rules | Main categories, subcategories, and ordering. |
| `attributes` | Yes | No | Yes, under current rules | Dynamic filters such as quality, colour, size, and custom values. |
| `settings` | Yes | No | Yes, under current rules | Store settings, hero configuration, delivery, branding, About Us, and contact data. |
| `orders` | No | Yes | Authenticated read/write | Customer order requests and operational status. |

### 6.1 Product data

The product editor supports the following functional concepts:

- Product identity and display name.
- Parent category or subcategory.
- Overview grouping where configured.
- Base price.
- Main image.
- Additional gallery images.
- Technical-sheet image.
- Quality.
- Size.
- Colour.
- Customizable-size flag.
- Variant rows with size, colour, price, and related product information.
- Descriptive content used by cards, detail pages, filters, and the PDF sheet.

A representative document may look like this:

```js
{
  name: "KSOR Classic",
  category: "ksor",
  overviewCategory: "exclusive",
  basePrice: 12500,
  mainImage: "https://cdn.example.com/rugs/ksor-main.jpg",
  additionalImages: [
    "https://cdn.example.com/rugs/ksor-detail-01.jpg",
    "https://cdn.example.com/rugs/ksor-detail-02.jpg"
  ],
  pdfImage: "https://cdn.example.com/rugs/ksor-detail-01.jpg",
  customizableSize: false,
  attributes: {
    quality: "Handmade",
    color: "Ivory"
  },
  variants: [
    {
      size: "200 × 300 cm",
      color: "Ivory",
      price: 12500
    }
  ]
}
```

The object is illustrative. Always confirm field names in the current form and persistence code before adding a migration.

### 6.2 Categories and hierarchy

Categories are not merely visual labels. They drive:

- Sidebar navigation.
- Hero internal-link destinations.
- Category filters.
- Product grouping.
- Parent-to-child matching.
- Overview section generation.

When a new category or subcategory is created, verify that the following are refreshed:

1. Sidebar links.
2. Hero destination options.
3. Filter options.
4. Product editor category options.
5. Category-based product matching.

### 6.3 Attributes

The `attributes` collection allows the administrator to define filter groups without changing the HTML for every new attribute. A typical attribute has:

```js
{
  name: "quality",
  label: "Quality",
  type: "select",
  options: [
    { label: "Handmade", value: "handmade" },
    { label: "Premium", value: "premium" }
  ],
  order: 1,
  active: true
}
```

Attribute names should be stable identifiers. Display labels may change, but changing a stored value requires a migration or compatibility mapping.

### 6.4 Settings

Settings may contain several independently managed areas:

- Hero slides.
- Store logo and brand assets.
- About Us text and image.
- Contact text.
- Social/contact links.
- Colour and visual settings.
- Delivery configuration.
- Image database providers.
- Optional Google Sheets Web App configuration.

Keep large image payloads out of Firestore. Store URLs and metadata instead of base64 image data. Firestore documents have size constraints, and large catalogue payloads should be split into collections rather than accumulated inside one settings document [3].

### 6.5 Orders

A public order document should contain enough information for the team to identify the request without trusting client-calculated totals as authoritative financial data.

The current client-side flow records:

- Customer name.
- Phone number.
- Wilaya.
- Product identity.
- Selected variant or size.
- Optional custom size.
- Subtotal.
- Delivery fee.
- Total.
- Creation timestamp when written by the client flow.
- Operational status when updated by the administration panel.

For a production commerce system, prices and totals should be revalidated by a trusted server-side function before an order is accepted as final.

---

## 7. Firestore Rules and Security Model

The current `firestore.rules` file is deliberately readable and documents the present access model:

```text
products     public read; authenticated write
categories   public read; authenticated write
attributes   public read; authenticated write
settings     public read; authenticated write
orders       public create; authenticated read/update/delete
```

The relevant current rule shape is:

```js
match /orders/{orderId} {
  allow create: if true;
  allow read, update, delete: if request.auth != null;
}
```

This makes public ordering possible, but it also means that the current rules do not distinguish between Admin, Editor, and Marketing users. Authentication confirms that a user is signed in; it does not prove that the user should be allowed to modify every collection.

### 7.1 Required hardening before multi-user production

Before opening the panel to a team, implement:

- Custom claims or a protected role document.
- Separate permissions for Admin, Editor, and Marketing.
- Field-level validation with `request.resource.data`.
- Server-side validation for price and delivery calculations.
- Rate limiting or anti-bot protection for public order creation.
- Input length limits and allowed-value checks.
- Audit logs for content changes.
- Automated Firestore backups.
- Monitoring for suspicious order volume.

Firebase Security Rules provide access control and data validation, but they should be designed and tested as part of the complete application security model [4].

### 7.2 XSS and untrusted content

Some interface sections are rendered dynamically. Treat Firestore content as untrusted input:

- Escape user-controlled text before inserting it into HTML.
- Prefer `textContent` and DOM creation APIs where possible.
- Use a strict allowlist for URLs and protocols.
- Sanitize SVG uploads and do not render arbitrary inline SVG from untrusted users.
- Do not interpolate raw customer input into `innerHTML`.
- Add a Content Security Policy when the hosting environment is ready.

There is no SQL database in this project, so SQL injection is not the relevant threat. The important risks are unauthorized writes, XSS, malicious URLs, spam, exposed API keys, and unsafe file content.

---

## 8. Administration Panel Guide

### 8.1 Authentication

The panel is available at `bahi2005.html`. A user must be created in Firebase Authentication with the Email/Password provider enabled.

Typical login troubleshooting:

1. Confirm that Email/Password is enabled.
2. Confirm that the account exists in Firebase Authentication Users.
3. Confirm that the password is correct.
4. Confirm that the deployed domain is an Authorized Domain.
5. Open the browser Console and Network panels.
6. Check whether the error comes from Auth, Firestore, or a JavaScript selector.

### 8.2 Products

The product editor is designed around a collapsed-list workflow: each existing product appears as a concise row and opens when the user selects Edit. This keeps the management panel usable on a phone and prevents every form from being open simultaneously.

Product operations include:

- Create.
- Edit.
- Delete.
- Set the primary image.
- Add or remove additional images.
- Add or remove variants.
- Configure quality, colour, size, and price data.
- Mark a product as customizable by size where supported.
- Select the image used in the technical sheet.

Every action must show an internal success or error state and refresh the visible list after a successful Firestore write.

### 8.3 Categories and subcategories

The category editor supports main categories and subcategories. Ordering is important because it affects navigation, filters, and hero destinations. The panel uses drag-and-drop ordering where configured and requires an explicit save action to persist the final sequence.

### 8.4 Attributes

Administrators can create and manage dynamic attribute groups. Use stable values for filtering and human-readable labels for the interface. Avoid changing a value that is already stored on products without planning a migration.

### 8.5 Hero slides

Hero management supports the visual and routing metadata described in Section 2.4. Always test a new slide in both orientations:

- Desktop: wide image, readable overlay, brand name visible.
- Mobile: image nearly fills the viewport, blurred ambient background extends behind it, and the text remains readable without a white block behind the brand.

### 8.6 Orders

The Orders section is the internal operational queue. It is not public. Treat phone numbers and customer information as confidential. The current design supports operational status updates; do not expose order data through a public Firestore query.

### 8.7 Delivery

Delivery settings support configurable rates by Wilaya and broader controls such as a common rate or free delivery mode when provided by the current panel configuration. After changing delivery data, test a complete order calculation from a product page.

### 8.8 Image sources

The image-source area is designed for sensitive API values. The current client-side approach stores configured keys locally in the administrator's browser rather than in Firestore. This is safer than publishing them to the public database, but it is not equivalent to a server-side secret vault.

For a shared team workflow, move provider calls to a trusted backend or serverless function and issue short-lived, scoped credentials where possible.

---

## 9. Technical Sheet PDF

The product detail flow can generate a premium technical sheet from an off-screen A4 template. The client-side toolchain uses:

- `html2canvas` to render the HTML sheet.
- `jsPDF` to create the PDF document.
- `qrcodejs` when a QR code is included in the current flow.

The sheet is expected to include product branding, product identity, the selected image, price, quality, size, colour, description, contact information, and any available document or QR reference.

Implementation rules:

- Keep the sheet image contained rather than cropped.
- Preserve the original aspect ratio.
- Keep the template within the intended A4 bounds.
- Test portrait product images as well as landscape images.
- Test products with no additional image, one image, and many images.
- Do not assume that a browser download confirms that the generated PDF is visually correct; open the file and inspect it.

---

## 10. Local Development

### 10.1 Requirements

- A modern browser with ES Module support.
- Python 3 or another static HTTP server.
- A Firebase project with Firestore enabled.
- Firebase Authentication with Email/Password enabled for administration testing.
- A valid local or deployed Firebase configuration.

### 10.2 Clone and serve

```bash
git clone https://github.com/bahihs75/Tiddis-tapis.git
cd Tiddis-tapis
python3 -m http.server 4174
```

Open:

```text
http://127.0.0.1:4174/index.html
```

Do not open the files directly with `file://`. Browser modules and Firebase requests should be tested through HTTP.

### 10.3 Application routes

```text
http://127.0.0.1:4174/index.html
http://127.0.0.1:4174/product.html?id=PRODUCT_DOCUMENT_ID
http://127.0.0.1:4174/bahi2005.html
```

### 10.4 Syntax checks

```bash
node --check js/store.js
node --check js/admin.js
node --check js/admin-auth.js
node --check js/firebase-config.js
git diff --check
```

`node --check` validates JavaScript syntax. It does not replace browser testing because these modules depend on the DOM, Firebase, and browser APIs.

### 10.5 Browser test checklist

Before merging a change, test the following:

| Area | Checks |
|---|---|
| Storefront | Hero renders, navigation opens, search works, filters reset correctly, product cards open details. |
| Filters | Multiple values within one group use OR; different groups use AND; parent categories include descendants. |
| Product page | Back button works, thumbnails work, variants update the summary, order opens, PDF button works. |
| Order flow | Required fields validate, delivery changes with Wilaya, order is created, success modal appears. |
| Admin | Login, logout, refresh session, create/edit/delete actions, internal feedback, responsive layout. |
| Mobile | 375px and 390px widths, no horizontal overflow, hero fills the viewport, admin rows remain usable. |
| Accessibility | Keyboard focus, labels, `aria-expanded`, reduced motion, readable contrast. |
| Security | Anonymous users cannot read orders; unauthenticated users cannot write content collections. |

---

## 11. Firebase Setup

1. Create or select a Firebase project.
2. Enable Cloud Firestore.
3. Enable Authentication → Email/Password.
4. Create an administration user.
5. Update `js/firebase-config.js` for the correct Firebase project.
6. Verify the required collections and document shapes.
7. Add local and production domains to Authorized Domains.
8. Review `firestore.rules` before deployment.
9. Deploy rules with the Firebase CLI:

```bash
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules
```

Do not copy production credentials into a public issue, screenshot, or commit. Firebase client configuration is not a substitute for Firestore rules or role enforcement.

---

## 12. Deployment

The project can be deployed to any static host that serves HTML, CSS, JavaScript modules, and assets. Known suitable targets include Cloudflare Pages, GitHub Pages, Netlify, and Vercel static hosting. Cloudflare Pages documents direct deployment for static HTML projects [2].

Deployment checklist:

1. Confirm `index.html` is the public entry point.
2. Add a custom `404.html` only when the deployment requires a custom not-found page; it is not currently part of the repository.
3. Add a `favicon.svg` only when the document head references it; it is not currently part of the repository.
4. Add the production hostname to Firebase Authorized Domains.
5. Test Firebase reads and Auth on the production hostname.
6. Confirm Firestore rules are the intended production version.
7. Test a real mobile order request.
8. Confirm images use stable HTTPS URLs.
9. Inspect the technical PDF on a real device.
10. Review browser Console and Network errors after deployment.

---

## 13. Performance and Scalability

The current static architecture keeps the initial tooling small and avoids a framework build step. The main performance controls are:

- Shared application state in `store.js`.
- Derived maps for category and Overview lookups.
- Skeleton loading cards.
- Lazy loading for images below the fold.
- Incremental rendering through Load More.
- Responsive CSS instead of duplicated mobile pages.
- Contained detail-page imagery.
- Reduced DOM work through fragments and targeted updates where implemented.

When the catalogue grows, move from loading the entire collection to Firestore pagination with `limit` and `startAfter`. Add the required indexes and loading states before changing the rendering loop.

For image performance:

- Store originals separately from delivery versions.
- Prefer WebP or AVIF delivery versions when supported by the chosen host.
- Use fixed dimensions or responsive image variants to reduce layout shift.
- Keep hero images high quality but appropriately compressed.
- Do not load every gallery image before the visitor requests it.

---

## 14. Accessibility and Responsive Behaviour

The interface includes accessible labels for navigation controls, form labels, visible focus states, responsive layouts, and mobile-specific controls. Continue to preserve these behaviours when editing:

- Use semantic buttons for actions.
- Keep `aria-label` and `aria-expanded` synchronized with menu state.
- Never use a clickable `div` where a button or link is appropriate.
- Ensure text remains readable over hero imagery.
- Respect `prefers-reduced-motion` when adding slider or drag effects.
- Keep tap targets large enough on touch devices.
- Avoid horizontal overflow in both storefront and administration layouts.
- Test with keyboard navigation and a screen reader before shipping major UI changes.

---

## 15. SEO, Privacy, and Marketing Extensions

The current project can be extended with:

- `sitemap.xml` and `robots.txt`.
- Product structured data.
- Open Graph and Twitter/X card metadata.
- A privacy policy and terms page.
- Consent-controlled analytics.
- UTM capture for campaign attribution.
- Meta Pixel or TikTok Pixel only after an appropriate consent flow.
- A PWA manifest for the administration team's daily use.

Tracking tools should not be loaded before the visitor's consent where applicable. Store only the minimum campaign data required and document retention and deletion rules.

---

## 16. Recommended Roadmap

### Security and governance

- Add Admin, Editor, and Marketing roles.
- Add custom claims or protected role documents.
- Validate all content writes in Firestore Rules and/or a trusted backend.
- Add an audit log with actor, action, document, and timestamp.
- Add export/import backups with schema validation.
- Add spam protection and rate limits for public orders.
- Move image-provider API calls to a server-side or serverless layer.

### Catalogue operations

- Add Draft, Published, and Archived product states.
- Add scheduled publishing for campaigns and offers.
- Add bulk import/export with validation.
- Add image focal-point controls for hero crops.
- Add an internal visual asset library with licence status, tags, aspect ratio, and target section.

### Customer experience

- Add saved products or a shortlist.
- Add comparison for selected rugs.
- Add richer project and collection pages.
- Add order status notifications through a privacy-conscious channel.
- Improve search indexing for large catalogues.

### Engineering maturity

- Add automated tests for filtering, totals, permissions, and order creation.
- Add schema validation for Firestore documents.
- Add a staging Firebase project.
- Add CI checks for JavaScript syntax, broken local paths, and Firestore rule changes.
- Consider TypeScript only when the JavaScript surface becomes difficult to maintain; do not migrate for fashion alone.

---

## 17. Contribution Workflow

Before changing code:

1. Read the relevant audit or data-structure document.
2. Identify the DOM IDs and Firestore fields used by the feature.
3. Preserve the Liquid Glass visual language.
4. Separate UI changes from data migrations where possible.
5. Validate both desktop and mobile layouts.
6. Run syntax and diff checks.
7. Test the complete user flow, not only the changed button.
8. Review security implications for every new Firestore write.
9. Document new fields and settings.
10. Never commit secrets or unverified commercial imagery.

Suggested Git workflow:

```bash
git checkout -b feature/short-description
# make changes
node --check js/store.js
node --check js/admin.js
git diff --check
git status
git add .
git commit -m "Describe the change clearly"
git push -u origin feature/short-description
```

Keep commits focused. A visual adjustment, a Firestore rules change, and a data migration should normally be reviewable as separate concerns unless they must ship together.

---

## 18. Current Implementation Status

The current project includes:

- A responsive static storefront.
- Liquid Glass surfaces and ambient hero treatment.
- A configurable Hero Slider.
- Search and advanced filters.
- Parent/subcategory-aware product matching.
- Desktop grid density controls.
- Mobile single-column product presentation.
- Product detail pages with thumbnails and variants.
- Public order creation in Firestore.
- Wilaya-based delivery settings.
- Technical Sheet PDF generation.
- Firebase Authentication for the administration area.
- Product, category, attribute, hero, order, delivery, settings, and image-source management.
- About Us and Contact content areas.
- Internal success and error feedback.
- Responsive administration controls.

The following are recommended next-stage improvements and should not be described as complete until implemented and tested:

- Fine-grained roles.
- Audit history.
- Full server-side validation.
- Automated backups.
- Advanced spam protection.
- Product lifecycle states.
- Scheduled publishing.
- Consent-controlled marketing pixels.
- Comprehensive automated tests.

---

## 19. Licensing and Image Rights

The repository does not currently provide an open-source `LICENSE` file. Do not assume that the code, brand identity, product photography, or visual assets can be reused commercially outside the project.

For every image added to the storefront:

- Record the source URL.
- Verify the commercial-use licence.
- Keep proof of permission where necessary.
- Do not copy images from commercial catalogues, marketplaces, or editorial websites without permission.
- Keep reference images separate from approved production assets.
- Add attribution when the licence requires it.

The same rule applies to SVG icons, fonts, textures, and AI-generated or externally sourced assets.

---

## 20. References

The project-specific facts in this document come from the repository's current HTML, CSS, JavaScript, Firestore rules, and project reports. The following references document the external technologies and standards mentioned above:

1. [MDN Web Docs — JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
2. [Cloudflare Pages — Deploy a Static HTML Site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
3. [Firebase — Cloud Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
4. [Firebase — Get Started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
5. [Firebase — Security Rules Conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
6. [html2canvas — Official Repository](https://github.com/niklasvh/html2canvas)
7. [jsPDF — Official Repository](https://github.com/parallax/jsPDF)
8. [qrcodejs — Official Repository](https://github.com/davidshimjs/qrcodejs)

---

## Final Note

Tiddis Tapis is intentionally small at the infrastructure level and ambitious at the experience level. The current architecture makes it easy to deploy and operate, while the data model and administration layer provide a foundation for deeper catalogue governance, role-based workflows, and richer marketing operations.

The guiding rule for future development is simple:

> **Keep the product visible, keep the data trustworthy, keep the interface calm, and make every administrative action explainable.**

**TIDDIS TAPIS — Rugs with a sense of place.**
