"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter, Users, ChevronDown, RotateCcw } from "lucide-react";
import { searchSchools, getAllFraternities, DEFAULT_FILTERS, type School, type FilterState } from "@/lib/api";

interface SearchBarProps {
  onSchoolSelect: (school: School) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  selectedFrat?: string;
  onFratFilterChange?: (fratName: string) => void;
}

const CONTROL_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private_nonprofit", label: "Private NP" },
  { value: "private_forprofit", label: "For-Profit" },
] as const;

const LEVEL_OPTIONS = [
  { value: 1, label: "4-Year" },
  { value: 2, label: "2-Year" },
  { value: 3, label: "<2-Year" },
] as const;

const SIZE_OPTIONS = [
  { value: 1, label: "<1K" },
  { value: 2, label: "1-5K" },
  { value: 3, label: "5-10K" },
  { value: 4, label: "10-20K" },
  { value: 5, label: "20K+" },
] as const;

const TOGGLE_FILTERS: { key: keyof FilterState; label: string }[] = [
  { key: "showReligious", label: "Religious Colleges" },
  { key: "showHBCU", label: "HBCU" },
  { key: "showTribal", label: "Tribal Colleges" },
  { key: "showOnline", label: "Online Only" },
  { key: "showCommunityCollege", label: "CC / Trade School / Other" },
  { key: "showLiberalArts", label: "Liberal Arts" },
  { key: "showGraduateOnly", label: "Graduate Only" },
];

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

function isDefaultFilters(f: FilterState): boolean {
  return JSON.stringify(f) === JSON.stringify(DEFAULT_FILTERS);
}

