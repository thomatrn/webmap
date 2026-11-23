# Île custom (au sud, à gauche de l'île avec la piste)

- `assets/island-noshore.png` : l'île utilisée (terre seule, comme l'île du sud voisine).
- `assets/island.png` : variante avec halo de rivage (style de la côte de Los Santos).
- `assets/map.original.svg` : la carte d'origine (avec les îles de Cayo Perico).

## Déplacer / redimensionner l'île

Nécessite Python avec Pillow (`pip install pillow`).

```bash
python3 scripts/island/insert.py public/map.svg assets/island.png <centre_x> <centre_y> <largeur_terre>
```

Valeurs actuelles : `assets/island-noshore.png 807 757 48` (unités du viewBox SVG, 1440 x 810).
Le script remplace l'île existante, on peut le relancer autant de fois que nécessaire.
**Ensuite, régénère les tuiles :** `python3 scripts/build-tiles.py`

`segment.py` / `render.py` : découpage et recoloration depuis une capture d'écran (crop codé en dur pour la capture utilisée).
