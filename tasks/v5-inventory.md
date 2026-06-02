# Inventaire des features custom v5 → v6

Catalogue des ajouts du fork **kaligrafy/iD** (branche `v5`, iD 2.17.2) en vue du portage
vers **v6** (`up/develop` moderne). Objectif : décider quoi porter, dans quel ordre, et
avec quelles adaptations TypeScript.

## Méthode

- Base de divergence avec l'amont moderne : merge-base `667406c6e` (ancienne, car `develop`
  est une réécriture).
- Isolation du custom par **auteur** : `Pierre-Léo Bourbonnais` = **452 commits** (les
  commits `Quincy Morgan` / `Bryan Housel` sont de l'amont, présents par effet de merge-base).
- Caractérisation par exploration ciblée des fichiers `modules/{actions,operations,ui,svg,osm}`.

Commande de référence :
```
git log --author="Pierre-Léo" --oneline 667406c6e..v5 -- <chemins>
```

## Déjà porté dans v6

PRs mergées sur `v6` (fork `kaligrafy/iD`, base `v6`), ordre chronologique :

| PR | Feature | Notes |
|----|---------|-------|
| #27 | Raccourcis clavier de presets | Définis par l'utilisateur, sans menu favoris (base #11269) |
| #28 | `curverize` (arc) | TS ; raccourci `$` |
| #29 | `smooth` (ex-`smooth_long`) | TS ; raccourci `#` ; Chaikin inliné |
| #30 | Famille `clone` (sous-menu cascade) | Action générique + fabrique config-driven |
| #31 | Champ `sidewalk` (roads) | encode/decode + preset |
| #32 | Champ `cycleway` | écrit `cycleway:both`, option shoulder, ligne « Both sides » |
| #33 | `prerequisiteTag` en array (OR) | presets |
| #34 | Sous-champs cycleway | marking, separation, buffer, oneway |
| #35 | Strings de champs custom → fichiers locale JSON | infra i18n |
| #36 | `oneway:bicycle` sur routes non-motorway | |
| #37 | Warning tags cycleway/sidewalk redondants | validation |
| #38 | `clone` : raccourcis par type ; transition = `placement` seul | affinage famille clone |
| #39 | `follow-segment` | + fix way fermé |
| #40 | Préférence longueur de segment Circularize | **enhancement hors v5** |
| #41 | Mode `insert-waypoint` | menu + `K`, Alt-move plus proche, retrait nœud « sandwich » |
| #42 | Préférence « supprimer hors vue » | **enhancement hors v5**, delete uniquement |
---

## 1. Opérations de géométrie

### follow — ✅ **PORTÉ (#39, sous le nom `follow-segment`)**
Remplace la géométrie d'un way cible (`selectedIDs[0]`) entre deux nœuds partagés par la
séquence de nœuds d'un way source (`selectedIDs[1]`) entre les mêmes nœuds. Préserve les
intersections/nœuds taggés (re-projection sur le nouveau tracé), supprime les orphelins.
- Porté en TS comme `actionFollowSegment` + opération `follow_segment` (collision de namespace
  i18n/op `follow` évitée), avec tests paramétriques et fix du cas way fermé.
- `follow_old` (`modules/{actions,operations}/follow_old.js`) : **SKIP** (legacy) — non porté.

---

## 2. Famille « clone attributes » — ✅ **PORTÉ (#30, affiné par #38)**

Porté via un **sous-menu cascade** (#30) plutôt que 12 opérations plates ; la **recommandation
de fabrique config-driven a été suivie** (action générique + table d'entrées). #38 a ajouté les
**raccourcis par type** et restreint `clone_transition` à `placement` seul. Détail historique v5
ci-dessous conservé pour référence.

12 opérations actives + 1 désactivée. Multi-sélection (≥2) : **1er sélectionné = source**, les
autres = cibles ; copie des tags présents sur la source uniquement (ne vide pas les cibles).
11/12 partagent l'action `actionCloneRoadAttributes(selectedIDs, cloneTags, languageSuffixes?)`.

| Opération | Raccourci v5 | Tags copiés (résumé) | Triage |
|-----------|:---:|---|---|
| `clone_address` | `&` | 16 `addr:*` (action dédiée, + bouton toolbar) | PORT |
| `clone_name` | `%` | `name`/`operator`/… + variantes `:fr`/`:en` | PORT |
| `clone_lanes` | `#` | `lanes`(`:forward/backward`) | PORT |
| `clone_turn_lanes` | `$` | `turn:lanes*` | PORT |
| `clone_sidewalk` | `=` | `sidewalk*`, `foot` | PORT |
| `clone_cycleway` | — | jeu cycleway étendu | PORT |
| `clone_bicycle_tag` | `*` | `bicycle` seul | MAYBE (fusion avec cycleway) |
| `clone_bus_lanes` | — | `bus:lanes*`, `lanes:bus*`, `busway:*` | PORT |
| `clone_transition` | `!` | `placement*`, `width:lanes*` (Transition) | PORT |
| `clone_maxspeed` | `)` | `maxspeed` | PORT |
| `clone_surface` | `(` | `surface` (bug i18n: annotation parle de « bus lanes ») | PORT (corriger i18n) |
| `clone_dual_carriageway` | — | `dual_carriageway` | MAYBE (confirmer usage v6) |
| `clone_road_attributes` (parapluie) | — | **désactivé** (export commenté) | SKIP |

- **Recommandation forte** : remplacer ~700 lignes de wrappers dupliqués par **une action TS
  typée + une fabrique d'opérations pilotée par config** (`{id, key, tags, languageSuffixes}`).
  Bien plus court et reviewable ; chaque clone devient une entrée de table.
- Ajouter icônes SVG (aucune actuellement) ou accepter l'absence. Ajouter tests paramétriques.
- ⚠️ **Conflits de raccourcis** : `#` et `$` sont déjà pris en v6 (`smooth`, `curverize`).
  Les raccourcis clone devront être **réattribués** (voir §6).

---

## 3. Champs de formulaire custom

| Champ | Triage | Raison |
|-------|--------|--------|
| `buswaylanes` | **PORT (haute)** — *à faire* | Fork-only, pas d'équivalent amont ; calcule `bus:lanes:*`/`lanes:bus:*`/`busway:*` depuis nb de voies + côté. ~337 l. Corriger typos (`"justom"`), retirer `console.log`, tester `computeBusLanesFromLanesCountAndSide` isolément. |
| `sidewalk` | ✅ **PORTÉ (#31)** | Champ sidewalk pour les routes, logique encode/decode. |
| `cycleway` | ✅ **PORTÉ (#32, #34, #36)** | Écrit `cycleway:both`, option shoulder, ligne « Both sides », sous-champs (marking/separation/buffer/oneway), `oneway:bicycle` sur non-motorway. |
| `access` | **MAYBE** — *à faire* | Champ access existe en amont ; garder surtout les clés `routing:*` (motor_vehicle/bicycle/bus) et options fork (`use_sidepath`…). Diff à faire vs v6. |

Définitions : `data/presets/fields/<champ>.json` + `data/presets/schema/field.json` ;
enregistrement `modules/ui/fields/index.js`. ⚠️ L'inspecteur v6 (factory de champs) diffère du
pattern D3 v5 → adaptation nécessaire.

---

## 4. Helpers OSM (`osm/tags.js`, `osm/way.js`) — **PORT (petit, transverse)**

Pré-requis de `follow` et des outils bridge/tunnel + rendu.

- `tags.js` : `osmRightSideIsInsideTags += dual_carriageway` ; **nouveaux exports**
  `osmTagsAllowingBridges` / `osmTagsAllowingTunnels` (incluent `busway` + waterways) ;
  `osmRoutableHighwayTagValues += busway`.
- `way.js` : `getNodesBetween` (primitive de `follow`), `nextNodeIdx`/`prevNodeIdx`,
  `indexIsFirstOrLastOfClosed`, largeur de voie `busway: 4`. (`getNodesBefore/After` buggés et
  inutilisés → ne pas porter.)

---

## 5. UI, presets toolbar & rendu

| Élément | Triage | Raison |
|---------|--------|--------|
| Opérations custom du top toolbar | **PORT** | = curverize/smooth/follow/clone (portées individuellement, pas en bloc) |
| `view_on_osmose.js` | ❌ **AMONT — rien à porter** | Pas une feature fork : créé en amont par **SilentSpike** (2020-02-15), **déjà présent dans v6**. (Le worktree v5 l'attribue à PLB car copié dans le fork en 2022, commit `33c9fc7a0`, après le merge-base 2020-01.) |
| Recent / Generic ribbons | **MAYBE** | Seulement si v6 n'a pas d'équivalent |
| `midpoints.js` / `vertices.js` (couleur d'icône preset) | **MAYBE (tweak seul)** | `midpoints.js`/`vertices.js` sont du **cœur amont** (déjà en v6) ; seule la retouche QC « couleur d'icône preset » (qq commits PLB) serait éventuellement à porter — vérifier vs v6 d'abord. |
| Menu **favoris** (favorites/recents drag, `default_*favorites.json`, ★) | **SKIP** | Hors scope décidé pour le port shortcuts |
| `zoom_to_selection.js` | ❌ **AMONT — rien à porter** | Pas une feature fork : créé en amont par **Quincy Morgan** (2020-02-26), **déjà présent dans v6**. (Idem : copié dans le fork v5 en 2022, commit `33c9fc7a0`.) |
| `tag_classes.js` (+`lines.js` over-stroke, **CSS** `30_highways.css`, `debug-surfaces`) | **SEPARATE-TRACK** | QA visuel Québec (coloration routes/cycleways/sidewalks, erreurs de tags). ~568 l + milliers de sélecteurs CSS. Migration dédiée, pas une PR toolbar. À coupler avec presets/CSS. |

---

## 6. Track « data / presets / imagery / CSS » (revue manuelle)

**Checklist presets v5 → v6 :** [v5-presets-todo.md](./v5-presets-todo.md) (cases à cocher ;
regénérer avec `node scripts/list_v5_presets_port.js --write`). Pipeline v6 :
[data/custom-tagging/README.md](../data/custom-tagging/README.md).

Géré séparément (todo `presets-css-manual`). Décision : créer un groupe **`quebec-specific`**
plutôt que remplacer l'amont. Catégories observées dans les commits :
- **Presets/champs Québec** : cycleway shoulder, sidewalk, bus lanes, truck/truck_repair,
  access_aisle→footway_link, maxspeed résidentiel 60→70, dual_carriageway, etc.
- **Imagery** : Drummondville, Sherbrooke (et autres sources QC).
- **Raccourcis** (`data/shortcuts.json`, `data/core.yaml`) : déjà sur le track shortcuts.
- **CSS** (`css/30_highways.css`, `50_misc.css`) : couplé à `tag_classes` (track rendu).

---

## 7. Ordre de PR proposé (à valider)

Chaque ligne = une petite PR sur `v6`, sur le modèle curverize/smooth.

1. ✅ **`follow`** → #39 (`follow-segment`, + fix way fermé).
2. ✅ **Clone family** → #30 (sous-menu cascade) + #38 (raccourcis par type).
3. **Champ `buswaylanes`** (+ preset/field) — *à faire*.
4. ✅ **Champ `sidewalk`** → #31.
5. ~~`view_on_osmose`~~ → ❌ **amont, déjà en v6** (voir §5) — retiré des candidats.
6. **`cycleway`** → ✅ #32/#34/#36. **`access`** : diff vs v6 puis porter règles utiles — *à faire*.
7. *(SEPARATE-TRACK)* `tag_classes` + `lines` + CSS highways + `debug-surfaces` : migration QA visuelle dédiée — *à faire*.

**Restant principal** : `buswaylanes`, `access`, partial lane widths,
helpers `osm/way.js`/`osm/tags.js` (si pas déjà tirés par #39), et le track QA visuel (CSS).

**Faux candidats (amont, pas des features fork — rien à porter)** : `view_on_osmose`,
`zoom_to_selection`, `midpoints`/`vertices` (cœur), et `offset` (= décalage d'imagerie amont
`background_offset`, Bryan Housel 2017 ; aucun `operations/offset.js` n'existe en v5).

**Enhancements hors v5 ajoutés en cours de route** : préférence longueur segment Circularize (#40),
mode `insert-waypoint` modernisé (#41), préférence « supprimer hors vue » (#42).

---

## 8. Questions ouvertes pour Pierre-Léo

1. ✅ **Champ `cycleway`** : porté (#32/#34/#36). Reste **`access`** : on attend un diff vs l'amont v6 avant de décider — d'accord ?
2. **QA visuel (`tag_classes`+CSS)** : track séparé dédié, confirmé ?
3. **`buswaylanes` / `access` / partial lane widths** : prochains candidats — quel ordre ? (`view_on_osmose`/`offset` écartés : amont, déjà en v6.)