export default function SearchBar({
  onSchoolSelect,
  filters,
  onFiltersChange,
  selectedFrat = "",
  onFratFilterChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const [fratNames, setFratNames] = useState<string[]>([]);
  const [fratQuery, setFratQuery] = useState("");
  const [showFratDropdown, setShowFratDropdown] = useState(false);
  const fratInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showFilters && fratNames.length === 0) {
      getAllFraternities()
        .then(setFratNames)
        .catch(console.error);
    }
  }, [showFilters, fratNames.length]);

  const filteredFrats = fratQuery
    ? fratNames.filter((n) => n.toLowerCase().includes(fratQuery.toLowerCase()))
    : fratNames;

  const doSearch = useCallback(async (q: string, filterState: string) => {
    if (q.length < 2 && !filterState) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        q,
        state: filterState,
        limit: "20",
        page: "1",
      };
      if (filters.controlTypes.length === 1) {
        params.control = filters.controlTypes[0];
      }
      if (filters.schoolLevels.length === 1) {
        params.iclevel = String(filters.schoolLevels[0]);
      }
      const res = await searchSchools(params);
      let data = res.data || [];
      data = data.filter((s: School) => {
        if (!filters.controlTypes.includes(s.control)) return false;
        if (!filters.schoolLevels.includes(s.iclevel)) return false;
        return true;
      });
      setResults(data.slice(0, 10));
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, stateFilter), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, stateFilter, doSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showFratDropdown) return;
    const handler = (e: MouseEvent) => {
      if (fratInputRef.current && !fratInputRef.current.contains(e.target as Node)) {
        setShowFratDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFratDropdown]);

  const handleSelect = (school: School) => {
    setQuery(school.name);
    setShowResults(false);
    onSchoolSelect(school);
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
    setStateFilter("");
    onFratFilterChange?.("");
    setFratQuery("");
  };

  const handleFratSelect = (name: string) => {
    onFratFilterChange?.(name);
    setFratQuery("");
    setShowFratDropdown(false);
  };

  const toggleMultiSelect = <T,>(arr: T[], value: T): T[] => {
    return arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
  };

  const hasActiveFilters = !isDefaultFilters(filters) || stateFilter || selectedFrat;
  const activeFilterCount =
    (3 - filters.controlTypes.length === 0 ? 0 : 3 - filters.controlTypes.length) +
    (3 - filters.schoolLevels.length === 0 ? 0 : 3 - filters.schoolLevels.length) +
    (5 - filters.instSizes.length) +
    (filters.showReligious !== DEFAULT_FILTERS.showReligious ? 1 : 0) +
    (filters.showHBCU !== DEFAULT_FILTERS.showHBCU ? 1 : 0) +
    (filters.showTribal !== DEFAULT_FILTERS.showTribal ? 1 : 0) +
    (filters.showOnline !== DEFAULT_FILTERS.showOnline ? 1 : 0) +
    (filters.showCommunityCollege !== DEFAULT_FILTERS.showCommunityCollege ? 1 : 0) +
    (filters.showLiberalArts !== DEFAULT_FILTERS.showLiberalArts ? 1 : 0) +
    (filters.showGraduateOnly !== DEFAULT_FILTERS.showGraduateOnly ? 1 : 0) +
    (filters.showGreekLife ? 1 : 0) +
    (stateFilter ? 1 : 0) +
    (selectedFrat ? 1 : 0);

  return (
    <div className="relative w-full max-w-5xl" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search size={20} className="absolute left-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search schools by name or city..."
          className="w-full pl-12 pr-24 py-3.5 bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/30 rounded-2xl text-white placeholder-zinc-500 text-base focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 focus:shadow-lg focus:shadow-violet-500/5 transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-violet-600/20 text-violet-400"
                : "hover:bg-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            <Filter size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount > 9 ? "9+" : activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active frat filter badge */}
      {selectedFrat && !showFilters && (
        <div className="absolute top-full left-0 right-0 mt-1.5 flex justify-center z-40">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20">
            <Users size={11} />
            {selectedFrat}
            <button
              onClick={() => onFratFilterChange?.("")}
              className="ml-0.5 hover:text-white transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2.5 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/30 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* State */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Institution Type */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Institution Type</label>
              <div className="flex flex-wrap gap-1.5">
                {CONTROL_OPTIONS.map((opt) => {
                  const active = filters.controlTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onFiltersChange({ ...filters, controlTypes: toggleMultiSelect(filters.controlTypes, opt.value) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* School Level */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">School Level</label>
              <div className="flex flex-wrap gap-1.5">
                {LEVEL_OPTIONS.map((opt) => {
                  const active = filters.schoolLevels.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onFiltersChange({ ...filters, schoolLevels: toggleMultiSelect(filters.schoolLevels, opt.value) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Institution Size */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Institution Size</label>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((opt) => {
                  const active = filters.instSizes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onFiltersChange({ ...filters, instSizes: toggleMultiSelect(filters.instSizes, opt.value) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-700/50" />

            {/* Toggle Filters */}
            <div className="space-y-2">
              {TOGGLE_FILTERS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group py-0.5">
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters[key] as boolean}
                      onChange={(e) => onFiltersChange({ ...filters, [key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 rounded-full bg-zinc-700 peer-checked:bg-violet-600 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-zinc-300 peer-checked:translate-x-4 peer-checked:bg-white transition-transform" />
                  </div>
                </label>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-700/50" />

            {/* Greek Life Section */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2 font-medium">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  Greek Life
                </span>
              </label>

              <label className="flex items-center justify-between cursor-pointer group py-0.5 mb-2">
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Schools with Frats</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filters.showGreekLife}
                    onChange={(e) => onFiltersChange({ ...filters, showGreekLife: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-zinc-700 peer-checked:bg-violet-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-zinc-300 peer-checked:translate-x-4 peer-checked:bg-white transition-transform" />
                </div>
              </label>

              <div ref={fratInputRef}>
                {selectedFrat ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-blue-500/30 rounded-lg">
                    <span className="text-sm text-blue-300 flex-1 truncate">{selectedFrat}</span>
                    <button
                      onClick={() => onFratFilterChange?.("")}
                      className="text-zinc-500 hover:text-white transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={fratQuery}
                      onChange={(e) => {
                        setFratQuery(e.target.value);
                        setShowFratDropdown(true);
                      }}
                      onFocus={() => setShowFratDropdown(true)}
                      placeholder="Search fraternities..."
                      className="w-full px-3 py-2 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    {showFratDropdown && filteredFrats.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50">
                        {filteredFrats.map((name) => (
                          <button
                            key={name}
                            onClick={() => handleFratSelect(name)}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {hasActiveFilters && (
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className={`absolute top-full left-0 right-0 ${selectedFrat && !showFilters ? "mt-10" : "mt-2.5"} bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/30 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto`}>
          {results.map((school) => (
            <button
              key={school.id}
              onClick={() => handleSelect(school)}
              className="w-full px-5 py-3.5 text-left hover:bg-zinc-800/80 transition-colors border-b border-zinc-800/40 last:border-0"
            >
              <div className="text-white text-[15px] font-medium">{school.name}</div>
              <div className="text-zinc-400 text-sm mt-0.5">
                {school.city}, {school.state} &middot;{" "}
                <span className={school.control === "public" ? "text-emerald-400" : school.control === "private_forprofit" ? "text-red-400" : "text-blue-400"}>
                  {school.control === "public" ? "Public" : school.control === "private_forprofit" ? "For-Profit" : "Private"}
                </span>
              </div>
            </button>
          ))}
          {loading && (
            <div className="px-5 py-3.5 text-zinc-500 text-sm text-center">Searching...</div>
          )}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <div className={`absolute top-full left-0 right-0 ${selectedFrat && !showFilters ? "mt-10" : "mt-2.5"} bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/30 rounded-2xl shadow-2xl p-5 z-50`}>
          <p className="text-zinc-500 text-sm text-center">No schools found</p>
        </div>
      )}
    </div>
  );
}
