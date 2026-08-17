# Tiddis Tapis Data Structure V2

## 1. Attributes Collection (`attributes`)
This collection stores the filterable attributes and their options, allowing the admin to manage them without code changes.

```json
{
  "id": "quality",
  "label": { "en": "Quality", "ar": "الجودة" },
  "type": "list", 
  "options": ["Wool", "Silk", "Synthetic"],
  "order": 1
}
```

## 2. Updated Product Schema
Products will now link to these attributes.

```json
{
  "name": "Product Name",
  "category": "Subcategory Name",
  "overviewCategory": "Overview Subcategory Name",
  "attributes": {
    "quality": "Wool",
    "size": ["200x280 cm", "100x150 cm"],
    "color": ["Red", "Blue"]
  },
  "variants": [
    { "size": "200x280 cm", "color": "Red", "price": 7500, "image": "url" },
    { "size": "100x150 cm", "color": "Blue", "price": 8500, "image": "url" }
  ],
  "priceRange": { "min": 7500, "max": 8500 }
}
```

## 3. Filter Logic
- **Within Group (OR):** Selecting "Red" and "Blue" shows products that are either Red OR Blue.
- **Between Groups (AND):** Selecting "Red" (Color) and "Wool" (Quality) shows products that are both Red AND Wool.
- **Price Filter:** Range-based (e.g., 5000-10000 DZD).

## 4. Admin Panel Changes
- New section to manage `attributes`.
- Product form will dynamically generate inputs based on defined attributes.
- Price range auto-calculation from variants on save.
