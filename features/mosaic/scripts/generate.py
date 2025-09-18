#!/usr/bin/env python3
"""
Mosaic Generator

Creates mosaic versions of images using various datasets (CIFAR-10, Tiny ImageNet, Stanford Dogs).
The mosaic effect is achieved by replacing regions of the input image with similar-colored
images from the chosen dataset.
"""

import os
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import requests
import pickle
import tarfile
import zipfile
from typing import List, Tuple, Dict, Optional
import json
from pathlib import Path
import argparse

# Load configuration
CONFIG_PATH = Path(__file__).parent.parent / "config" / "settings.json"
if CONFIG_PATH.exists():
    with open(CONFIG_PATH, 'r') as f:
        CONFIG = json.load(f)
else:
    # Fallback configuration
    CONFIG = {
        "datasets": {"default": "dogs"},
        "data": {
            "cache_dir": "data",
            "urls": {
                "cifar": "https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz",
                "tiny": "https://cs231n.stanford.edu/tiny-imagenet-200.zip"
            }
        },
        "generation": {
            "static_mosaic": {"tile_size": 9, "mosaic_width": 256},
            "web_tiles": {"tile_size": 256, "mosaic_width": 80}
        },
        "enhancement": {
            "unsharp_mask": {"radius": 1.5, "percent": 150, "threshold": 2},
            "contrast": 1.1,
            "sharpen": True
        }
    }

CIFAR_DIR = "cifar-10-batches-py"
TINY_DIR = "tiny-imagenet-200"

