import bcrypt from 'bcryptjs';
import db, { initDatabase } from './database.js';

export function runSeed() {
  initDatabase();

  console.log('🌱 Seeding database...');

  // 1. Staff Accounts
  const adminPassword = bcrypt.hashSync('FluffooAdmin2026!', 10);
  const orderMgrPassword = bcrypt.hashSync('FluffooOrders2026!', 10);
  const prodMgrPassword = bcrypt.hashSync('FluffooProducts2026!', 10);
  const payMgrPassword = bcrypt.hashSync('FluffooPay2026!', 10);

  const insertStaff = db.prepare(`
    INSERT OR IGNORE INTO staff (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);

  insertStaff.run('Super Admin', 'admin@fluffoo.pk', adminPassword, 'super_admin');
  insertStaff.run('Order Manager', 'orders@fluffoo.pk', orderMgrPassword, 'order_manager');
  insertStaff.run('Product Manager', 'products@fluffoo.pk', prodMgrPassword, 'product_manager');
  insertStaff.run('Payment Manager', 'payments@fluffoo.pk', payMgrPassword, 'payment_manager');

  // 2. Categories
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertCategory.run(
    'Teddy Bears',
    'teddy-bears',
    'Classic heirloom-grade soft plush teddy bears for all ages',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCSz0V6aidw9E1jvelAzCBqwY4TxXzMuBFoao8SabZkCXPHj00-OyM-kPfKuYMe61AfGIVnax4w3d0r6gThG_Uoz3fKxd_w1n-K9ZES193NkukORtYdUN-0ygvOZELFti7sliaPmKZ8lUDJ0MTzv60N7ZR4yxgkJNKvG3PTlTB4SPmcG6OX7dqdv7DfQ7wu9D7r1FwmOjYWgAH_bdITtlAvqPK8bvkGRMZjDdCzHh0',
    1
  );

  insertCategory.run(
    'Soft Plush Toys',
    'soft-plush-toys',
    'Ultra-soft squishy cuddles with cloud polyfill',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDhm7GKlFZW2ko_UMbEhPGSUBayR_0U_B2UPumgb-iLomqkYn3BaFO3fqYk5BgUo-mB0TJylekm7K6sTK0vSMdrTh45DSrxJUW4H_9pTfepKXqz7FqFRFGWdWqdmqUkz9M3f6dn-53mhVjSnp8KCGcyqxIEM8I0BUyHKhBNAieqcvTiyg_S8xQIcoGa75vOXzQFdMlQ4CIXR98lJDoWADKBNsjHrGdeLpiIviS3KnU',
    2
  );

  insertCategory.run(
    'Animal Plushies',
    'animal-plushies',
    'Beloved zoo, farm, and domestic cuddly creatures',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDvcqW-mKmHdvF9cauRVht84-1MGjU0YgfqCpDOfxq-gnFn3r8NSFgfANHxdab9MuTW93UYg5YUTodM23piWGFl7wFZKismPLZTZQXcfZ_6LpX5CFEJJ0mIgnocKUBCBA_3LHFIf3JM6A66rNBe6w3_-rLQcByQUrxaoH09cBOOurppL8TEJ_f-O-b69x17xtc9qVHyflND7Yg-FHT5bBDcFoLjmNYoSUHE6gt2LFQ',
    3
  );

  insertCategory.run(
    'Character Collection',
    'character-collection',
    'Meet the 4 Fluffoo Originals: Fluffoo, Wuzzle, Wobble, and Wiggly',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCI-omLJflphp7LbvLoZrGR9DxJ2mtXqxmloBqNsit-2fontEtgFjHRH26oNMPBVv4_FpIw9K0078LdHbBbVm33eUr0onfDTI6QzkC2MoI-s58f_I-o0PER6kdnr_an-5zqnq4Gm_5yPwLsJwaqnvkxDxD5802dDqsdtE0hkH47xwHvN2VO3PKkzqoOR94lN92khn38lndy6-hDNLNo2ZydEorB327mNIDWUI3TNno',
    4
  );

  insertCategory.run(
    'Giant Cuddly Toys',
    'giant-cuddly-toys',
    'Colossal 3ft to 5ft life-size companions for milestone surprises',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCyfdXdNMzyKAAa0Bj4UPOAJsHYdok7DXmvm5wym1OhENJ_A-AvGsC1veSFGW8RddOaBxdQY7_JabSZcADxniQNuK159jdGAPXUM-qY00nUq0r00z-COdW0m1iywR76PdnSW49aT2W8gmX01FuyVXSYJwNIACESdCEwP2VqLcxrLF4XKHyEsnBP8rEBDpjwxaLwaRGjXWzxVox6lnlx4AV-TTaZfmWauInGQNzVMpY',
    5
  );

  insertCategory.run(
    'Gift Sets',
    'gift-sets',
    'Luxury wrapped gift hampers with handwritten greeting cards',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAVuQZcXYiCYA5NcGyTkLASDhjyZJgE2Q8W8vFori506Xl8DLbAGMHi6Qi8AqZf839I4RUusNNvcFepJSV4NXrKYpbHEg1GBNxZNQHCLLFe2jr9pcqN_bj6GGFhwccBDdF1xbgBxWqI9nHCHhBapCOq2lUk8IouMSCaRUW7GlPO8qMNr_Eom-2WzBXs5Q8Bwy5EoBve-KonyNF1KiXN-NYGIyZdI3gxse7UuCJjC34',
    6
  );

  // 3. Products
  const categoriesList = db.prepare('SELECT id, slug FROM categories').all();
  const catMap = Object.fromEntries(categoriesList.map(c => [c.slug, c.id]));

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
      name, slug, sku, short_description, full_description,
      regular_price, sale_price, stock_quantity, stock_status, low_stock_threshold,
      category_id, images, featured_image, is_featured, is_active, seo_title, seo_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(
    'Fluffoo Original Honey Bear',
    'fluffoo-original-honey-bear',
    'FLF-HB-45',
    'Signature ultra-soft fleece with stitched heart paw and warm amber fur.',
    'Crafted with heirloom-grade velvety fleece and 7D micro-fiber cloud polyfill. Hypoallergenic, baby-safe lock eyes, and handcrafted with signature stitched heart embroidery on the paw.',
    3450,
    2850,
    45,
    'in_stock',
    5,
    catMap['teddy-bears'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBhGcFJ-ay5FMVTMioTP6qqRbgerj8FA90xsEp2aRGAYD-TZjDcFKDFtCJNt19nz1pV3OWriLgIq3YKkmGbWRfJiSEndc71hgQ038zcTJ6v20vUkjFMb38W4F9vWzdkn47z6M1W7gwtknUixs2AcPBCPginTGYAIg9qSlV5QaztrqV_p91ju5Pzha0e4n1bdCIDsOKPR3i61lP8T2CD9zeoxyH0_aWYNDyNabdLWzQ'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBhGcFJ-ay5FMVTMioTP6qqRbgerj8FA90xsEp2aRGAYD-TZjDcFKDFtCJNt19nz1pV3OWriLgIq3YKkmGbWRfJiSEndc71hgQ038zcTJ6v20vUkjFMb38W4F9vWzdkn47z6M1W7gwtknUixs2AcPBCPginTGYAIg9qSlV5QaztrqV_p91ju5Pzha0e4n1bdCIDsOKPR3i61lP8T2CD9zeoxyH0_aWYNDyNabdLWzQ',
    1,
    1,
    'Fluffoo Original Honey Bear — Ultra-Soft Teddy Bear',
    'Buy authentic Fluffoo Original Honey Bear in Pakistan. Cloud-soft polyfill, baby-safe materials, nationwide delivery.'
  );

  insertProduct.run(
    'Wobble Sleeping Cloud Bear',
    'wobble-sleeping-cloud-bear',
    'FLF-WB-60',
    'Naptime companion with sleepy embroidered eyes and soothing soft fabric.',
    'Wobble is designed specifically for serene slumber, bedtime stories, and peaceful naps. Ultra-gentle on sensitive newborn skin with zero hard plastic parts.',
    4200,
    3650,
    30,
    'in_stock',
    5,
    catMap['character-collection'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAkWbtodNZ1fkN0r1ioZvXoImyVSmkznhuM2IWh47k_ToRsfg_tsGvemfqhGtO3lRDfQ1Pg8T-F_gqqD3sXJuC_H-kuDAQlnk8rIs98J0KZqLkZF8rEace9apQiY3lTXX0F270bgmcn9NO5b5lBPKQzhGIsielqvZI6aFo_FP8oK_UBo8_wYvgtE3ZFtZ79Du3OnDbHrEQ26Jdh_IhUvEwMZHHffX71kw-RfsQ7ZlA'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkWbtodNZ1fkN0r1ioZvXoImyVSmkznhuM2IWh47k_ToRsfg_tsGvemfqhGtO3lRDfQ1Pg8T-F_gqqD3sXJuC_H-kuDAQlnk8rIs98J0KZqLkZF8rEace9apQiY3lTXX0F270bgmcn9NO5b5lBPKQzhGIsielqvZI6aFo_FP8oK_UBo8_wYvgtE3ZFtZ79Du3OnDbHrEQ26Jdh_IhUvEwMZHHffX71kw-RfsQ7ZlA',
    1,
    1,
    'Wobble Sleeping Cloud Bear — Baby Bedtime Cuddle Companion',
    'Authentic Wobble Sleeping Bear from Fluffoo. Crafted for baby naps and nursery keepsakes.'
  );

  insertProduct.run(
    'Wuzzle Berry Pink Bunny',
    'wuzzle-berry-pink-bunny',
    'FLF-WZ-38',
    'Floppy ears and squishable cloud filling in pastel berry blush.',
    'Wuzzle is the curious pink-nosed dreamer of the Fluffoo family. Featuring extra-long floppy ears and a soft heart badge, perfect for imaginative play and sweet comfort.',
    2950,
    2450,
    35,
    'in_stock',
    5,
    catMap['soft-plush-toys'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCObmC2oyf2fZr6oSIAlkwRrh3CD_9-5ZqVF6y9a81Rbc25f2VZf-i-Bvhh3PhnU4iNtaprjkrvBXeKj5Hx9DV72v2g6TDuaGIe4edfaf2szm6T5XQc-5MlQGWtySW-fPXvoS78vuQhSSoCygvpOoUHEsWP53ZKO3bw3TOZrDhdY7IbDppj0XJrvGlU2iQk9Uy0Z4Dcgg3DqlAFM_-5cjHQRSsSu7YtpX9Ba3yvLN0'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCObmC2oyf2fZr6oSIAlkwRrh3CD_9-5ZqVF6y9a81Rbc25f2VZf-i-Bvhh3PhnU4iNtaprjkrvBXeKj5Hx9DV72v2g6TDuaGIe4edfaf2szm6T5XQc-5MlQGWtySW-fPXvoS78vuQhSSoCygvpOoUHEsWP53ZKO3bw3TOZrDhdY7IbDppj0XJrvGlU2iQk9Uy0Z4Dcgg3DqlAFM_-5cjHQRSsSu7YtpX9Ba3yvLN0',
    1,
    1,
    'Wuzzle Berry Pink Bunny — Soft Floppy Ear Rabbit Plush',
    'Adorn your home with Wuzzle Berry Pink Bunny. Plush comfort delivered to your doorstep in Pakistan.'
  );

  insertProduct.run(
    'Wiggly Chubby Panda Hugger',
    'wiggly-chubby-panda-hugger',
    'FLF-WG-50',
    'Extra-stuffed rounded belly for arm-filling hugs and playful giggles.',
    'Wiggly brings endless happiness with his chubby tummy and joyful winking expression. Made with high-density polyfill for resilient squishiness that bounces right back.',
    3800,
    3100,
    25,
    'in_stock',
    4,
    catMap['animal-plushies'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDvcqW-mKmHdvF9cauRVht84-1MGjU0YgfqCpDOfxq-gnFn3r8NSFgfANHxdab9MuTW93UYg5YUTodM23piWGFl7wFZKismPLZTZQXcfZ_6LpX5CFEJJ0mIgnocKUBCBA_3LHFIf3JM6A66rNBe6w3_-rLQcByQUrxaoH09cBOOurppL8TEJ_f-O-b69x17xtc9qVHyflND7Yg-FHT5bBDcFoLjmNYoSUHE6gt2LFQ'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDvcqW-mKmHdvF9cauRVht84-1MGjU0YgfqCpDOfxq-gnFn3r8NSFgfANHxdab9MuTW93UYg5YUTodM23piWGFl7wFZKismPLZTZQXcfZ_6LpX5CFEJJ0mIgnocKUBCBA_3LHFIf3JM6A66rNBe6w3_-rLQcByQUrxaoH09cBOOurppL8TEJ_f-O-b69x17xtc9qVHyflND7Yg-FHT5bBDcFoLjmNYoSUHE6gt2LFQ',
    1,
    1,
    'Wiggly Chubby Panda Hugger — Soft Cuddle Companion',
    'Adopt Wiggly Chubby Panda Hugger. The hug-worthy buddy for playtime and naps.'
  );

  insertProduct.run(
    'Giant 5-Foot Huggable Bear',
    'giant-5-foot-huggable-bear',
    'FLF-GB-150',
    'Colossal 150cm life-size companion packed with 3.8kg of bouncy cloud polyfill.',
    'The ultimate statement gift for birthdays, anniversaries, and grand surprises. Delivered in a protective satin drawstring bag with a custom luxury bow.',
    9900,
    8450,
    15,
    'in_stock',
    3,
    catMap['giant-cuddly-toys'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBJ5dytTFSOZlOvpSRYkIo-SoBKbVaAkvj1akbUykSdvMGol1J6pUt90XIPsLPMxlPbfUroFITFlNdg8Py0TDrxVtrlNV_N2JW9yApz5sxhatJCMOj_szzVOHuSVt6EaGmRMonQ6c8pSXEjEuivdbBCOpqy7CkuS_PTGeOkiBuK-zfkP-QEZQ7E0IW5zcfK-rUFfgP6PSR88KLLYo-80VVfuZ1hLF1kdwf6b4WE3Q4'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBJ5dytTFSOZlOvpSRYkIo-SoBKbVaAkvj1akbUykSdvMGol1J6pUt90XIPsLPMxlPbfUroFITFlNdg8Py0TDrxVtrlNV_N2JW9yApz5sxhatJCMOj_szzVOHuSVt6EaGmRMonQ6c8pSXEjEuivdbBCOpqy7CkuS_PTGeOkiBuK-zfkP-QEZQ7E0IW5zcfK-rUFfgP6PSR88KLLYo-80VVfuZ1hLF1kdwf6b4WE3Q4',
    1,
    1,
    'Giant 5-Foot Huggable Bear — Oversized Life-Size Teddy Bear',
    'Order Giant 5-Foot Bear in Pakistan. Head-turning surprise with free nationwide delivery.'
  );

  insertProduct.run(
    'Midnight Starlight Glow Bear',
    'midnight-starlight-glow-bear',
    'FLF-SG-40',
    'Gentle embedded soothing LED starlight illumination inside tummy.',
    'Provides a soothing nightlight glow in cyan and warm yellow. Completely cool to touch, baby-safe battery enclosure, and plush fleece coat.',
    4200,
    3450,
    20,
    'in_stock',
    3,
    catMap['gift-sets'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBypZ68f8Dh-hsl5St3B30H_pRvqwmbJniBzqYoowSHMb75sDsUVgEbCDtDbh2vKmqfLSLtoXqesZ_bEMdvGeNflu7xJMSbq6GT64WuphXh7_jq91upyJ07IOJYklm6Yq8BevNA1LROw1tJrANP8lqw9HMjPMg12kgQHOkCVB4_DEprlXqHYW5yLJ7dpTpY_9Qx2r7Yfxpw7rbvsVeDfCjHIqRsJD9dvexsOHYzbms'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBypZ68f8Dh-hsl5St3B30H_pRvqwmbJniBzqYoowSHMb75sDsUVgEbCDtDbh2vKmqfLSLtoXqesZ_bEMdvGeNflu7xJMSbq6GT64WuphXh7_jq91upyJ07IOJYklm6Yq8BevNA1LROw1tJrANP8lqw9HMjPMg12kgQHOkCVB4_DEprlXqHYW5yLJ7dpTpY_9Qx2r7Yfxpw7rbvsVeDfCjHIqRsJD9dvexsOHYzbms',
    0,
    1,
    'Midnight Starlight Glow Bear — Nightlight Plush Toy',
    'Soothing luminous nightlight bear for nurseries and calm evenings.'
  );

  insertProduct.run(
    'Custom Embroidered Name Bear',
    'custom-embroidered-name-bear',
    'FLF-EB-45',
    'Personalized teddy bear with recipient name hand-embroidered on knitted sweater.',
    'Features a bespoke knitted sweater with metallic golden cursive embroidery. Perfect for baby showers, birthdays, and wedding anniversaries.',
    4500,
    3900,
    18,
    'in_stock',
    4,
    catMap['gift-sets'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDFgDaNQNdyreGZAOhdq7ShHzngmueRmC_-ZO4fuCrUynxfr2AdBuLG82EstlGNQUyho-Q3P18yhbg6h4f_ulnWZPHafWFdbzYIsUn6ZG16kK7Uk1wP3uslSTsUhH4qxatArk8WykL1E_jczOVtzHsXuVNeHLWOX3yQ130ujMl350OybC-3CRPvvtq2kQ-i5xJFs0yhqsdvObCNVATZMijIVnDkZcI-UXCl32UILyU'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDFgDaNQNdyreGZAOhdq7ShHzngmueRmC_-ZO4fuCrUynxfr2AdBuLG82EstlGNQUyho-Q3P18yhbg6h4f_ulnWZPHafWFdbzYIsUn6ZG16kK7Uk1wP3uslSTsUhH4qxatArk8WykL1E_jczOVtzHsXuVNeHLWOX3yQ130ujMl350OybC-3CRPvvtq2kQ-i5xJFs0yhqsdvObCNVATZMijIVnDkZcI-UXCl32UILyU',
    0,
    1,
    'Custom Embroidered Name Bear — Personalized Keepsake Gift',
    'Personalize your cuddle companion with custom embroidered names.'
  );

  insertProduct.run(
    'Boutique Pastel Dino Plush',
    'boutique-pastel-dino-plush',
    'FLF-PD-35',
    'Friendly dinosaur with pillowy back crests in mint green and blush pink.',
    'A delightfully quirky companion crafted with super-soft velvety fabrics and baby-safe finishes.',
    2800,
    2250,
    28,
    'in_stock',
    5,
    catMap['animal-plushies'],
    JSON.stringify([
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDe-UqGuAfiKD-dl3EkeoLv3qBJNbZbmjEHxrYDaOBv6TXI5Wk89ARA1v0el-xRUXOtm9Q3USspg2EJLAJK3Vzb6-Eoi57q_GRJ9hJrB7hUxuOAA4RfM_NHEZtI-FGwC68z_uI_2QQG3Eyb6fbQxou5kyMAwslnybSuS2Oezf-dVTSP9Pv4JenVjXi9WXPdoyN9_6B_BBRB3Dt0WXr3A9858DeTZbV_QR9Vd4iW6ts'
    ]),
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDe-UqGuAfiKD-dl3EkeoLv3qBJNbZbmjEHxrYDaOBv6TXI5Wk89ARA1v0el-xRUXOtm9Q3USspg2EJLAJK3Vzb6-Eoi57q_GRJ9hJrB7hUxuOAA4RfM_NHEZtI-FGwC68z_uI_2QQG3Eyb6fbQxou5kyMAwslnybSuS2Oezf-dVTSP9Pv4JenVjXi9WXPdoyN9_6B_BBRB3Dt0WXr3A9858DeTZbV_QR9Vd4iW6ts',
    0,
    1,
    'Boutique Pastel Dino Plush — Gentle Mint & Pink Dinosaur',
    'Pastel Dino Plush companion for imaginative toddler play.'
  );

  // 4. Product Variations
  const productsList = db.prepare('SELECT id, slug FROM products').all();
  const prodMap = Object.fromEntries(productsList.map(p => [p.slug, p.id]));

  const insertVariation = db.prepare(`
    INSERT OR IGNORE INTO product_variations (
      product_id, sku, attribute_type, attribute_value, regular_price, sale_price, stock_quantity, stock_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (prodMap['fluffoo-original-honey-bear']) {
    const pId = prodMap['fluffoo-original-honey-bear'];
    insertVariation.run(pId, 'FLF-HB-35', 'Size', '35cm (Small)', 2700, 2150, 15, 'in_stock');
    insertVariation.run(pId, 'FLF-HB-45-M', 'Size', '45cm (Medium)', 3450, 2850, 20, 'in_stock');
    insertVariation.run(pId, 'FLF-HB-65', 'Size', '65cm (Large)', 4800, 3950, 10, 'in_stock');
  }

  if (prodMap['giant-5-foot-huggable-bear']) {
    const pId = prodMap['giant-5-foot-huggable-bear'];
    insertVariation.run(pId, 'FLF-GB-120', 'Size', '4-Foot (120cm)', 8200, 6950, 8, 'in_stock');
    insertVariation.run(pId, 'FLF-GB-150-XL', 'Size', '5-Foot (150cm)', 9900, 8450, 7, 'in_stock');
  }

  // 5. Couriers
  const insertCourier = db.prepare(`
    INSERT OR IGNORE INTO couriers (name, phone, tracking_url_template)
    VALUES (?, ?, ?)
  `);
  insertCourier.run('TCS Express', '111-123-456', 'https://www.tcsexpress.com/tracking?track={tracking_id}');
  insertCourier.run('Trax Logistics', '021-111-118-729', 'https://sonic.trax.pk/tracking?id={tracking_id}');
  insertCourier.run('Call Courier', '042-111-786-227', 'https://callcourier.com.pk/tracking/?tc={tracking_id}');
  insertCourier.run('Leopard Courier', '021-111-300-786', 'https://www.leopardscourier.com/tracking?track={tracking_id}');

  // 6. Delivery Zones
  const insertZone = db.prepare(`
    INSERT OR IGNORE INTO delivery_zones (city_name, delivery_fee, estimated_days)
    VALUES (?, ?, ?)
  `);
  const cities = [
    ['Karachi', 200, '1-2 Business Days'],
    ['Lahore', 200, '1-2 Business Days'],
    ['Islamabad', 200, '1-2 Business Days'],
    ['Rawalpindi', 200, '1-2 Business Days'],
    ['Faisalabad', 250, '2-3 Business Days'],
    ['Multan', 250, '2-3 Business Days'],
    ['Peshawar', 250, '2-4 Business Days'],
    ['Quetta', 300, '3-5 Business Days'],
    ['Sialkot', 250, '2-3 Business Days'],
    ['Gujranwala', 250, '2-3 Business Days'],
    ['Other Cities', 300, '3-5 Business Days']
  ];
  for (const [city, fee, days] of cities) {
    insertZone.run(city, fee, days);
  }

  // 7. Coupons
  const insertCoupon = db.prepare(`
    INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertCoupon.run('CUDDLE10', 'percentage', 10, 2000, 1000, 500, 1);
  insertCoupon.run('FLUFFOO500', 'fixed', 500, 4000, 500, 200, 1);
  insertCoupon.run('EIDMUBARAK', 'percentage', 15, 3000, 1500, 300, 1);

  // 8. Site Settings & Bank/Wallet Info
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO site_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  insertSetting.run('site_name', 'Fluffoo', 'Store brand name');
  insertSetting.run('business_phone', '+92 300 1234567', 'Customer support call line');
  insertSetting.run('business_whatsapp', '+923001234567', 'Official WhatsApp Business Number');
  insertSetting.run('business_email', 'cuddles@fluffoo.pk', 'Official business email');
  insertSetting.run('free_shipping_threshold', '3500', 'Minimum order for free nationwide shipping in PKR');
  insertSetting.run('standard_delivery_fee', '250', 'Default delivery fee in PKR');
  insertSetting.run('currency_symbol', 'Rs. ', 'Display currency symbol');
  insertSetting.run('bank_name', 'Meezan Bank Limited', 'Primary bank for manual online transfers');
  insertSetting.run('bank_account_title', 'Fluffoo Cuddles (Pvt) Ltd', 'Bank account holder title');
  insertSetting.run('bank_account_number', '02010108992341', 'Bank account number');
  insertSetting.run('bank_iban', 'PK65MEZN0002010108992341', 'IBAN for Interbank funds transfer');
  insertSetting.run('easypaisa_title', 'Fluffoo Official', 'EasyPaisa account title');
  insertSetting.run('easypaisa_number', '03001234567', 'EasyPaisa wallet number');
  insertSetting.run('jazzcash_title', 'Fluffoo Official', 'JazzCash account title');
  insertSetting.run('jazzcash_number', '03001234567', 'JazzCash wallet number');
  insertSetting.run('manual_payment_instructions', 'Please transfer the exact total payable amount to any of our official accounts above. Take a screenshot or PDF receipt showing the transaction ID and upload it below to verify your order.', 'Customer instructions for manual payment');

  console.log('✅ Database seeded successfully!');
}

if (process.argv[1].endsWith('seed.js')) {
  runSeed();
}
