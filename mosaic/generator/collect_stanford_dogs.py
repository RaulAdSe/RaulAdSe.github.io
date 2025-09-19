import os
import shutil
import random
from pathlib import Path

def collect_dog_images(stanford_path, output_dir, images_per_breed=2, total_images=200):
    """Collect diverse high-quality dog images from Stanford Dogs dataset"""
    
    images_path = Path(stanford_path) / "versions/2/images/Images"
    output_path = Path(output_dir)
    
    # Create output directory
    output_path.mkdir(exist_ok=True)
    
    # Get all breed directories
    breed_dirs = [d for d in images_path.iterdir() if d.is_dir()]
    print(f"Found {len(breed_dirs)} dog breeds")
    
    # Shuffle breeds for variety
    random.shuffle(breed_dirs)
    
    collected_images = 0
    breed_count = 0
    
    for breed_dir in breed_dirs:
        if collected_images >= total_images:
            break
            
        breed_name = breed_dir.name.split('-')[1] if '-' in breed_dir.name else breed_dir.name
        print(f"Processing {breed_name}...")
        
        # Get all images in this breed directory
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png']:
            image_files.extend(breed_dir.glob(ext))
        
        if not image_files:
            continue
            
        # Select random images from this breed
        selected = random.sample(image_files, min(images_per_breed, len(image_files)))
        
        for i, image_file in enumerate(selected):
            if collected_images >= total_images:
                break
                
            # Create descriptive filename
            output_name = f"dog_{breed_count:03d}_{breed_name}_{i:02d}.jpg"
            output_file = output_path / output_name
            
            try:
                shutil.copy2(image_file, output_file)
                collected_images += 1
                print(f"  Copied {output_name}")
            except Exception as e:
                print(f"  Failed to copy {image_file}: {e}")
        
        breed_count += 1
    
    print(f"\nCollected {collected_images} high-quality dog images from {breed_count} breeds")
    return collected_images

if __name__ == "__main__":
    stanford_dataset_path = "/Users/rauladell/.cache/kagglehub/datasets/jessicali9530/stanford-dogs-dataset"
    output_directory = "stanford_dog_images"
    
    # Set random seed for reproducible selection
    random.seed(42)
    
    collect_dog_images(
        stanford_path=stanford_dataset_path,
        output_dir=output_directory,
        images_per_breed=3,  # 3 images per breed for variety
        total_images=250     # Collect more than needed for best selection
    )