class MosaicGenerator:
    """Generates image mosaics using various tile datasets."""
    
    def __init__(self, data_dir: str = None, dataset: str = None, config: dict = None):
        """Initialize the mosaic generator.
        
        Args:
            data_dir: Directory for storing dataset files
            dataset: Dataset to use ('cifar', 'tiny', or 'dogs')
            config: Configuration dictionary (uses default if None)
        """
        self.config = config or CONFIG
        self.data_dir = Path(data_dir or self.config["data"]["cache_dir"])
        self.dataset = dataset or self.config["datasets"]["default"]
        # Storage for different datasets
        self.cifar_images = []  # CIFAR images stored in memory
        self.tiny_image_paths: List[Path] = []  # Tiny ImageNet paths
        self.dog_image_paths: List[Path] = []  # Dogs dataset paths
        self.tile_colors: Optional[np.ndarray] = None  # Average colors for matching
        
    def _enhance_tile(self, img: Image.Image, tile_size: int) -> Image.Image:
        """Enhance a tile image for better visual quality.
        
        Args:
            img: Input PIL Image
            tile_size: Target size for the tile
            
        Returns:
            Enhanced PIL Image
        """
        # Resize with high-quality filter
        resized = img.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
        
        # Apply enhancement based on configuration
        enh_config = self.config.get("enhancement", {})
        
        # Unsharp mask to restore edges
        um_config = enh_config.get("unsharp_mask", {})
        enhanced = resized.filter(ImageFilter.UnsharpMask(
            radius=um_config.get("radius", 1.5),
            percent=um_config.get("percent", 150),
            threshold=um_config.get("threshold", 2)
        ))
        
        # Contrast boost
        contrast = enh_config.get("contrast", 1.1)
        enhanced = ImageEnhance.Contrast(enhanced).enhance(contrast)
        
        # Final sharpen if enabled
        if enh_config.get("sharpen", True):
            enhanced = enhanced.filter(ImageFilter.SHARPEN)
            
        return enhanced

    def download_cifar10(self) -> None:
        """Download and extract CIFAR-10 dataset if not already present."""
        cifar_path = self.data_dir / CIFAR_DIR
        
        if cifar_path.exists():
            print("CIFAR-10 dataset already exists.")
            return
        
        print("Downloading CIFAR-10 dataset...")
        self.data_dir.mkdir(exist_ok=True)
        
        # Download the dataset
        cifar_url = self.config["data"]["urls"]["cifar"]
        response = requests.get(cifar_url, stream=True)
        response.raise_for_status()
        
        tar_path = self.data_dir / "cifar-10-python.tar.gz"
        with open(tar_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Extract the dataset
        print("Extracting CIFAR-10 dataset...")
        with tarfile.open(tar_path, 'r:gz') as tar:
            tar.extractall(self.data_dir)
        
        # Remove the tar file
        tar_path.unlink()
        print("CIFAR-10 dataset downloaded and extracted.")

    def download_tiny_imagenet(self) -> None:
        """Download and extract Tiny ImageNet dataset if not already present."""
        tiny_path = self.data_dir / TINY_DIR
        if tiny_path.exists():
            print("Tiny ImageNet dataset already exists.")
            return

        print("Downloading Tiny ImageNet dataset (≈250MB)...")
        self.data_dir.mkdir(exist_ok=True)

        tiny_url = self.config["data"]["urls"]["tiny"]
        response = requests.get(tiny_url, stream=True)
        response.raise_for_status()

        zip_path = self.data_dir / "tiny-imagenet-200.zip"
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print("Extracting Tiny ImageNet dataset...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(self.data_dir)

        zip_path.unlink()
        print("Tiny ImageNet dataset downloaded and extracted.")

    def download_dogs_dataset(self) -> Path:
        """Download Stanford Dogs dataset via kagglehub. Returns the base path."""
        try:
            import kagglehub  # type: ignore
        except Exception as e:
            raise RuntimeError("kagglehub is required. Install with: pip install kagglehub") from e

        print("Downloading Stanford Dogs dataset via kagglehub (first run may take a while)...")
        base_path_str = kagglehub.dataset_download("jessicali9530/stanford-dogs-dataset")
        base_path = Path(base_path_str)
        print(f"Dogs dataset available at {base_path}")
        return base_path
    
    def load_cifar_batch(self, batch_file: str) -> Tuple[np.ndarray, np.ndarray]:
        """Load a single CIFAR-10 batch file."""
        with open(batch_file, 'rb') as f:
            batch = pickle.load(f, encoding='bytes')
        
        data = batch[b'data']
        labels = batch[b'labels']
        
        # Reshape data to (num_images, 3, 32, 32) and then to (num_images, 32, 32, 3)
        data = data.reshape(-1, 3, 32, 32).transpose(0, 2, 3, 1)
        
        return data, labels
    
    def load_all_cifar_data(self) -> None:
        """Load all CIFAR-10 training data."""
        print("Loading CIFAR-10 data...")
        cifar_path = self.data_dir / CIFAR_DIR
        
        all_images = []
        all_labels = []
        
        # Load training batches
        for i in range(1, 6):
            batch_file = cifar_path / f"data_batch_{i}"
            images, labels = self.load_cifar_batch(batch_file)
            all_images.append(images)
            all_labels.extend(labels)
        
        # Combine all batches
        self.cifar_images = np.vstack(all_images)

        # Calculate average color for each image for faster matching
        print("Calculating average colors for CIFAR-10 images...")
        colors = []
        for img in self.cifar_images:
            avg_color = np.mean(img, axis=(0, 1))  # Average across height and width
            colors.append(avg_color)

        self.tile_colors = np.array(colors)
        print(f"Loaded {len(self.cifar_images)} CIFAR-10 images.")

    def load_all_tiny_data(self) -> None:
        """Index Tiny ImageNet images and compute average colors."""
        print("Loading Tiny ImageNet data...")
        tiny_path = self.data_dir / TINY_DIR
        if not tiny_path.exists():
            raise FileNotFoundError("Tiny ImageNet directory not found. Run download_tiny_imagenet() first.")

        # Collect image paths from train and val
        image_paths: List[Path] = []
        # Train images
        for wnid_dir in (tiny_path / "train").glob("*/images"):
            image_paths.extend(sorted(wnid_dir.glob("*.JPEG")))
        # Val images
        image_paths.extend(sorted((tiny_path / "val" / "images").glob("*.JPEG")))

        print(f"Found {len(image_paths)} Tiny ImageNet images. Computing average colors...")
        colors = []
        # Compute average colors (may take a minute)
        for p in image_paths:
            with Image.open(p) as im:
                im = im.convert('RGB')
                arr = np.array(im)
                colors.append(np.mean(arr, axis=(0, 1)))

        self.tiny_image_paths = image_paths
        self.tile_colors = np.array(colors)
        print("Tiny ImageNet data loaded.")

    def load_all_dogs_data(self) -> None:
        """Index Stanford Dogs images and compute average colors."""
        dogs_base = self.download_dogs_dataset()
        # Dataset contains Images/*/*.jpg
        print("Indexing dog images...")
        image_paths = sorted(list((dogs_base / "Images").rglob("*.jpg")))
        if not image_paths:
            # Try alternate case/extension
            image_paths = sorted(list((dogs_base / "images").rglob("*.jpg")))
        if not image_paths:
            raise FileNotFoundError("Could not find dog images under the downloaded dataset.")

        print(f"Found {len(image_paths)} dog images. Computing average colors...")
        colors = []
        for p in image_paths:
            try:
                with Image.open(p) as im:
                    im = im.convert('RGB')
                    arr = np.array(im)
                    colors.append(np.mean(arr, axis=(0, 1)))
            except Exception:
                continue

        self.dog_image_paths = image_paths
        self.tile_colors = np.array(colors)
        print("Dogs dataset loaded.")
    
    def find_best_match(self, target_color: np.ndarray) -> int:
        """Find the tile image with the closest average color to the target."""
        if self.tile_colors is None:
            raise RuntimeError("Tile colors not loaded.")
        distances = np.sqrt(np.sum((self.tile_colors - target_color) ** 2, axis=1))
        return int(np.argmin(distances))

    def _get_tile_image(self, index: int) -> Image.Image:
        """Return the PIL Image for a tile at index depending on dataset."""
        if self.dataset == "cifar":
            return Image.fromarray(self.cifar_images[index])
        if self.dataset == "tiny":
            return Image.open(self.tiny_image_paths[index]).convert('RGB')
        # dogs
        return Image.open(self.dog_image_paths[index]).convert('RGB')
    
    def create_mosaic(self, input_image_path: str, output_path: str, 
                     tile_size: int = 32, mosaic_width: int = 64) -> str:
        """
        Create a mosaic from the input image using CIFAR-10 images.
        
        Args:
            input_image_path: Path to the input image
            output_path: Path to save the output mosaic
            tile_size: Size of each CIFAR-10 tile in the final mosaic
            mosaic_width: Number of tiles horizontally
        
        Returns:
            Path to the created mosaic image
        """
        # Load input image
        input_img = Image.open(input_image_path).convert('RGB')
        
        # Calculate mosaic dimensions
        mosaic_height = int(mosaic_width * input_img.height / input_img.width)
        
        # Resize input image to match tile grid
        grid_img = input_img.resize((mosaic_width, mosaic_height), Image.Resampling.LANCZOS)
        grid_array = np.array(grid_img)
        
        # Create output mosaic
        output_width = mosaic_width * tile_size
        output_height = mosaic_height * tile_size
        mosaic = Image.new('RGB', (output_width, output_height))
        
        print(f"Creating {mosaic_width}x{mosaic_height} mosaic...")
        
        # Fill mosaic with CIFAR-10 images
        for y in range(mosaic_height):
            for x in range(mosaic_width):
                # Get target color from the grid
                target_color = grid_array[y, x]
                
                # Find best matching tile image
                best_match_idx = self.find_best_match(target_color)
                cifar_img = self._get_tile_image(best_match_idx)
                
                # Resize/enhance CIFAR image to tile size and paste into mosaic
                cifar_final = self._enhance_tile(cifar_img, tile_size)
                mosaic.paste(cifar_final, (x * tile_size, y * tile_size))
            
            if (y + 1) % 10 == 0:
                print(f"Completed {y + 1}/{mosaic_height} rows...")
        
        # Save the mosaic
        mosaic.save(output_path, quality=95)
        print(f"Mosaic saved to {output_path}")
        
        return output_path
    
    def create_web_tiles(self, input_image_path: str, output_dir: str, 
                        tile_size: int = 32, mosaic_width: int = 64) -> Dict:
        """
        Create individual tile images and metadata for web display.
        
        Returns:
            Dictionary with mosaic metadata including tile positions and CIFAR indices
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)
        
        # Load input image
        input_img = Image.open(input_image_path).convert('RGB')
        
        # Calculate mosaic dimensions
        mosaic_height = int(mosaic_width * input_img.height / input_img.width)
        
        # Resize input image to match tile grid
        grid_img = input_img.resize((mosaic_width, mosaic_height), Image.Resampling.LANCZOS)
        grid_array = np.array(grid_img)
        
        # Create metadata
        metadata = {
            'width': mosaic_width,
            'height': mosaic_height,
            'tile_size': tile_size,
            'tiles': []
        }
        
        print(f"Creating web tiles for {mosaic_width}x{mosaic_height} mosaic...")
        
        # Create individual tiles
        for y in range(mosaic_height):
            for x in range(mosaic_width):
                # Get target color from the grid
                target_color = grid_array[y, x]
                
                # Find best matching tile image
                best_match_idx = self.find_best_match(target_color)
                cifar_img = self._get_tile_image(best_match_idx)
                
                # Save tile with enhanced high-quality upscaling
                tile_filename = f"tile_{y}_{x}.png"
                tile_path = output_dir / tile_filename
                
                # Use the same enhancement pipeline as the main mosaic
                cifar_final = self._enhance_tile(cifar_img, tile_size)
                
                cifar_final.save(tile_path, optimize=True, quality=95)
                
                # Add to metadata
                metadata['tiles'].append({
                    'x': x,
                    'y': y,
                    'filename': tile_filename,
                    'cifar_index': int(best_match_idx)
                })
        
        # Save metadata
        metadata_path = output_dir / 'metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Created {len(metadata['tiles'])} tiles in {output_dir}")
        return metadata

def main():
    """Main entry point for the mosaic generator."""
    parser = argparse.ArgumentParser(
        description="Generate image mosaics using various datasets",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.jpg                    # Use default settings
  %(prog)s input.jpg --dataset cifar    # Use CIFAR-10 dataset
  %(prog)s input.jpg --tile-size 16     # Custom tile size
  %(prog)s input.jpg --output custom.jpg # Custom output path
        """
    )
    
    parser.add_argument('input_image', help='Path to input image')
    parser.add_argument('-o', '--output', help='Output path for mosaic image',
                        default=CONFIG["generation"]["static_mosaic"].get("output_path", "mosaic_output.jpg"))
    parser.add_argument('-d', '--dataset', choices=['cifar', 'tiny', 'dogs'],
                        default=CONFIG["datasets"]["default"],
                        help='Dataset to use for tiles')
    parser.add_argument('--tile-size', type=int,
                        default=CONFIG["generation"]["static_mosaic"]["tile_size"],
                        help='Size of each tile in pixels')
    parser.add_argument('--mosaic-width', type=int,
                        default=CONFIG["generation"]["static_mosaic"]["mosaic_width"],
                        help='Number of tiles horizontally')
    parser.add_argument('--web-tiles', action='store_true',
                        help='Also generate web tiles for interactive display')
    parser.add_argument('--web-output-dir',
                        default=CONFIG["generation"]["web_tiles"].get("output_dir", "public/mosaic_tiles_ultra_hd"),
                        help='Output directory for web tiles')
    parser.add_argument('--data-dir',
                        default=CONFIG["data"]["cache_dir"],
                        help='Directory for dataset cache')
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = MosaicGenerator(
        data_dir=args.data_dir,
        dataset=args.dataset,
        config=CONFIG
    )

    print(f"\n🎨 Mosaic Generator")
    print(f"Dataset: {args.dataset}")
    print(f"Input: {args.input_image}")
    print(f"Output: {args.output}\n")
    
    # Download and load dataset
    if generator.dataset == "tiny":
        generator.download_tiny_imagenet()
        generator.load_all_tiny_data()
    elif generator.dataset == "dogs":
        generator.load_all_dogs_data()
    else:
        generator.download_cifar10()
        generator.load_all_cifar_data()
    
    # Create static mosaic
    generator.create_mosaic(
        args.input_image,
        args.output,
        tile_size=args.tile_size,
        mosaic_width=args.mosaic_width
    )
    
    # Create web tiles if requested
    if args.web_tiles:
        web_config = CONFIG["generation"]["web_tiles"]
        generator.create_web_tiles(
            args.input_image,
            args.web_output_dir,
            tile_size=web_config["tile_size"],
            mosaic_width=web_config["mosaic_width"]
        )
    
    print("Mosaic generation complete!")

if __name__ == "__main__":
    main()