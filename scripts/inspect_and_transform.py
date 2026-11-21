import json
import re

with open('data/scraped/all_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print(f"Total products loaded: {len(products)}")

name_mapping = {
    "cow-running-plushie": {
        "new_name": "Fluffoo Galloping Daisy Cow Plushie",
        "new_slug": "fluffoo-galloping-daisy-cow-plushie",
        "category": "Animal Plushies",
        "category_slug": "animal-plushies"
    },
    "3-feet-long-cat-pillow": {
        "new_name": "Fluffoo 3-Foot Snoozy Long Cat Hug Pillow",
        "new_slug": "fluffoo-3-foot-snoozy-long-cat-pillow",
        "category": "Soft Plush Toys",
        "category_slug": "soft-plush-toys"
    },
    "panda-running-plushie": {
        "new_name": "Fluffoo Bouncing Bobo Panda Running Plushie",
        "new_slug": "fluffoo-bouncing-bobo-panda-running-plushie",
        "category": "Animal Plushies",
        "category_slug": "animal-plushies"
    },
    "warm-water-bag": {
        "new_name": "Fluffoo Cozy Stitch Warm Water Cramp Relief Bag",
        "new_slug": "fluffoo-cozy-stitch-warm-water-cramp-relief-bag",
        "category": "Gift Sets",
        "category_slug": "gift-sets"
    },
    "strawberry-bunny-zip-plushie": {
        "new_name": "Fluffoo Sweet Berry Surprise Bunny Zip Plushie",
        "new_slug": "fluffoo-sweet-berry-surprise-bunny-zip-plushie",
        "category": "Soft Plush Toys",
        "category_slug": "soft-plush-toys"
    },
    "stuffeez-panda-hoodie-bear": {
        "new_name": "Fluffoo Cozy Panda Hoodie Cuddle Bear",
        "new_slug": "fluffoo-cozy-panda-hoodie-cuddle-bear",
        "category": "Character Collection",
        "category_slug": "character-collection"
    },
    "disney-stitch-hoodie-bear": {
        "new_name": "Fluffoo Cosmic Stitch Hoodie Teddy Bear",
        "new_slug": "fluffoo-cosmic-stitch-hoodie-teddy-bear",
        "category": "Character Collection",
        "category_slug": "character-collection"
    },
    "stuffeez-lotso-hoodie-bear-50-cm": {
        "new_name": "Fluffoo Berry Scented Lotso Hoodie Bear (50cm)",
        "new_slug": "fluffoo-berry-scented-lotso-hoodie-bear-50cm",
        "category": "Character Collection",
        "category_slug": "character-collection"
    },
    "carrot-bunny-zip-plushie": {
        "new_name": "Fluffoo Sunny Harvest Carrot Bunny Zip Plushie",
        "new_slug": "fluffoo-sunny-harvest-carrot-bunny-zip-plushie",
        "category": "Soft Plush Toys",
        "category_slug": "soft-plush-toys"
    },
    "capybara-hoodie-teddy-bear": {
        "new_name": "Fluffoo Chill Capybara Hoodie Teddy Bear",
        "new_slug": "fluffoo-chill-capybara-hoodie-teddy-bear",
        "category": "Teddy Bears",
        "category_slug": "teddy-bears"
    },
    "stuffeez-pikachu-hoodie-bear-55-cm": {
        "new_name": "Fluffoo Electric Spark Pikachu Hoodie Bear (55cm)",
        "new_slug": "fluffoo-electric-spark-pikachu-hoodie-bear-55cm",
        "category": "Giant Cuddly Toys",
        "category_slug": "giant-cuddly-toys"
    }
}

for i, p in enumerate(products, 1):
    handle = p.get('handle')
    mapping = name_mapping.get(handle, {})
    new_name = mapping.get('new_name', p.get('title'))
    new_slug = mapping.get('new_slug', handle)
    print(f"\n[{i}] {p.get('title')}")
    print(f"    -> Fluffoo Name: {new_name}")
    print(f"    -> Slug: {new_slug}")
    print(f"    -> Category: {mapping.get('category')}")
    print(f"    -> Price: Rs. {p.get('price') / 100:.0f} | Compare: Rs. {(p.get('compare_at_price') or p.get('price')*1.2) / 100:.0f}")
    print(f"    -> Variants count: {len(p.get('variants', []))}")
    print(f"    -> Options: {[opt.get('name') for opt in p.get('options', [])]}")
    print(f"    -> Gallery Images: {len(p.get('images', []))}")
    desc = p.get('description', '')
    desc_imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', desc)
    print(f"    -> Description Embedded Infographics/Images: {len(desc_imgs)}")
