# Fresh Mosaic Implementation

This directory contains the new, simplified mosaic implementation that replaces the complex sprite sheet system.

## Structure

```
mosaic/
├── SimpleMosaicImage.tsx    # React component with smooth zoom
├── generator/               # Python mosaic generation tools
│   ├── src/                # Mosaic generation source code
│   ├── cifar_images/       # CIFAR-10 dataset images
│   └── extract_cifar.py    # CIFAR extraction utility
└── README.md               # This file
```

## Features

- **Simple Implementation**: Replaces 600+ lines of complex canvas code with ~120 lines
- **Smooth Zoom**: Based on davidheineman.com's approach using CSS transforms
- **Cross-Browser Compatible**: Works on Chrome, Firefox, Safari, mobile devices
- **Fast Loading**: Single image file instead of complex sprite sheets
- **Easy Maintenance**: Clean, readable code structure

## How It Works

1. **Mosaic Generation**: Uses davidheineman/mosaic Python library with CIFAR-10 dataset
2. **Zoom Effect**: 20x zoom with mouse tracking using CSS transforms
3. **Performance**: Hardware-accelerated CSS transforms for smooth interaction
4. **Fallback**: Shows original image when mosaic isn't available

## Usage

```tsx
import SimpleMosaicImage from '@/mosaic/SimpleMosaicImage';

<SimpleMosaicImage
  src="/profile_3.png"
  alt="Profile image"
  width={220}
  height={325}
  mosaicSrc="/mosaic_profile.png" // Optional: generated mosaic
/>
```

## Benefits Over Previous Implementation

- ✅ Much simpler codebase
- ✅ Better performance
- ✅ Easier to maintain
- ✅ Cross-browser compatibility
- ✅ Mobile-friendly
- ✅ No complex loading states
- ✅ No sprite sheet management