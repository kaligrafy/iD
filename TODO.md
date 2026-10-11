# TODO

## General

## Bugs

## Features

- angle snap in draw (45/90 degrees edit with a key like v3)

## Styles

- css for cycleways (with validations for missing cycleway:both/left/right) + warning for missing tags (separation, markings, etc.)
- css for lanes, turn lanes and transitions
- dismount steps should be the same color as dismount (violet)
- hard to see the difference between traffic signals crossings for cycleways and regular cycle ways.
- cycleway segregated=yes should be different from segregated=no (use distinct dash pattern)
- access=no should be easily seen on map on any theme.
- show new error color when cycleway:both/left/right is not present on highway (all highways except service, motorways and motorway_link)
- show error if motorway in quebec with 100 maxspeed does not have minspeed of 60. (use the style error violet like missing forward/backward lanes when lanes >=3)

## Presets



## Batch changes to complete

- fix old presets from v5 that should be upgraded (construction company, bus depot, truck depot, logistics, distributor, public works, postes canada etc.)
- add missing minspeed in all motorways in Quebec (min 60 when max 100) except when motorway is oneway=no (validate these manually with street view images)