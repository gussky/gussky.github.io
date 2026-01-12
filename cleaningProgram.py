import pandas as pd
import numpy as np

# --- 1. Define the path to your data file ---
file_path = '/Users/gustav/Desktop/Data visualization/gussky.github.io/public/cleaned_interm_food_facts.csv' 

# --- 2. Define the list of columns to KEEP (Same as before) ---
columns_to_keep = [
    'product_name', 'brands', 'image_url', 'serving_size',
    'main_category_en', 'pnns_groups_1', 'pnns_groups_2', 
    'nutriscore_grade', 'nova_group', 'ingredients_text', 
    'allergens', 'additives_n', 
    'energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 
    'sugars_100g', 'fat_100g', 'saturated-fat_100g', 
    'fiber_100g', 'sodium_100g'
]

# --- 3. Load and Downsample the Data ---
try:
    df = pd.read_csv(file_path, usecols=columns_to_keep)
    initial_rows = df.shape[0]
    print(f"Successfully loaded data with {initial_rows} rows.")
    
    # --- New Step: Filter Only Sugary and Salty Snacks ---
    target_groups = ['Sugary snacks', 'Salty snacks']
    # Filter by pnns_groups_1 (or checking both groups if needed, usually group 1 is high level)
    # We normalized missing data to 'No Data' later, but here we filter raw.
    # We should handle NaN safely.
    df = df[df['pnns_groups_1'].isin(target_groups)]
    
    rows_after_filtering = df.shape[0]
    
    print(f"\n--- Filtering Complete ---")
    print(f"Retained {rows_after_filtering} rows (only Sugary and Salty snacks) from {initial_rows} rows.")

    # --- 4. Data Cleaning Steps (Applied to the sampled data) ---
    print("\n--- Starting Data Cleaning on Sampled Data ---")

    # A. Remove Duplicate Rows
    df.drop_duplicates(inplace=True)

    # B. Define Numerical Columns
    numerical_cols = [
        'energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 
        'sugars_100g', 'fat_100g', 'saturated-fat_100g', 
        'fiber_100g', 'sodium_100g', 'additives_n'
    ]

    # C. Convert Numerical Columns to Float and Impute NaNs with Median
    for col in numerical_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        df[col].fillna(df[col].median(), inplace=True)
    
    # D. Handle Missing Categorical/Text Values (Filling)
    categorical_cols = [
        'product_name', 'brands', 'main_category_en', 
        'pnns_groups_1', 'pnns_groups_2', 'nutriscore_grade', 
        'nova_group', 'ingredients_text', 'allergens', 'serving_size', 'image_url'
    ]
    for col in categorical_cols:
        df[col].fillna('No Data', inplace=True)

    # E. Final Check
    print("\n--- Cleaning Complete. Final DataFrame Summary: ---")
    df.info()
    
    # --- 5. Save the Cleaned and Sampled DataFrame ---
    output_file_path = './dist/cleaned_interm_food_facts.csv'
    df.to_csv(output_file_path, index=False)
    print(f"\nSuccessfully saved the cleaned and sampled data to '{output_file_path}'")
    
except ValueError as e:
    print(f"Error loading columns. Check the column names in your CSV file. Details: {e}")
    
except FileNotFoundError:
    print(f"Error: The file '{file_path}' was not found. Please ensure the file is accessible.")