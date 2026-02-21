// import_fraternities.go - Import fraternity chapter data from CSV files.
// Reads all CSVs from a chapters directory, fuzzy-matches college names
// against schools.json, and outputs fraternities.json for the backend.
//
// Usage: go run scripts/import_fraternities.go \
//   -chapters path/to/Chapters/ \
//   -schools backend/internal/seeddata/schools.json \
//   -output backend/internal/seeddata/fraternities.json

package main

import (
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

type SchoolEntry struct {
	UnitID int    `json:"unitid"`
	Name   string `json:"name"`
	Alias  string `json:"alias"`
	City   string `json:"city"`
	State  string `json:"state"`
}

type FratEntry struct {
	Name     string `json:"name"`
	SchoolID string `json:"school_id"`
}

var stripRe = regexp.MustCompile(`[^a-z0-9 ]`)

func normalize(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, ",", " ")
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, "\u2019", "") // right single quote
	s = strings.ReplaceAll(s, "\u2013", " ") // en dash
	s = strings.ReplaceAll(s, "&", " and ")
	s = stripRe.ReplaceAllString(s, " ")

	// Normalize common variations
	s = strings.ReplaceAll(s, " st ", " saint ")
	if strings.HasPrefix(s, "st ") {
		s = "saint " + s[3:]
	}

	// Strip leading "the "
	s = strings.TrimPrefix(s, "the ")

	// " at " -> " " (e.g., "University of California at Berkeley" -> "University of California Berkeley")
	s = strings.ReplaceAll(s, " at ", " ")

	// Collapse whitespace
	fields := strings.Fields(s)
	return strings.Join(fields, " ")
}

// Generate multiple lookup keys for a school name to improve matching.
func schoolKeys(name, alias, city, state string) []string {
	keys := []string{normalize(name)}

	// "Pennsylvania State University-Main Campus" -> also index without suffix
	if i := strings.Index(name, "-"); i > 0 {
		keys = append(keys, normalize(name[:i]))
	}

	// Also index with dashes replaced by spaces
	keys = append(keys, normalize(strings.ReplaceAll(name, "-", " ")))

	// Strip " Main Campus" suffix
	stripped := strings.TrimSuffix(name, "-Main Campus")
	stripped = strings.TrimSuffix(stripped, " Main Campus")
	if stripped != name {
		keys = append(keys, normalize(stripped))
	}

	// SUNY variations: "SUNY X" <-> "State University of New York at X"
	lower := strings.ToLower(name)
	if strings.Contains(lower, "state university of new york") {
		// Extract the campus part after the dash or "at"
		parts := strings.SplitN(name, "-", 2)
		if len(parts) == 2 {
			campus := strings.TrimSpace(parts[1])
			keys = append(keys, normalize("suny "+campus))
			keys = append(keys, normalize("suny "+campus+" university"))
		}
	}
	if strings.HasPrefix(lower, "suny ") {
		campus := name[5:]
		keys = append(keys, normalize("state university of new york "+campus))
		keys = append(keys, normalize("state university of new york at "+campus))
	}

	// "University of X-City" -> also "University of X City"
	keys = append(keys, normalize(strings.ReplaceAll(name, "-", " ")))

	// Index alias names (pipe-separated in IPEDS)
	if alias != "" {
		for _, a := range strings.Split(alias, "|") {
			a = strings.TrimSpace(a)
			if a != "" {
				keys = append(keys, normalize(a))
			}
		}
	}

	// Deduplicate
	seen := make(map[string]bool)
	var unique []string
	for _, k := range keys {
		if k != "" && !seen[k] {
			seen[k] = true
			unique = append(unique, k)
		}
	}
	return unique
}

