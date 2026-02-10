/**
 * FilterBar Component
 *
 * Container for filter dropdowns with Apply/Clear buttons
 */

import React, { useState, useEffect } from 'react';
import FilterDropdown from './FilterDropdown';
import { fetchAvailableSites, fetchAvailableArchetypes } from '../../services/api';

const FilterBar = ({ onApplyFilters, currentFilters }) => {
  const [siteOptions, setSiteOptions] = useState([]);
  const [archetypeOptions, setArchetypeOptions] = useState([]);

  // Temporary selections (before Apply)
  const [tempDomains, setTempDomains] = useState(currentFilters.domains || []);
  const [tempArchetypes, setTempArchetypes] = useState(currentFilters.archetypes || []);

  const [loading, setLoading] = useState(true);

  // Load available options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [sitesData, archetypesData] = await Promise.all([
          fetchAvailableSites(),
          fetchAvailableArchetypes()
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

        setSiteOptions(sites);
        setArchetypeOptions(archetypes);
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
  }, [currentFilters]);

  // Format archetype name (snake_case to Title Case)
  const formatArchetype = (archetype) => {
    if (!archetype) return '';
    return archetype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if filters have changed
  const hasChanges = () => {
    const domainsChanged = JSON.stringify(tempDomains.sort()) !==
                          JSON.stringify((currentFilters.domains || []).sort());
    const archetypesChanged = JSON.stringify(tempArchetypes.sort()) !==
                             JSON.stringify((currentFilters.archetypes || []).sort());
    return domainsChanged || archetypesChanged;
  };

  // Apply filters
  const handleApply = () => {
    onApplyFilters({
      domains: tempDomains,
      archetypes: tempArchetypes
    });
  };

  // Clear all filters
  const handleClearAll = () => {
    setTempDomains([]);
    setTempArchetypes([]);
    onApplyFilters({
      domains: [],
      archetypes: []
    });
  };

  // Check if any filters are active
  const hasActiveFilters = tempDomains.length > 0 || tempArchetypes.length > 0;

  if (loading) {
    return (
      <div className="filter-bar">
        <div className="filter-bar-loading">Loading filters...</div>
      </div>
    );
  }

  return (
    <div className="filter-bar">
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
