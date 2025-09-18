# Mosaic Image Generator

A sophisticated image mosaic generator that recreates images using tiles from various datasets. The system creates stunning visual effects by replacing regions of an input image with similar-colored images from large datasets.

## 🎨 How It Works

The mosaic generation process follows these steps:

1. **Input Processing**: The input image is divided into a grid of cells
2. **Color Analysis**: For each cell, the average color is calculated
3. **Tile Matching**: The system finds the best matching image from the dataset based on color similarity
4. **Enhancement**: Each tile is enhanced with sharpening and contrast adjustments
5. **Assembly**: Tiles are assembled into the final mosaic image

## 📦 Available Datasets

### CIFAR-10
- **Size**: 32×32 pixel images
- **Count**: 50,000 training images
- **Content**: 10 classes of objects (airplanes, cars, birds, cats, etc.)
- **Best for**: Small, pixelated mosaic effects

### Tiny ImageNet
- **Size**: 64×64 pixel images
- **Count**: 100,000+ images
- **Content**: 200 different classes of objects
- **Best for**: More detailed mosaics with better color variety

### Stanford Dogs
- **Size**: High-resolution images (varied sizes)
- **Count**: 20,000+ images
- **Content**: 120 breeds of dogs
- **Best for**: High-quality mosaics with natural textures

## 🚀 Usage

### Command Line Interface

```bash
# Basic usage with default settings (Dogs dataset)
python features/mosaic/scripts/generate.py input.jpg

# Use CIFAR-10 dataset
python features/mosaic/scripts/generate.py input.jpg --dataset cifar

# Custom tile size and output
python features/mosaic/scripts/generate.py input.jpg --tile-size 16 --output custom.jpg

# Generate web tiles for interactive display
python features/mosaic/scripts/generate.py input.jpg --web-tiles

# Full options
python features/mosaic/scripts/generate.py input.jpg \
    --dataset dogs \
    --tile-size 9 \
    --mosaic-width 256 \
    --output mosaic.jpg \
    --web-tiles \
    --web-output-dir public/mosaic_tiles
```

### React Component

```tsx
import MosaicImage from '@/features/mosaic/components/MosaicImage';

// Basic usage
<MosaicImage
  src="/profile.png"
  alt="Profile picture"
  width={220}
  height={325}
  useCifarMosaic={true}
  mosaicTilesPath="/mosaic_tiles_ultra_hd"
/>

// Simple pixelated effect (no dataset)
<MosaicImage
  src="/image.jpg"
  alt="Description"
  width={400}
  height={300}
  pixelSize={8}
  useCifarMosaic={false}
/>
```

## ⚙️ Configuration

Edit `config/settings.json` to customize default behavior:

```json
{
  "datasets": {
    "default": "dogs"  // Default dataset to use
  },
  "generation": {
    "static_mosaic": {
      "tile_size": 9,      // Size of each tile in static image
      "mosaic_width": 256  // Number of tiles horizontally
    },
    "web_tiles": {
      "tile_size": 256,    // Size for web display (high-res)
      "mosaic_width": 80   // Grid size for web
    }
  },
  "enhancement": {
    "unsharp_mask": {
      "radius": 1.5,
      "percent": 150,
      "threshold": 2
    },
    "contrast": 1.1,
    "sharpen": true
  }
}
```

## 🔧 Installation Requirements

```bash
# Python dependencies
pip install pillow numpy requests

# For Stanford Dogs dataset
pip install kagglehub

# Next.js is already configured in the main project
```

## 🎯 Features

### Web Component Features
- **Progressive Loading**: Tiles load progressively for better performance
- **20× Zoom on Hover**: Smooth zoom effect following mouse position
- **High Internal Resolution**: 4800px internal canvas for crisp zoom
- **Pixelated Rendering**: CSS `image-rendering: pixelated` for sharp tiles

### Generator Features
- **Color Matching Algorithm**: Efficient nearest-neighbor color matching
- **Image Enhancement Pipeline**: Unsharp mask, contrast boost, and sharpening
- **Batch Processing**: Generates thousands of tiles efficiently
- **Memory Optimization**: Streams large datasets without loading all in memory

## 📁 File Structure

```
features/mosaic/
├── README.md                    # This file
├── components/
│   └── MosaicImage.tsx         # React component for display
├── scripts/
│   └── generate.py             # Python generation script
└── config/
    └── settings.json           # Configuration settings
```

## 🔄 Workflow

1. **Generate Mosaic**
   ```bash
   python features/mosaic/scripts/generate.py public/profile_3.png --web-tiles
   ```

2. **Use in Application**
   - The React component automatically loads the generated tiles
   - Tiles are progressively loaded for optimal performance
   - Zoom effect activates on hover

## 📊 Performance Considerations

- **Tile Count**: An 80×120 grid creates 9,600 individual tiles
- **File Size**: Each 256×256px tile is ~20-50KB (optimized PNG)
- **Loading Strategy**: First 50 tiles preloaded, rest load asynchronously
- **Canvas Resolution**: 4800px internal width for sharp zoom

## 🎨 Customization

### Adding a New Dataset

1. Create a loader method in `generate.py`:
```python
def load_custom_data(self):
    """Load custom dataset."""
    # Index images
    # Calculate average colors
    # Store in self.custom_image_paths
    # Update self.tile_colors
```

2. Update `_get_tile_image()` method to handle the new dataset

3. Add dataset to configuration

### Changing Enhancement Settings

Modify `config/settings.json`:
- Adjust `unsharp_mask` parameters for edge enhancement
- Change `contrast` value (1.0 = no change, >1.0 = increase)
- Toggle `sharpen` for final sharpening pass

## 🐛 Troubleshooting

**Issue**: Tiles not loading in web view
- Check that tile files exist in `public/mosaic_tiles_ultra_hd/`
- Verify `metadata.json` is present and valid

**Issue**: Poor color matching
- Try a different dataset with more color variety
- Increase the mosaic grid size for better matching resolution

**Issue**: Memory issues with large datasets
- Use path-based storage (like Tiny ImageNet) instead of loading all images
- Process in batches if needed

## 📚 Technical Details

### Color Matching Algorithm
Uses Euclidean distance in RGB space:
```python
distance = sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)
```

### Enhancement Pipeline
1. LANCZOS resampling for high-quality resizing
2. Unsharp mask for edge restoration
3. Contrast enhancement
4. Final sharpening filter

## 📄 License

Part of the blog project - see main project license.