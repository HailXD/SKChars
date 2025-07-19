import re
from bs4 import BeautifulSoup
import requests
import pandas as pd
import pickle as pkl

# website = requests.get('https://soul-knight.fandom.com/wiki/Characters').text
# with open('characters.html', 'w', encoding='utf-8') as f:
#     f.write(website)

base = "https://soul-knight.fandom.com"
tables = pd.read_html("characters.html", extract_links="all")
df = tables[1]

def _pretty(col):
    if isinstance(col, tuple):
        if col[0]:
            return col[0]
        if col[1]:
            return col[1].split("/")[-1].replace("_", " ").title()
    return str(col)

df.columns = [_pretty(c) for c in df.columns]
df = df[['Character', 'ID']].copy()
df['URL'] = df['Character'].apply(lambda x: x[1] if isinstance(x, tuple) else None)
df["Character"] = df["Character"].apply(lambda x: x[0] if isinstance(x, tuple) else x)
df['ID'] = [_pretty(c).lstrip('0') for c in df['ID']]
df['ID'] = df['ID'].replace('', '0')
df['ID'] = df['ID'].astype(int)
df = df[df['ID'] < 100]

print(df)