"""Build a separate, pixel-verified lossless sprite catalog for packaging."""

from concurrent.futures import ProcessPoolExecutor
import io
import json
from pathlib import Path

from PIL import Image, features


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'pmd'
DEST = ROOT / 'dist' / 'pmd-lossless'


def optimize(url):
    relative = Path(url.removeprefix('/pmd/'))
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError(f'Unexpected resource URL: {url}')
    original = (SOURCE / relative).read_bytes()
    output = io.BytesIO()
    with Image.open(io.BytesIO(original)) as image:
        pixels = image.convert('RGBA')
    pixels.save(output, format='WEBP', lossless=True, exact=True, method=3)
    encoded = output.getvalue()
    if len(encoded) < len(original):
        with Image.open(io.BytesIO(encoded)) as image:
            decoded = image.convert('RGBA')
            if pixels.size != decoded.size or pixels.tobytes() != decoded.tobytes():
                raise ValueError(f'Pixels changed: {relative}')
        relative = relative.with_suffix('.webp')
    else:
        encoded = original
    path = DEST / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    return url, '/pmd/' + relative.as_posix(), len(original), len(encoded)


def main():
    if not features.check('webp'):
        raise RuntimeError('Pillow was built without WebP support')
    manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
    references = []
    entries = (entry for base in manifest['species'] for entry in (base, *base.get('battleForms', {}).values()))
    for species in entries:
        references.extend((species, key) for key in ('portrait', 'shinyPortrait') if species.get(key))
        for variant in ('normal', 'shiny'):
            animations = (species.get(variant) or {}).get('animations', {})
            references.extend((clip, 'url') for clip in animations.values())
    urls = sorted({record[key] for record, key in references})
    with ProcessPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(optimize, urls, chunksize=32))
    optimized = {url: path for url, path, _, _ in results}
    for record, key in references:
        record[key] = optimized[record[key]]
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
    for path in SOURCE.iterdir():
        if path.is_file() and path.name != 'manifest.json':
            (DEST / path.name).write_bytes(path.read_bytes())
    before = sum(row[2] for row in results)
    after = sum(row[3] for row in results)
    converted = sum(url != path for url, path, _, _ in results)
    print(f'{converted:,}/{len(results):,} images verified as WebP. {before:,} -> {after:,} bytes ({1 - after / before:.1%} saved).')


if __name__ == '__main__':
    main()
