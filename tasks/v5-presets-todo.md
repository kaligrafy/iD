# Presets v5 → v6 (checklist)

Généré par `node scripts/list_v5_presets_port.js` le 2026-06-02.

**Source v5:** `/Users/admin/ws/id/data/presets/presets` (fichiers JSON, heuristique sur l’id).

**Registre v6** (`data/custom-tagging/src/registry.ts`): `highway/footway/footway_link`, `highway/footway/footway_link_bicycle_dismount`, `highway/footway/footway_link_bicycle_yes`, `highway/cycleway/cycleway_link`.

## Porté en v6 (hors liste v5)

- [x] `highway/footway/footway_link_bicycle_dismount` (nouveau en v6)
- [x] `highway/footway/footway_link_bicycle_yes` (nouveau en v6)

## Champs / templates (pas des presets)

Voir [v5-inventory.md](./v5-inventory.md) §3 — portés autrement en v6 :

- [x] `placement` (champ, `data/custom-tagging/`)
- [x] `sidewalk` (champ sur routes, PR #31)
- [x] `cycleway` + sous-champs (PR #32–#36)
- [x] `buswaylanes`
- [x] `access` (clés `routing:*`, etc.)

> v5 embarque tout un vieux tagging-schema (~6200 presets). Cette liste ne couvre **que** les ids Transition (clients/privé, liens, traversées détaillées, etc.), pas l’amont NSI.

**Note:** En v5, le lien cyclable était `highway/cycleway/crossing/cycleway_link` ; en v6 c’est `highway/cycleway/cycleway_link` (ligne). Les variantes `footway_link_bicycle_*` sont nouvelles en v6.

## amenity/parking

- [ ] `amenity/parking/underground_customers_parking_entrance`
- [ ] `amenity/parking/underground_private_parking_entrance_employees`
- [ ] `amenity/parking/underground_private_parking_entrance_residents`

## amenity/parking-customers

- [ ] `amenity/parking-customers`

## amenity/parking-customers-unpaved

- [ ] `amenity/parking-customers-unpaved`

## amenity/parking-private

- [ ] `amenity/parking-private`

## amenity/parking-private-unpaved

- [ ] `amenity/parking-private-unpaved`

## barrier/customers_gate

- [ ] `barrier/customers_gate`

## barrier/private-gate

- [ ] `barrier/private-gate`

## emergency/_private

- [ ] `emergency/_private`

## highway/crossing

- [ ] `highway/crossing/traffic_signals`
- [ ] `highway/crossing/traffic_signals-dots`
- [ ] `highway/crossing/traffic_signals-lines`
- [ ] `highway/crossing/traffic_signals-other`
- [ ] `highway/crossing/traffic_signals-pictograms`
- [ ] `highway/crossing/traffic_signals-zebra`
- [ ] `highway/crossing/uncontrolled`
- [ ] `highway/crossing/uncontrolled-dots`
- [ ] `highway/crossing/uncontrolled-lines`
- [ ] `highway/crossing/uncontrolled-other`
- [ ] `highway/crossing/uncontrolled-pictograms`
- [ ] `highway/crossing/uncontrolled-zebra`
- [ ] `highway/crossing/unmarked`

## highway/cycleway

- [x] `highway/cycleway/crossing/cycleway_link` → v6: `highway/cycleway/cycleway_link`
- [ ] `highway/cycleway/crossing/marked`
- [ ] `highway/cycleway/crossing/traffic_signals-dots_no_foot`
- [ ] `highway/cycleway/crossing/traffic_signals-dots_not_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals-dots_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals-lines_no_foot`
- [ ] `highway/cycleway/crossing/traffic_signals-lines_not_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals-lines_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals-zebra_no_foot`
- [ ] `highway/cycleway/crossing/traffic_signals-zebra_not_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals-zebra_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals_no_foot`
- [ ] `highway/cycleway/crossing/traffic_signals_no_foot-other`
- [ ] `highway/cycleway/crossing/traffic_signals_not_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals_not_segregated-other`
- [ ] `highway/cycleway/crossing/traffic_signals_segregated`
- [ ] `highway/cycleway/crossing/traffic_signals_segregated-other`
- [ ] `highway/cycleway/crossing/uncontrolled-dots_no_foot`
- [ ] `highway/cycleway/crossing/uncontrolled-dots_not_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled-dots_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled-lines_no_foot`
- [ ] `highway/cycleway/crossing/uncontrolled-lines_not_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled-lines_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled-zebra_no_foot`
- [ ] `highway/cycleway/crossing/uncontrolled-zebra_not_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled-zebra_segregated`
- [ ] `highway/cycleway/crossing/uncontrolled_no_foot-other`
- [ ] `highway/cycleway/crossing/uncontrolled_not_segregated-other`
- [ ] `highway/cycleway/crossing/uncontrolled_segregated-other`
- [ ] `highway/cycleway/crossing/unmarked_bicycle_connector`
- [ ] `highway/cycleway/crossing/unmarked_no_foot`
- [ ] `highway/cycleway/crossing/unmarked_not_segregated`
- [ ] `highway/cycleway/crossing/unmarked_segregated`

## highway/footway

- [ ] `highway/footway/access_aisle`
- [ ] `highway/footway/bicycle_dismount_asphalt`
- [ ] `highway/footway/bicycle_dismount_concrete`
- [ ] `highway/footway/bicycle_dismount_other`
- [ ] `highway/footway/crossing/traffic_signals`
- [ ] `highway/footway/crossing/traffic_signals-lines`
- [ ] `highway/footway/crossing/traffic_signals-other`
- [ ] `highway/footway/crossing/traffic_signals-zebra`
- [ ] `highway/footway/crossing/uncontrolled-dashed`
- [ ] `highway/footway/crossing/uncontrolled-dots`
- [ ] `highway/footway/crossing/uncontrolled-lines`
- [ ] `highway/footway/crossing/uncontrolled-other`
- [ ] `highway/footway/crossing/uncontrolled-surface`
- [ ] `highway/footway/crossing/uncontrolled-zebra`
- [ ] `highway/footway/crossing/unmarked`
- [ ] `highway/footway/crossing/unmarked_asphalt`
- [ ] `highway/footway/crossing/unmarked_concrete`
- [ ] `highway/footway/crossing/unmarked_customers`
- [ ] `highway/footway/crossing/unmarked_private`
- [ ] `highway/footway/customers-informal`
- [ ] `highway/footway/customers_access_aisle`
- [ ] `highway/footway/customers_asphalt`
- [ ] `highway/footway/customers_concrete`
- [ ] `highway/footway/customers_footway_link`
- [ ] `highway/footway/customers_other`
- [ ] `highway/footway/customers_sidewalk`
- [x] `highway/footway/footway_link`
- [ ] `highway/footway/private-informal`
- [ ] `highway/footway/private_access_aisle`
- [ ] `highway/footway/private_asphalt`
- [ ] `highway/footway/private_concrete`
- [ ] `highway/footway/private_footway_link`
- [ ] `highway/footway/private_other`
- [ ] `highway/footway/private_sidewalk`

## highway/primary-opposite-use_sidepath

- [ ] `highway/primary-opposite-use_sidepath`

## highway/primary_sidewalk_both

- [ ] `highway/primary_sidewalk_both`

## highway/primary_sidewalk_left

- [ ] `highway/primary_sidewalk_left`

## highway/primary_sidewalk_right

- [ ] `highway/primary_sidewalk_right`

## highway/residential-opposite-use_sidepath

- [ ] `highway/residential-opposite-use_sidepath`

## highway/residential_sidewalk_both

- [ ] `highway/residential_sidewalk_both`

## highway/residential_sidewalk_left

- [ ] `highway/residential_sidewalk_left`

## highway/residential_sidewalk_right

- [ ] `highway/residential_sidewalk_right`

## highway/secondary-opposite-use_sidepath

- [ ] `highway/secondary-opposite-use_sidepath`

## highway/secondary_sidewalk_both

- [ ] `highway/secondary_sidewalk_both`

## highway/secondary_sidewalk_left

- [ ] `highway/secondary_sidewalk_left`

## highway/secondary_sidewalk_right

- [ ] `highway/secondary_sidewalk_right`

## highway/service

- [ ] `highway/service/customers-driveway`
- [ ] `highway/service/customers-parking-aisle`
- [ ] `highway/service/private-driveway`
- [ ] `highway/service/private-parking_aisle`
- [ ] `highway/service/private-unpaved-driveway`
- [ ] `highway/service/private-unpaved-parking-aisle`

## highway/service-customers

- [ ] `highway/service-customers`

## highway/service-customers-opposite-use_sidepath

- [ ] `highway/service-customers-opposite-use_sidepath`

## highway/service-customers-unpaved

- [ ] `highway/service-customers-unpaved`

## highway/service-customers_separate_right

- [ ] `highway/service-customers_separate_right`

## highway/service-customers_sidewalk_both

- [ ] `highway/service-customers_sidewalk_both`

## highway/service-customers_sidewalk_left

- [ ] `highway/service-customers_sidewalk_left`

## highway/service-destination

- [ ] `highway/service-destination`

## highway/service-destination-opposite-use_sidepath

- [ ] `highway/service-destination-opposite-use_sidepath`

## highway/service-destination_separate_both

- [ ] `highway/service-destination_separate_both`

## highway/service-destination_separate_left

- [ ] `highway/service-destination_separate_left`

## highway/service-destination_separate_right

- [ ] `highway/service-destination_separate_right`

## highway/service-private

- [ ] `highway/service-private`

## highway/service-private-opposite-use_sidepath

- [ ] `highway/service-private-opposite-use_sidepath`

## highway/service-private-unpaved

- [ ] `highway/service-private-unpaved`

## highway/service-private_sidewalk_both

- [ ] `highway/service-private_sidewalk_both`

## highway/service-private_sidewalk_left

- [ ] `highway/service-private_sidewalk_left`

## highway/service-private_sidewalk_right

- [ ] `highway/service-private_sidewalk_right`

## highway/steps_customers

- [ ] `highway/steps_customers`

## highway/steps_private

- [ ] `highway/steps_private`

## highway/tertiary-opposite-use_sidepath

- [ ] `highway/tertiary-opposite-use_sidepath`

## highway/tertiary_sidewalk_both

- [ ] `highway/tertiary_sidewalk_both`

## highway/tertiary_sidewalk_left

- [ ] `highway/tertiary_sidewalk_left`

## highway/tertiary_sidewalk_right

- [ ] `highway/tertiary_sidewalk_right`

## highway/track_private

- [ ] `highway/track_private`

## highway/trunk-opposite-use_sidepath

- [ ] `highway/trunk-opposite-use_sidepath`

## highway/trunk_sidewalk_both

- [ ] `highway/trunk_sidewalk_both`

## highway/trunk_sidewalk_left

- [ ] `highway/trunk_sidewalk_left`

## highway/trunk_sidewalk_right

- [ ] `highway/trunk_sidewalk_right`

## highway/unclassified-opposite-use_sidepath

- [ ] `highway/unclassified-opposite-use_sidepath`

## highway/unclassified_sidewalk_both

- [ ] `highway/unclassified_sidewalk_both`

## highway/unclassified_sidewalk_left

- [ ] `highway/unclassified_sidewalk_left`

## highway/unclassified_sidewalk_right

- [ ] `highway/unclassified_sidewalk_right`

## shop/truck_repair

- [ ] `shop/truck_repair`

---

**Progression:** 2 / 141 ids v5 cochés (+ 2 presets v6-only + champs ci-dessus).
Regénérer: `node scripts/list_v5_presets_port.js --write`
