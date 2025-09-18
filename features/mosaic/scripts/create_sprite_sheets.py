#!/usr/bin/env python3
"""
Sprite Sheet Generator for Mosaic Tiles

Converts thousands of individual tile PNG files into optimized sprite sheets.
This dramatically reduces HTTP requests from ~8,480 to ~21 for GitHub Pages.
"""

import json
import os
import sys
from PIL import Image
import math
from pathlib import Path

class SpriteSheetGenerator:
    def __init__(self, tiles_dir, output_dir, tiles_per_sheet=400, tile_size=256):
        """
        Initialize sprite sheet generator.
        
        Args:
            tiles_dir: Directory containing individual tile images
            output_dir: Directory to save sprite sheets and metadata
            tiles_per_sheet: Number of tiles per sprite sheet (20x20 = 400)
            tile_size: Size of each individual tile in pixels
        """
        self.tiles_dir = Path(tiles_dir)
        self.output_dir = Path(output_dir)
        self.tiles_per_sheet = tiles_per_sheet
        self.tile_size = tile_size
        self.sheet_width = int(math.sqrt(tiles_per_sheet))  # 20x20 for 400 tiles
        self.sheet_height = int(math.ceil(tiles_per_sheet / self.sheet_width))
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def load_original_metadata(self):
        """Load the original mosaic metadata."""
        metadata_path = self.tiles_dir / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {metadata_path}")
        
        with open(metadata_path, 'r') as f:
            return json.load(f)
    
    def generate_spiral_coordinates(self, width, height):
        """Generate spiral coordinates from center outward (anticlockwise) - FIXED version."""
        print(f"   🚀 Fixed spiral generation for {width}x{height} grid...")
        
        spiral_coords = []
        center_x = width // 2
        center_y = height // 2
        
        # Create a grid to mark visited positions - FIXED: proper dimensions
        visited = [[False] * width for _ in range(height)]
        
        # Directions: right, up, left, down (anticlockwise from right)
        dx = [0, -1, 0, 1]  # row changes
        dy = [1, 0, -1, 0]  # column changes
        
        x, y = center_x, center_y
        direction = 0
        steps = 1
        
        # Add center first
        spiral_coords.append((x, y))
        visited[x][y] = True
        
        while len(spiral_coords) < width * height:
            for _ in range(2):  # Each step count is used twice
                for _ in range(steps):
                    x += dx[direction]
                    y += dy[direction]
                    
                    # FIXED: proper boundary checks
                    if (0 <= x < height and 0 <= y < width and 
                        not visited[x][y]):
                        spiral_coords.append((x, y))
                        visited[x][y] = True
                        
                        if len(spiral_coords) >= width * height:
                            print(f"   ✅ Generated all {len(spiral_coords)} coordinates")
                            return spiral_coords
                
                direction = (direction + 1) % 4
            
            steps += 1
            
            # SAFETY: prevent infinite loop
            if steps > max(width, height):
                print(f"   ⚠️  Early termination at {len(spiral_coords)} coordinates")
                break
        
        print(f"   ⚠️  Spiral generation incomplete: {len(spiral_coords)}/{width * height}")
        return spiral_coords
    
    def reorder_tiles_by_spiral(self, tiles, original_metadata):
        """Reorder tiles array based on spiral pattern."""
        width = original_metadata["width"]
        height = original_metadata["height"]
        
        print(f"🌀 Generating spiral coordinates for {width}x{height} grid...")
        spiral_coords = self.generate_spiral_coordinates(width, height)
        
        # Create a mapping from (x,y) to tile
        tile_map = {}
        for tile in tiles:
            key = (tile["x"], tile["y"])
            tile_map[key] = tile
        
        # Reorder tiles based on spiral coordinates
        spiral_tiles = []
        for x, y in spiral_coords:
            if (x, y) in tile_map:
                spiral_tiles.append(tile_map[(x, y)])
        
        print(f"🎯 Reordered {len(spiral_tiles)} tiles in spiral pattern")
        return spiral_tiles
    
    def generate_sprite_sheets(self):
        """Generate 5x5 grid of sprite sheets from individual tile images."""
        print("🎨 Starting 5x5 sprite sheet generation...")
        
        # Load original metadata
        original_metadata = self.load_original_metadata()
        original_tiles = original_metadata["tiles"]
        
        print(f"📊 Processing {len(original_tiles)} tiles into 5x5 grid of sprite sheets...")
        
        # Calculate 5x5 grid parameters
        img_width = original_metadata["width"]   # 80
        img_height = original_metadata["height"] # 120
        
        # Each sprite sheet covers 16x24 tiles (80/5 = 16, 120/5 = 24)
        tiles_per_sheet_x = img_width // 5   # 16
        tiles_per_sheet_y = img_height // 5  # 24
        tiles_per_sheet = tiles_per_sheet_x * tiles_per_sheet_y  # 384
        
        print(f"🔧 Configuration:")
        print(f"   • 5x5 grid of sprite sheets")
        print(f"   • Each sheet: {tiles_per_sheet_x}x{tiles_per_sheet_y} = {tiles_per_sheet} tiles")
        print(f"   • Total sprite sheets: 25")
        print(f"   • Tile size: {self.tile_size}x{self.tile_size}px")
        print(f"   • Reducing requests: {len(original_tiles)} → 25 ({100 * (1 - 25/len(original_tiles)):.1f}% reduction)")
        
        sprite_metadata = {
            "original_metadata": original_metadata,
            "sprite_config": {
                "tiles_per_sheet": tiles_per_sheet,
                "sheet_width": tiles_per_sheet_x,
                "sheet_height": tiles_per_sheet_y,
                "tile_size": self.tile_size,
                "num_sheets": 25,
                "grid_size": 5
            },
            "sheets": []
        }
        
        # Create mapping from (x,y) to tile for fast lookup
        tile_map = {}
        for tile in original_tiles:
            key = (tile["x"], tile["y"])
            tile_map[key] = tile
        
        # Generate 5x5 grid of sprite sheets
        sheet_idx = 0
        for grid_y in range(5):
            for grid_x in range(5):
                print(f"📄 Creating sheet {sheet_idx + 1}/25 (grid position {grid_x},{grid_y})...")
                
                # Calculate tile range for this sprite sheet
                start_x = grid_x * tiles_per_sheet_x
                end_x = start_x + tiles_per_sheet_x
                start_y = grid_y * tiles_per_sheet_y
                end_y = start_y + tiles_per_sheet_y
                
                # Collect tiles for this sprite sheet
                sheet_tiles = []
                for y in range(start_y, end_y):
                    for x in range(start_x, end_x):
                        if (x, y) in tile_map:
                            sheet_tiles.append(tile_map[(x, y)])
                
                print(f"   • Tiles {start_x}-{end_x-1}, {start_y}-{end_y-1} ({len(sheet_tiles)} tiles)")
                
                # Create sprite sheet image
                sheet_image = self._create_sprite_sheet_grid(sheet_tiles, tiles_per_sheet_x, tiles_per_sheet_y)
                
                # Save in multiple formats
                sheet_name = f"sprite_sheet_{sheet_idx:02d}"
                
                # PNG format (fallback)
                png_path = self.output_dir / f"{sheet_name}.png"
                sheet_image.save(png_path, "PNG", optimize=True, compress_level=9)
                png_size = png_path.stat().st_size / 1024  # KB
                
                # WebP format (smaller, better compression)
                webp_path = self.output_dir / f"{sheet_name}.webp"
                sheet_image.save(webp_path, "WebP", quality=80, method=6)
                webp_size = webp_path.stat().st_size / 1024  # KB
                
                print(f"   ✅ Saved: {png_path.name} ({png_size:.1f}KB) | {webp_path.name} ({webp_size:.1f}KB)")
                
                # Add sheet metadata
                sheet_metadata = {
                    "index": sheet_idx,
                    "grid_x": grid_x,
                    "grid_y": grid_y,
                    "filename_png": f"{sheet_name}.png",
                    "filename_webp": f"{sheet_name}.webp",
                    "tiles_count": len(sheet_tiles),
                    "tile_positions": []
                }
                
                # Calculate position of each tile within this sheet
                for i, tile in enumerate(sheet_tiles):
                    sheet_x = i % tiles_per_sheet_x
                    sheet_y = i // tiles_per_sheet_x
                    
                    sheet_metadata["tile_positions"].append({
                        "original_filename": tile["filename"],
                        "x": tile["x"],
                        "y": tile["y"],
                        "dog_index": tile.get("dog_index", tile.get("cifar_index", 0)),
                        "sheet_x": sheet_x,
                        "sheet_y": sheet_y,
                        "sprite_x": sheet_x * self.tile_size,
                        "sprite_y": sheet_y * self.tile_size
                    })
                
                sprite_metadata["sheets"].append(sheet_metadata)
                sheet_idx += 1
        
        # Save sprite sheet metadata
        metadata_path = self.output_dir / "sprite_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(sprite_metadata, f, indent=2)
        
        print(f"💾 Saved sprite metadata: {metadata_path}")
        
        # Calculate total size savings
        total_png_size = sum((self.output_dir / sheet["filename_png"]).stat().st_size 
                           for sheet in sprite_metadata["sheets"]) / 1024 / 1024  # MB
        total_webp_size = sum((self.output_dir / sheet["filename_webp"]).stat().st_size 
                            for sheet in sprite_metadata["sheets"]) / 1024 / 1024  # MB
        
        print(f"\n🎉 Sprite sheet generation complete!")
        print(f"📈 Performance improvements:")
        print(f"   • HTTP requests: {len(original_tiles)} → 25 ({100 * (1 - 25/len(original_tiles)):.1f}% reduction)")
        print(f"   • Total size (PNG): {total_png_size:.1f}MB")
        print(f"   • Total size (WebP): {total_webp_size:.1f}MB ({100 * (1 - total_webp_size/total_png_size):.1f}% smaller)")
        
        return sprite_metadata
    
    def _create_sprite_sheet(self, tiles, sheet_idx):
        """Create a single sprite sheet from a list of tiles."""
        # Calculate sheet dimensions
        sheet_pixel_width = self.sheet_width * self.tile_size
        sheet_pixel_height = self.sheet_height * self.tile_size
        
        # Create blank sheet
        sprite_sheet = Image.new('RGB', (sheet_pixel_width, sheet_pixel_height), (240, 240, 240))
        
        # Place each tile in the sheet
        for i, tile in enumerate(tiles):
            tile_path = self.tiles_dir / tile["filename"]
            
            if not tile_path.exists():
                print(f"⚠️  Warning: Tile not found: {tile_path}")
                continue
            
            # Load tile image
            try:
                tile_img = Image.open(tile_path)
                if tile_img.size != (self.tile_size, self.tile_size):
                    tile_img = tile_img.resize((self.tile_size, self.tile_size), Image.Resampling.LANCZOS)
                
                # Calculate position in sprite sheet
                sheet_x = i % self.sheet_width
                sheet_y = i // self.sheet_width
                
                paste_x = sheet_x * self.tile_size
                paste_y = sheet_y * self.tile_size
                
                # Paste tile into sprite sheet
                sprite_sheet.paste(tile_img, (paste_x, paste_y))
                
            except Exception as e:
                print(f"⚠️  Error loading tile {tile_path}: {e}")
                continue
        
        return sprite_sheet
    
    def _create_sprite_sheet_grid(self, tiles, grid_width, grid_height):
        """Create a sprite sheet with tiles arranged in a specific grid."""
        # Calculate sheet dimensions
        sheet_pixel_width = grid_width * self.tile_size
        sheet_pixel_height = grid_height * self.tile_size
        
        # Create blank sheet
        sprite_sheet = Image.new('RGB', (sheet_pixel_width, sheet_pixel_height), (240, 240, 240))
        
        # Place each tile in the correct grid position
        for i, tile in enumerate(tiles):
            tile_path = self.tiles_dir / tile["filename"]
            
            if not tile_path.exists():
                print(f"⚠️  Warning: Tile not found: {tile_path}")
                continue
            
            # Load tile image
            try:
                tile_img = Image.open(tile_path)
                if tile_img.size != (self.tile_size, self.tile_size):
                    tile_img = tile_img.resize((self.tile_size, self.tile_size), Image.Resampling.LANCZOS)
                
                # Calculate position in sprite sheet (row-by-row layout)
                sheet_x = i % grid_width
                sheet_y = i // grid_width
                
                paste_x = sheet_x * self.tile_size
                paste_y = sheet_y * self.tile_size
                
                # Paste tile into sprite sheet
                sprite_sheet.paste(tile_img, (paste_x, paste_y))
                
            except Exception as e:
                print(f"⚠️  Error loading tile {tile_path}: {e}")
                continue
        
        return sprite_sheet


def main():
    if len(sys.argv) < 3:
        print("Usage: python create_sprite_sheets.py <tiles_dir> <output_dir> [tiles_per_sheet]")
        print("Example: python create_sprite_sheets.py out/mosaic_tiles_hd out/sprite_sheets 400")
        sys.exit(1)
    
    tiles_dir = sys.argv[1]
    output_dir = sys.argv[2]
    tiles_per_sheet = int(sys.argv[3]) if len(sys.argv) > 3 else 400
    
    # Check if tiles directory exists
    if not os.path.exists(tiles_dir):
        print(f"❌ Error: Tiles directory not found: {tiles_dir}")
        sys.exit(1)
    
    # Create sprite sheet generator
    generator = SpriteSheetGenerator(
        tiles_dir=tiles_dir,
        output_dir=output_dir,
        tiles_per_sheet=tiles_per_sheet,
        tile_size=256  # Assuming HD tiles are 256x256
    )
    
    try:
        # Generate sprite sheets
        metadata = generator.generate_sprite_sheets()
        print(f"\n✅ Success! Sprite sheets saved to: {output_dir}")
        
    except Exception as e:
        print(f"❌ Error generating sprite sheets: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()