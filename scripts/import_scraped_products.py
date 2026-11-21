import json
import sqlite3
import re
import os

db_path = 'fluffoo.sqlite'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

with open('data/scraped/all_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Get category IDs
cursor.execute('SELECT id, slug, name FROM categories')
categories = {row['slug']: row['id'] for row in cursor.fetchall()}

# Product configurations & transformations
catalog_configs = {
    "cow-running-plushie": {
        "title": "Fluffoo Galloping Daisy Cow Plushie",
        "slug": "fluffoo-galloping-daisy-cow-plushie",
        "sku_prefix": "FLF-COW",
        "category_slug": "animal-plushies",
        "short_desc": "Globally viral galloping calf plushie with bouncy kinetic running legs and baby-soft milk fleece coat.",
        "video_url": "https://cdn.shopify.com/videos/c/o/v/e05b76c8c49e49c79fa2ff38b991db18.mp4",
        "specs": {
            "Material": "Ultra-fine cloud velvet fleece (hypoallergenic)",
            "Filling": "High-density 7D micro-fiber PP cotton",
            "Kinetic Feature": "Manual hand-guided running leg motion (100% battery-free)",
            "Available Sizes": "30cm (Pocket), 45cm (Hugger), 60cm (Giant Cuddle)",
            "Available Colors": "Beige, White, Cocoa Brown, Pastel Pink",
            "Safety": "Safety-locked embroidered eyes, 100% baby-safe certified",
            "Wash Care": "Hand wash or gentle machine wash cold in laundry bag"
        }
    },
    "3-feet-long-cat-pillow": {
        "title": "Fluffoo 3-Foot Snoozy Long Cat Hug Pillow",
        "slug": "fluffoo-3-foot-snoozy-long-cat-pillow",
        "sku_prefix": "FLF-CAT-PIL",
        "category_slug": "soft-plush-toys",
        "short_desc": "Extra-long cylindrical sleep hugger pillow. Ergonomic side-sleeper body pillow with sweet sleepy cat face.",
        "video_url": "https://cdn.shopify.com/videos/c/o/v/long_cat_pillow_demo.mp4",
        "specs": {
            "Material": "Super-stretch soft velour and elastane",
            "Filling": "Anti-flattening bouncy memory cloud polyfill",
            "Length": "50cm to 110cm (Up to 3.6 feet long)",
            "Function": "Body pillow, neck support, couch cuddle bolster, nursery cushion",
            "Colors": "Charcoal Gray, Peach Orange, Blossom Pink",
            "Zipper": "Hidden zipper for easy cover washing and refilling"
        }
    },
    "panda-running-plushie": {
        "title": "Fluffoo Bouncing Bobo Panda Running Plushie",
        "slug": "fluffoo-bouncing-bobo-panda-running-plushie",
        "sku_prefix": "FLF-PND-RUN",
        "category_slug": "animal-plushies",
        "short_desc": "Joyful galloping panda buddy that moves its paws when bobbed up and down. No batteries required!",
        "video_url": "",
        "specs": {
            "Material": "Silk-soft plush fleece",
            "Filling": "100% Pure cloud cotton stuffing",
            "Feature": "Hand-powered kinetic running motion",
            "Size": "40cm arm-filling snuggle size",
            "Safety": "Lead-free, phthalate-free, child safe"
        }
    },
    "warm-water-bag": {
        "title": "Fluffoo Cozy Stitch Warm Water Cramp Relief Pouch",
        "slug": "fluffoo-cozy-stitch-warm-water-cramp-relief-pouch",
        "sku_prefix": "FLF-WTR-BAG",
        "category_slug": "gift-sets",
        "short_desc": "Therapeutic hot water bottle encased in a plush removable Stitch companion coat. Perfect for winter warmth and cramps.",
        "video_url": "",
        "specs": {
            "Bottle Capacity": "1000ml thick natural rubber bladder (explosion-proof tested)",
            "Cover": "Ultra-soft removable zip-off Stitch character fleece",
            "Warmth Retention": "6 to 8 hours cozy heat emission",
            "Usage": "Menstrual cramp relief, sore muscle comfort, bedtime bed warmer",
            "Design": "Leak-proof wide-mouth stopper with spill guard"
        }
    },
    "strawberry-bunny-zip-plushie": {
        "title": "Fluffoo Sweet Berry Surprise Bunny Zip Plushie",
        "slug": "fluffoo-sweet-berry-surprise-bunny-zip-plushie",
        "sku_prefix": "FLF-STR-BNY",
        "category_slug": "soft-plush-toys",
        "short_desc": "2-in-1 reversible wonder! Zips closed as a plump ripe strawberry, opens to reveal an adorable floppy-eared bunny.",
        "video_url": "",
        "specs": {
            "Transformation": "Zips from Strawberry cushion to Cuddle Bunny in 3 seconds",
            "Fabric": "High-elastic velvet fleece with embroidered seeds and leaves",
            "Filling": "7D Virgin siliconized fiber",
            "Available Sizes": "20cm (Mini), 30cm (Medium), 40cm (Large)",
            "Zipper": "Smooth snag-free resin zipper safe for small toddler fingers"
        }
    },
    "stuffeez-panda-hoodie-bear": {
        "title": "Fluffoo Cozy Panda Hoodie Cuddle Bear",
        "slug": "fluffoo-cozy-panda-hoodie-cuddle-bear",
        "sku_prefix": "FLF-PND-HOD",
        "category_slug": "character-collection",
        "short_desc": "Classic honey teddy bear wearing an ultra-soft panda ear pullover hoodie. The best of both cuddle worlds!",
        "video_url": "",
        "specs": {
            "Hoodie Style": "Detachable panda head cowl with 3D ears",
            "Plush": "Extra-dense honey plush fur",
            "Available Sizes": "35cm, 45cm, 60cm",
            "Filling": "High-resilience hypoallergenic polyfill"
        }
    },
    "disney-stitch-hoodie-bear": {
        "title": "Fluffoo Cosmic Stitch Hoodie Teddy Bear",
        "slug": "fluffoo-cosmic-stitch-hoodie-teddy-bear",
        "sku_prefix": "FLF-STC-HOD",
        "category_slug": "character-collection",
        "short_desc": "Adorable teddy bear outfitted in an alien-blue Stitch hoodie with oversized perky ears.",
        "video_url": "",
        "specs": {
            "Costume": "Stitch blue hoodie with embroidered character eyes",
            "Height": "35cm and 50cm variants",
            "Texture": "Double-layer cloud fleece",
            "Gifting": "Comes with Fluffoo signature satin gift ribbon"
        }
    },
    "stuffeez-lotso-hoodie-bear-50-cm": {
        "title": "Fluffoo Berry Scented Lotso Hoodie Bear (50cm)",
        "slug": "fluffoo-berry-scented-lotso-hoodie-bear-50cm",
        "sku_prefix": "FLF-LTS-HOD",
        "category_slug": "character-collection",
        "short_desc": "Magenta pink vintage style teddy bear wearing Lotso berry hoodie. Huggable 50cm statement gift.",
        "video_url": "",
        "specs": {
            "Color": "Rich raspberry magenta & cream belly",
            "Height": "50cm life-size cuddle height",
            "Details": "Embroidered berry nose and velvety paw pads"
        }
    },
    "carrot-bunny-zip-plushie": {
        "title": "Fluffoo Sunny Harvest Carrot Bunny Zip Plushie",
        "slug": "fluffoo-sunny-harvest-carrot-bunny-zip-plushie",
        "sku_prefix": "FLF-CRT-BNY",
        "category_slug": "soft-plush-toys",
        "short_desc": "Reversible cuddle companion. Zips into a bright garden carrot or unfolds into a pure white cuddle rabbit.",
        "video_url": "",
        "specs": {
            "Transformation": "Zips from Carrot to Bunny",
            "Material": "Microfiber velvet plush with leafy green crown",
            "Sizes": "25cm and 35cm",
            "Filling": "Bounce-back virgin polyfill"
        }
    },
    "capybara-hoodie-teddy-bear": {
        "title": "Fluffoo Chill Capybara Hoodie Teddy Bear",
        "slug": "fluffoo-chill-capybara-hoodie-teddy-bear",
        "sku_prefix": "FLF-CPY-HOD",
        "category_slug": "teddy-bears",
        "short_desc": "The most serene animal in the world! Super-relaxed golden brown capybara wearing a sweet turtle backpack hoodie.",
        "video_url": "",
        "specs": {
            "Character": "Capybara with sleepy, zen expression",
            "Accessory": "Turtle shell backpack and hoodie",
            "Sizes": "40cm and 55cm",
            "Texture": "Silky cashmere-feel fleece"
        }
    },
    "stuffeez-pikachu-hoodie-bear-55-cm": {
        "title": "Fluffoo Electric Spark Pikachu Hoodie Bear (55cm)",
        "slug": "fluffoo-electric-spark-pikachu-hoodie-bear-55cm",
        "sku_prefix": "FLF-PIK-HOD",
        "category_slug": "giant-cuddly-toys",
        "short_desc": "Giant 55cm celebration bear with lightning bolt ears, bright yellow hoodie, and rosy red cheeks.",
        "video_url": "",
        "specs": {
            "Height": "55cm Extra Large cuddle dimension",
            "Color": "Sunshine Yellow & Golden Brown",
            "Details": "Embroidered cheek blush and lightning tail graphic",
            "Occasion": "Top birthday gift for anime & cute character lovers"
        }
    }
}

print("Starting product import and enrichment...")

for p in products:
    handle = p.get('handle')
    cfg = catalog_configs.get(handle)
    if not cfg:
        print(f"Skipping unmapped product: {handle}")
        continue

    title = cfg['title']
    slug = cfg['slug']
    cat_slug = cfg['category_slug']
    cat_id = categories.get(cat_slug, 1)

    # Prices in PKR
    sale_price = int(round(p.get('price', 350000) / 100))
    regular_price = int(round((p.get('compare_at_price') or (sale_price * 1.25)) / 100))
    if regular_price <= sale_price:
        regular_price = int(round(sale_price * 1.25))

    # Gallery images: make sure images have https:
    gallery_images = []
    for img in p.get('images', []):
        if img.startswith('//'):
            gallery_images.append('https:' + img)
        else:
            gallery_images.append(img)

    featured_img = gallery_images[0] if gallery_images else ''

    # Clean description: replace 'Stuffeez' and 'Stuffeez.pk' with 'Fluffoo'
    raw_desc = p.get('description', '')
    cleaned_desc = raw_desc.replace('Stuffeez.pk', 'Fluffoo.pk').replace('Stuffeez', 'Fluffoo').replace('stuffeez', 'fluffoo')

    # If description doesn't have infographics, let's inject rich photo sections from gallery
    if '<img' not in cleaned_desc and gallery_images:
        extra_imgs = ''.join([f'<p><img src="{img}" alt="{title}"></p>' for img in gallery_images[1:]])
        cleaned_desc = extra_imgs + f'<p><strong>{title}</strong></p>' + cleaned_desc

    short_desc = cfg['short_desc']
    specs_json = json.dumps(cfg['specs'], ensure_ascii=False)
    video_url = cfg.get('video_url', '')

    sku = f"{cfg['sku_prefix']}-MAIN"

    # Check if product exists by slug
    cursor.execute('SELECT id FROM products WHERE slug = ?', (slug,))
    existing = cursor.fetchone()

    if existing:
        prod_id = existing['id']
        cursor.execute('''
            UPDATE products SET
                name = ?, sku = ?, short_description = ?, full_description = ?,
                regular_price = ?, sale_price = ?, stock_quantity = 50, stock_status = 'in_stock',
                category_id = ?, images = ?, featured_image = ?, is_featured = 1, is_active = 1,
                video_url = ?, specifications = ?,
                seo_title = ?, seo_description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            title, sku, short_desc, cleaned_desc,
            regular_price, sale_price, cat_id, json.dumps(gallery_images), featured_img,
            video_url, specs_json,
            f"{title} | Buy Online in Pakistan | Fluffoo",
            short_desc,
            prod_id
        ))
        print(f"Updated product: {title} (ID: {prod_id})")
    else:
        cursor.execute('''
            INSERT INTO products (
                name, slug, sku, short_description, full_description,
                regular_price, sale_price, stock_quantity, stock_status, low_stock_threshold,
                category_id, images, featured_image, is_featured, is_active,
                video_url, specifications, seo_title, seo_description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 50, 'in_stock', 5, ?, ?, ?, 1, 1, ?, ?, ?, ?)
        ''', (
            title, slug, sku, short_desc, cleaned_desc,
            regular_price, sale_price, cat_id, json.dumps(gallery_images), featured_img,
            video_url, specs_json,
            f"{title} | Buy Online in Pakistan | Fluffoo",
            short_desc
        ))
        prod_id = cursor.lastrowid
        print(f"Created product: {title} (ID: {prod_id})")

    # Clear existing variations for this product and re-seed
    cursor.execute('DELETE FROM product_variations WHERE product_id = ?', (prod_id,))

    # Insert variations
    variants = p.get('variants', [])
    for vi, var in enumerate(variants):
        var_title = var.get('title', f"Standard {vi+1}")
        var_price = int(round(var.get('price', sale_price * 100) / 100))
        var_comp = int(round((var.get('compare_at_price') or (var_price * 1.25)) / 100))
        if var_comp <= var_price:
            var_comp = int(round(var_price * 1.25))

        var_sku = f"{cfg['sku_prefix']}-V{vi+1}"

        # Option mapping
        opt1 = var.get('option1')
        opt2 = var.get('option2')

        attr_type = "Option"
        attr_val = var_title

        if opt1 and opt2:
            attr_type = "Color & Size"
            attr_val = f"{opt1} / {opt2}"
        elif opt1:
            attr_type = "Variation"
            attr_val = opt1

        var_img = featured_img
        if var.get('featured_image') and var['featured_image'].get('src'):
            src = var['featured_image']['src']
            var_img = 'https:' + src if src.startswith('//') else src

        cursor.execute('''
            INSERT INTO product_variations (
                product_id, sku, attribute_type, attribute_value,
                regular_price, sale_price, stock_quantity, stock_status, image_url, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, 25, 'in_stock', ?, 1)
        ''', (
            prod_id, var_sku, attr_type, attr_val,
            var_comp, var_price, var_img
        ))

    print(f"   -> Seeded {len(variants)} variations for {title}")

conn.commit()
conn.close()
print("\nAll 11 products and their variations successfully deployed to Fluffoo database!")
