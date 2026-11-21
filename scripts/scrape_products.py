import urllib.request
import json
import os
import re

urls = [
    'https://stuffeez.pk/products/cow-running-plushie',
    'https://stuffeez.pk/products/3-feet-long-cat-pillow',
    'https://stuffeez.pk/products/panda-running-plushie',
    'https://stuffeez.pk/products/warm-water-bag',
    'https://stuffeez.pk/products/strawberry-bunny-zip-plushie',
    'https://stuffeez.pk/products/stuffeez-panda-hoodie-bear',
    'https://stuffeez.pk/products/disney-stitch-hoodie-bear',
    'https://stuffeez.pk/products/stuffeez-lotso-hoodie-bear-50-cm',
    'https://stuffeez.pk/collections/all/products/carrot-bunny-zip-plushie',
    'https://stuffeez.pk/products/capybara-hoodie-teddy-bear',
    'https://stuffeez.pk/products/stuffeez-pikachu-hoodie-bear-55-cm?_pos=2&_sid=85e637650&_ss=r'
]

results = []
os.makedirs('data/scraped', exist_ok=True)

for u in urls:
    clean_u = u.split('?')[0]
    handle = clean_u.split('/products/')[-1]
    api_url = f'https://stuffeez.pk/products/{handle}.js'
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results.append(data)
            print(f"SUCCESS: {handle} -> \"{data.get('title')}\" | Price: {data.get('price')} | Variants: {len(data.get('variants', []))} | Images: {len(data.get('images', []))}")
            # Also check if there is video in the html page
            page_req = urllib.request.Request(clean_u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            try:
                with urllib.request.urlopen(page_req) as p_resp:
                    page_html = p_resp.read().decode('utf-8')
                    # Look for video tags or mp4 links
                    videos = re.findall(r'https?://[^\s"\'<>]+\.mp4[^\s"\'<>]*', page_html)
                    youtube = re.findall(r'https?://(?:www\.)?youtube\.com/[^\s"\'<>]+', page_html)
                    if videos:
                        data['video_urls'] = list(set(videos))
                        print(f"   Found videos for {handle}: {len(videos)}")
                    if youtube:
                        data['youtube_urls'] = list(set(youtube))
            except Exception as pe:
                print(f"   Page scrape error for {handle}: {pe}")

    except Exception as e:
        print(f"FAILED: {handle} -> {e}")

with open('data/scraped/all_products.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nDone! Scraped {len(results)} of {len(urls)} products successfully.")
