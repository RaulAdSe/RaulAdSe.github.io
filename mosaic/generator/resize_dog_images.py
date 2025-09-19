#!/usr/bin/env python3
"""
Resize all dog images to a uniform square size for better mosaic generation.
"""

from PIL import Image
import os
import sys

def resize_images(input_dir, output_dir, size=(100, 100)):
    """
    Resize all images in input directory to specified size.
    
    Args:
        input_dir: Directory containing original images
        output_dir: Directory to save resized images
        size: Target size as (width, height) tuple
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Process each image
    processed = 0
    for filename in os.listdir(input_dir):
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Get current dimensions
                width, height = img.size
                
                # Calculate crop to make square (center crop)
                min_dimension = min(width, height)
                left = (width - min_dimension) // 2
                top = (height - min_dimension) // 2
                right = left + min_dimension
                bottom = top + min_dimension
                
                # Crop to square
                img_cropped = img.crop((left, top, right, bottom))
                
                # Resize to target size
                img_resized = img_cropped.resize(size, Image.Resampling.LANCZOS)
                
                # Save resized image
                img_resized.save(output_path, quality=95)
                processed += 1
                
                # Progress indicator
                sys.stdout.write(f'\rProcessed {processed} images...')
                sys.stdout.flush()
                
        except Exception as e:
            print(f"\nError processing {filename}: {e}")
    
    print(f"\n\nSuccessfully resized {processed} images to {size[0]}x{size[1]} pixels")
    print(f"Saved to: {output_dir}")

if __name__ == "__main__":
    # Configuration
    INPUT_DIR = "/Users/rauladell/Work/Projects/blog/mosaic/generator/stanford_dog_images"
    OUTPUT_DIR = "/Users/rauladell/Work/Projects/blog/mosaic/generator/stanford_dog_images_resized"
    
    # Different size options - choose based on your needs
    SIZE_OPTIONS = {
        'small': (50, 50),      # Small tiles, more detail in mosaic
        'medium': (100, 100),   # Balanced option
        'large': (200, 200),    # Larger tiles, dogs more visible
        'xlarge': (400, 400)    # Very large tiles, dogs clearly visible
    }
    
    # Choose size (change this to experiment)
    chosen_size = 'medium'  # Change to 'small', 'large', or 'xlarge' as needed
    TARGET_SIZE = SIZE_OPTIONS[chosen_size]
    
    print(f"Resizing dog images to {TARGET_SIZE[0]}x{TARGET_SIZE[1]} pixels...")
    print(f"From: {INPUT_DIR}")
    print(f"To: {OUTPUT_DIR}\n")
    
    resize_images(INPUT_DIR, OUTPUT_DIR, TARGET_SIZE)