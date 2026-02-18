// import_schools.go - Import IPEDS school data from CSV into JSON format.
// Usage: go run scripts/import_schools.go -input path/to/hd2024.csv -output data/schools.json
//
// Includes: SECTOR 1 (Public 4-year), SECTOR 2 (Private non-profit 4-year),
//           SECTOR 4 (Public 2-year), SECTOR 5 (Private non-profit 2-year).
// When the full IPEDS dataset CSV is available, run this script to generate
// the schools.json consumed by the backend.

package main

import (
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
)

type School struct {
	UnitID    int     `json:"unitid"`
	Name      string  `json:"name"`
	Alias     string  `json:"alias"`
	Address   string  `json:"address"`
	City      string  `json:"city"`
	State     string  `json:"state"`
	Zip       string  `json:"zip"`
	Control   string  `json:"control"`
	ICLevel   int     `json:"iclevel"`
	Website   string  `json:"website"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	County    string  `json:"county"`
	Locale    int     `json:"locale"`
	HBCU      bool    `json:"hbcu"`
	Sector    int     `json:"sector"`
}

func main() {
	inputPath := flag.String("input", "", "Path to IPEDS CSV file (hd2024.csv)")
	outputPath := flag.String("output", "data/schools.json", "Output JSON file path")
	flag.Parse()

	if *inputPath == "" {
		log.Fatal("Usage: go run import_schools.go -input path/to/hd2024.csv [-output data/schools.json]")
	}

	f, err := os.Open(*inputPath)
	if err != nil {
		log.Fatalf("Failed to open input file: %v", err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// Read header
	header, err := reader.Read()
	if err != nil {
		log.Fatalf("Failed to read CSV header: %v", err)
	}

	// Build column index
	colIdx := make(map[string]int)
	for i, col := range header {
		colIdx[strings.TrimSpace(strings.ToUpper(col))] = i
	}

	// Verify required columns
	required := []string{"UNITID", "INSTNM", "SECTOR", "CONTROL", "ICLEVEL", "LATITUDE", "LONGITUD", "STABBR", "CITY", "ZIP"}
	for _, col := range required {
		if _, ok := colIdx[col]; !ok {
			log.Fatalf("Missing required column: %s", col)
		}
	}

	getCol := func(row []string, name string) string {
		idx, ok := colIdx[name]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	getInt := func(row []string, name string) int {
		s := getCol(row, name)
		v, _ := strconv.Atoi(s)
		return v
	}

	getFloat := func(row []string, name string) float64 {
		s := getCol(row, name)
		v, _ := strconv.ParseFloat(s, 64)
		return v
	}

	var schools []School
	lineNum := 1

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			log.Printf("Warning: skipping line %d: %v", lineNum, err)
			continue
		}

		sector := getInt(row, "SECTOR")
		// 1=Public 4yr, 2=Private nonprofit 4yr, 4=Public 2yr, 5=Private nonprofit 2yr
		if sector != 1 && sector != 2 && sector != 4 && sector != 5 {
			continue
		}

		lat := getFloat(row, "LATITUDE")
		lon := getFloat(row, "LONGITUD")
		if lat == 0 || lon == 0 {
			continue
		}

		controlVal := getInt(row, "CONTROL")
		controlStr := "public"
		if controlVal == 2 {
			controlStr = "private_nonprofit"
		}

		school := School{
			UnitID:    getInt(row, "UNITID"),
			Name:      getCol(row, "INSTNM"),
			Alias:     getCol(row, "IALIAS"),
			Address:   getCol(row, "ADDR"),
			City:      getCol(row, "CITY"),
			State:     getCol(row, "STABBR"),
			Zip:       getCol(row, "ZIP"),
			Control:   controlStr,
			ICLevel:   getInt(row, "ICLEVEL"),
			Website:   getCol(row, "WEBADDR"),
			Latitude:  lat,
			Longitude: lon,
			County:    getCol(row, "COUNTYNM"),
			Locale:    getInt(row, "LOCALE"),
			HBCU:      getCol(row, "HBCU") == "1",
			Sector:    sector,
		}
		schools = append(schools, school)
	}

	// Write JSON output
	outFile, err := os.Create(*outputPath)
	if err != nil {
		log.Fatalf("Failed to create output file: %v", err)
	}
	defer outFile.Close()

	encoder := json.NewEncoder(outFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(schools); err != nil {
		log.Fatalf("Failed to write JSON: %v", err)
	}

	fourYear := 0
	twoYear := 0
	for _, s := range schools {
		if s.ICLevel == 1 {
			fourYear++
		} else {
			twoYear++
		}
	}

	fmt.Printf("Import complete!\n")
	fmt.Printf("  Total schools: %d\n", len(schools))
	fmt.Printf("  4-year: %d\n", fourYear)
	fmt.Printf("  2-year: %d\n", twoYear)
	fmt.Printf("  States: %d\n", countStates(schools))
	fmt.Printf("  Output: %s\n", *outputPath)
}

func countStates(schools []School) int {
	states := make(map[string]bool)
	for _, s := range schools {
		states[s.State] = true
	}
	return len(states)
}
