/**
 * FilterBar Component
 *
 * Container for filter dropdowns with Apply/Clear buttons
 */

import React, { useState, useEffect, useRef } from 'react';
import FilterDropdown from './FilterDropdown';
import { fetchAvailableSites, fetchAvailableArchetypes, fetchAvailablePages } from '../../services/api';

const FilterBar = ({ onApplyFilters, currentFilters }) => {
  const filterBarRef = useRef(null);
  const [siteOptions, setSiteOptions] = useState([]);
  const [archetypeOptions, setArchetypeOptions] = useState([]);
  const [pageOptions, setPageOptions] = useState([]);

  // Temporary selections (before Apply)
  const [tempDomains, setTempDomains] = useState(currentFilters.domains || []);
  const [tempArchetypes, setTempArchetypes] = useState(currentFilters.archetypes || []);
  const [tempPages, setTempPages] = useState(currentFilters.pages || []);
  const [tempCurated, setTempCurated] = useState(currentFilters.curated || false);
  const [tempSource, setTempSource] = useState(currentFilters.source || 'all');
  const [tempSearch, setTempSearch] = useState(currentFilters.search || '');

  const [loading, setLoading] = useState(true);

  // Load available options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [sitesData, archetypesData, pagesData] = await Promise.all([
          fetchAvailableSites(),
          fetchAvailableArchetypes(),
          fetchAvailablePages()
        ]);

        // Format sites for dropdown
        const sites = sitesData.sites.map(site => ({
          value: site.domain,
          label: site.domain,
          count: site.count
        }));

        // Format archetypes for dropdown
        const archetypes = archetypesData.archetypes.map(archetype => ({
          value: archetype.archetype,
          label: formatArchetype(archetype.archetype),
          count: archetype.count
        }));

        // Format pages for dropdown (url - Page X/Y)
        const pages = pagesData.pages.map(page => ({
          value: page.page_id,
          label: `${page.url} - Page ${page.page_number}/${page.total_domain_pages}`,
          count: page.count,
          domain: page.domain
        }));

        setSiteOptions(sites);
        setArchetypeOptions(archetypes);
        setPageOptions(pages);
      } catch (error) {
        console.error('Error loading filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Sync temp selections when current filters change
  useEffect(() => {
    setTempDomains(currentFilters.domains || []);
    setTempArchetypes(currentFilters.archetypes || []);
    setTempPages(currentFilters.pages || []);
    setTempCurated(currentFilters.curated || false);
    setTempSource(currentFilters.source || 'all');
    setTempSearch(currentFilters.search || '');
  }, [currentFilters]);

  // Format archetype name (snake_case to Title Case)
  const formatArchetype = (archetype) => {
    if (!archetype) return '';
    return archetype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // When domains are selected, narrow page options to only pages from those domains
  const filteredPageOptions = tempDomains.length > 0
    ? pageOptions.filter(page => tempDomains.includes(page.domain))
    : pageOptions;

  // Check if filters have changed
  const hasChanges = () => {
    const domainsChanged = JSON.stringify(tempDomains.sort()) !==
                          JSON.stringify((currentFilters.domains || []).sort());
    const archetypesChanged = JSON.stringify(tempArchetypes.sort()) !==
                             JSON.stringify((currentFilters.archetypes || []).sort());
    const pagesChanged = JSON.stringify(tempPages.sort()) !==
                        JSON.stringify((currentFilters.pages || []).sort());
    const curatedChanged = tempCurated !== (currentFilters.curated || false);
    const sourceChanged = tempSource !== (currentFilters.source || 'all');
    const searchChanged = tempSearch !== (currentFilters.search || '');
    return domainsChanged || archetypesChanged || pagesChanged || curatedChanged || sourceChanged || searchChanged;
  };

  // Apply filters
  const handleApply = () => {
    onApplyFilters({
      domains: tempDomains,
      archetypes: tempArchetypes,
      pages: tempPages,
      curated: tempCurated,
      source: tempSource,
      search: tempSearch
    });
  };

  // Clear all filters
  const handleClearAll = () => {
    setTempDomains([]);
    setTempArchetypes([]);
    setTempPages([]);
    setTempCurated(false);
    setTempSource('all');
    setTempSearch('');
    onApplyFilters({
      domains: [],
      archetypes: [],
      pages: [],
      curated: false,
      source: 'all',
      search: ''
    });
    // Scroll filter bar back to the start
    if (filterBarRef.current) {
      filterBarRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Check if any filters are active
  const hasActiveFilters = tempDomains.length > 0 || tempArchetypes.length > 0 || tempPages.length > 0 || tempCurated || tempSource !== 'all' || tempSearch.trim() !== '';

  if (loading) {
    return (
      <div className="filter-bar">
        <div className="filter-bar-loading">Loading filters...</div>
      </div>
    );
  }

  return (
    <div className="filter-bar" ref={filterBarRef}>
      <div className="filter-dropdowns">
        <FilterDropdown
          label="Sites"
          options={siteOptions}
          selected={tempDomains}
          onChange={setTempDomains}
          icon="▼"
        />

        <FilterDropdown
          label="Archetypes"
          options={archetypeOptions}
          selected={tempArchetypes}
          onChange={setTempArchetypes}
          icon="▼"
        />

        <FilterDropdown
          label="Pages"
          options={filteredPageOptions}
          selected={tempPages}
          onChange={setTempPages}
          icon="▼"
        />
        <div className="search-input-wrapper">
          <input
            type="text"
            className="feed-search-input"
            placeholder="Search content..."
            value={tempSearch}
            onChange={(e) => setTempSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
          />
          {tempSearch && (
            <button className="search-clear-btn" onClick={() => setTempSearch('')}>
              &times;
            </button>
          )}
        </div>
        <div className="source-toggle">
          {[
            { value: 'all', label: 'All' },
            { value: 'manual', label: 'Human' },
            { value: 'model_prediction', label: 'Model' }
          ].map(opt => (
            <button
              key={opt.value}
              className={`source-toggle-btn ${tempSource === opt.value ? 'active' : ''}`}
              onClick={() => setTempSource(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="curated-toggle">
          <input
            type="checkbox"
            checked={tempCurated}
            onChange={(e) => setTempCurated(e.target.checked)}
          />
          <span>Curated Only</span>
        </label>
      </div>

      <div className="filter-actions">
        {hasActiveFilters && (
          <button
            className="filter-clear-button"
            onClick={handleClearAll}
            title="Clear all filters"
          >
            Clear All
          </button>
        )}

        <button
          className={`filter-apply-button ${hasChanges() ? 'has-changes' : ''}`}
          onClick={handleApply}
          disabled={!hasChanges()}
          title={hasChanges() ? 'Apply filter changes' : 'No changes to apply'}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
