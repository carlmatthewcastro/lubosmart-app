# ERP product categories

Source: `ITEP 308 CATEGORIES.pdf`, supplied by the user and reviewed on 2026-10-06. The PDF contains **14 departments and 83 subcategories (97 canonical rows)**. Automotive has five subcategories; each other department has six. Group 9/12 annotations are classroom assignments, not category labels.

## Canonical taxonomy

| Department | Subcategories |
| --- | --- |
| Pet Supplies | Dog Food & Treats; Cat Litter & Accessories; Aquariums & Fish Supplies; Bird Feeders & Food; Pet Grooming Products; Pet Health & Wellness |
| Electronics and Gadgets | Mobile Phones & Accessories; Laptops, Desktops & Monitors; Audio & Video Equipment; Smart Home Devices; Cameras & Photography; Wearable Technology |
| Women's Apparel | Dresses & Skirts; Tops & Blouses; Activewear & Yoga Pants; Lingerie & Sleepwear; Jackets & Coats; Shoes & Accessories |
| Men's Apparel | Suits & Blazers; Casual Shirts & Pants; Outerwear & Jackets; Activewear & Fitness Gear; Shoes & Accessories; Grooming Products |
| Kids and Baby | Baby Clothes & Accessories; Toys & Games; Educational Materials; Strollers & Gear; Nursery Furniture; Safety and Health |
| Home and Garden | Kitchen Appliances; Furniture & Decor; Gardening Tools; Outdoor Living; Home Improvement Tools; Bedding & Bath |
| Sports and Outdoors | Fitness Equipment; Camping & Hiking Gear; Sports Apparel; Cycling & Bikes; Water Sports; Team Sports Equipment |
| Health and Beauty | Skincare Products; Haircare Solutions; Makeup & Cosmetics; Personal Care Appliances; Men's Grooming; Health Supplements |
| Books and Media | Fiction & Non-Fiction Books; Magazines & Periodicals; Music CDs & Vinyl Records; Movie DVDs & Blu-ray; Video Games & Consoles; Educational DVDs |
| Food and Gourmet | Baking Supplies & Ingredients; Coffee, Tea & Beverages; Snacks & Candy; Specialty Foods & International Cuisine; Organic and Health Foods; Meal Kits & Prepped Foods |
| Automotive & Motorcycle | Protective Gear; Maintenance & Repair Tools; Parts & Accessories; Electrical Components; Tires, Wheels, and Fluids |
| Furniture and Office Equipment | Office Desks & Chairs; Storage Cabinets & Shelving; Conference & Meeting Furniture; Computer Tables & Workstations; Ergonomic Accessories; Office Lighting & Fixtures |
| Jewelry and Watches | Necklaces & Pendants; Rings & Earrings; Bracelets & Bangles; Watches for Men & Women; Fashion Jewelry; Jewelry Storage & Care |
| Office and School Supplies | Notebooks & Paper Products; Writing Instruments; Office Furniture; Printers & Printing Supplies; School Bags & Backpacks; Arts & Craft Materials |

## Database mapping and limits

`categories.parent_id` is null for departments and references the department for subcategories. Products retain `category_id`; stores optionally declare a root `business_category_id`. The unique canonical slug includes its department for child rows, so the two Shoes & Accessories categories remain distinct. Names are unique within a parent; globally unique names would reject the PDF's taxonomy.

The canonical import is `config/marketplace_categories.php` and `MarketplaceCategorySeeder`. Runtime catalog queries read persisted categories, not hardcoded dropdown arrays. The seed is a versioned source import; it does not replace dynamic catalog management. It preserves custom rows and IDs, adopts exact-name legacy departments, and preserves a category's disabled state. Reseeding deliberately restores canonical labels/parent associations and ordering of child rows. Run only one taxonomy import at a time.

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
```

Legacy rows retain null slugs/parents; do not guess the destination of an ambiguous legacy label. Map referenced products explicitly with owner review. Do not reassign existing products silently. Nullable store department allows compatible rollout; require and validate it during future seller onboarding and review existing stores before tightening the constraint.

New category management must permit exactly two levels, reject cycles/self-parenting, require a root department for store classification and a leaf for new products, and prevent cross-department moves of referenced categories without a reviewed product migration. The self-FK does not enforce depth or cycles. Root slugs are the canonical identity; nullable-parent uniqueness alone does not ensure globally unique root names across all database engines.

Checkout now rejects a disabled product category/parent and a product outside its store's declared department. Product creation/editing policies and taxonomy management screens remain pending. Product-category presence does not waive moderation or logistics eligibility; see [business rules](business-rules.md).

`core-schema-erd.md` remains the canonical [schema reference](../architecture/core-schema-erd.md). Product departments are distinct from five user roles and functional ERP modules.