func main() {
	chaptersDir := flag.String("chapters", "", "Path to Chapters directory with CSV files")
	schoolsPath := flag.String("schools", "backend/internal/seeddata/schools.json", "Path to schools.json")
	outputPath := flag.String("output", "backend/internal/seeddata/fraternities.json", "Output JSON file path")
	flag.Parse()

	if *chaptersDir == "" {
		log.Fatal("Usage: go run import_fraternities.go -chapters path/to/Chapters/")
	}

	// Load schools
	schoolsData, err := os.ReadFile(*schoolsPath)
	if err != nil {
		log.Fatalf("Failed to read schools.json: %v", err)
	}

	var schools []SchoolEntry
	if err := json.Unmarshal(schoolsData, &schools); err != nil {
		log.Fatalf("Failed to parse schools.json: %v", err)
	}

	// Build lookup: normalized name -> school ID (unitid as string)
	lookup := make(map[string]string)
	for _, s := range schools {
		id := fmt.Sprintf("%d", s.UnitID)
		for _, key := range schoolKeys(s.Name, s.Alias, s.City, s.State) {
			if _, exists := lookup[key]; !exists {
				lookup[key] = id
			}
		}
	}

	// Read all CSVs
	csvFiles, err := filepath.Glob(filepath.Join(*chaptersDir, "*.csv"))
	if err != nil {
		log.Fatalf("Failed to list CSV files: %v", err)
	}
	if len(csvFiles) == 0 {
		log.Fatal("No CSV files found in chapters directory")
	}

	// Dedup: school_id -> set of fraternity names
	schoolFrats := make(map[string]map[string]bool)
	var unmatched []string
	unmatchedSet := make(map[string]bool)
	totalRows := 0
	matchedRows := 0

	for _, csvFile := range csvFiles {
		f, err := os.Open(csvFile)
		if err != nil {
			log.Printf("Warning: could not open %s: %v", csvFile, err)
			continue
		}

		reader := csv.NewReader(f)
		reader.LazyQuotes = true
		reader.TrimLeadingSpace = true

		// Skip header
		if _, err := reader.Read(); err != nil {
			f.Close()
			continue
		}

		for {
			row, err := reader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				continue
			}
			if len(row) < 2 {
				continue
			}

			fratName := strings.TrimSpace(row[0])
			collegeName := strings.TrimSpace(row[1])
			if fratName == "" || collegeName == "" {
				continue
			}

			totalRows++

			// Skip entries that are city-based placeholders (e.g., "Albany, New York AEPi")
			if strings.Contains(collegeName, " AEPi") || strings.Contains(collegeName, " Citywide") {
				continue
			}

			normalized := normalize(collegeName)
			schoolID, found := lookup[normalized]

			// Try alternate normalizations if first pass fails
			if !found {
				// Try with "main campus" appended
				schoolID, found = lookup[normalized+" main campus"]
			}
			if !found {
				// Try stripping "university" -> search for just the base
				// e.g., "Arizona State University" might be "Arizona State University-Tempe"
				for key, id := range lookup {
					if strings.HasPrefix(key, normalized) || strings.HasPrefix(normalized, key) {
						schoolID = id
						found = true
						break
					}
				}
			}

			if !found {
				if !unmatchedSet[collegeName] {
					unmatchedSet[collegeName] = true
					unmatched = append(unmatched, collegeName)
				}
				continue
			}

			matchedRows++
			if schoolFrats[schoolID] == nil {
				schoolFrats[schoolID] = make(map[string]bool)
			}
			schoolFrats[schoolID][fratName] = true
		}
		f.Close()
	}

	// Build output
	var result []FratEntry
	for schoolID, frats := range schoolFrats {
		for fratName := range frats {
			result = append(result, FratEntry{Name: fratName, SchoolID: schoolID})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].SchoolID != result[j].SchoolID {
			return result[i].SchoolID < result[j].SchoolID
		}
		return result[i].Name < result[j].Name
	})

	// Write output
	outFile, err := os.Create(*outputPath)
	if err != nil {
		log.Fatalf("Failed to create output file: %v", err)
	}
	defer outFile.Close()

	encoder := json.NewEncoder(outFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(result); err != nil {
		log.Fatalf("Failed to write JSON: %v", err)
	}

	fmt.Printf("Import complete!\n")
	fmt.Printf("  CSV files processed: %d\n", len(csvFiles))
	fmt.Printf("  Total rows: %d\n", totalRows)
	fmt.Printf("  Matched rows: %d (%.1f%%)\n", matchedRows, float64(matchedRows)/float64(totalRows)*100)
	fmt.Printf("  Unique fraternity-school links: %d\n", len(result))
	fmt.Printf("  Schools with fraternities: %d\n", len(schoolFrats))
	fmt.Printf("  Unmatched colleges: %d\n", len(unmatched))
	fmt.Printf("  Output: %s\n", *outputPath)

	if len(unmatched) > 0 {
		sort.Strings(unmatched)
		fmt.Println("\nUnmatched colleges:")
		for _, name := range unmatched {
			fmt.Printf("  - %s\n", name)
		}
	}
}
