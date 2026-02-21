package seeddata

import _ "embed"

//go:embed schools.json
var SchoolsJSON []byte

//go:embed fraternities.json
var FraternitiesJSON []byte
