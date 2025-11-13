"""
Script to find and replace decomposed Unicode characters in qa.json
Specifically fixes "마ᄏeteᅥ" to "마케터"
"""
import json
import unicodedata

def fix_decomposed_text(text):
    """Replace known decomposed patterns with their correct composed forms"""
    if not isinstance(text, str):
        return text
    
    # Known decomposed patterns and their correct replacements
    replacements = {
        '마ᄏeteᅥ': '마케터',
        '마ᄏ': '마케',
        'eteᅥ': '터',
    }
    
    # Apply replacements
    for decomposed, composed in replacements.items():
        if decomposed in text:
            text = text.replace(decomposed, composed)
            print(f'   Replaced: "{decomposed}" → "{composed}"')
    
    # Also apply full NFC normalization
    text = unicodedata.normalize('NFC', text)
    
    return text

def fix_dict_recursively(obj):
    """Recursively fix all strings in nested dictionaries/lists"""
    if isinstance(obj, dict):
        return {k: fix_dict_recursively(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_dict_recursively(item) for item in obj]
    elif isinstance(obj, str):
        return fix_decomposed_text(obj)
    else:
        return obj

# Load qa.json
print('Loading qa.json...')
with open('qa.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Loaded {len(data.get("conversations", []))} conversations\n')

# Check for issues
print('Scanning for decomposed characters...')
issues_found = 0
for idx, conv in enumerate(data.get('conversations', [])):
    source = conv.get('source', '')
    if 'ᄏ' in source or 'ᅥ' in source or 'ᄆ' in source:
        issues_found += 1
        if issues_found <= 5:  # Show first 5
            print(f'  Issue #{issues_found}: {source}')

print(f'\nTotal issues found: {issues_found}\n')

if issues_found > 0:
    print('Fixing decomposed characters...')
    fixed_data = fix_dict_recursively(data)
    
    # Verify fixes
    print('\nVerifying fixes...')
    remaining_issues = 0
    for conv in fixed_data.get('conversations', []):
        source = conv.get('source', '')
        if 'ᄏ' in source or 'ᅥ' in source or 'ᄆ' in source:
            remaining_issues += 1
    
    if remaining_issues == 0:
        print('✅ All decomposed characters fixed!')
        
        # Save fixed data
        print('\nSaving corrected qa.json...')
        with open('qa.json', 'w', encoding='utf-8') as f:
            json.dump(fixed_data, f, ensure_ascii=False, indent=2)
        
        print('✅ Done! qa.json has been corrected')
        print('\nNow run: python upsert_with_openai_embeddings.py')
    else:
        print(f'⚠️ Warning: {remaining_issues} issues still remain')
        print('You may need to add more replacement patterns')
else:
    print('✅ No issues found! qa.json is already properly encoded')





