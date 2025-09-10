"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Upload, MoreHorizontal, Edit, Trash2, Globe, MapPin, Building2, X, Search, ChevronDown } from "lucide-react";
import Header from "../../../components/Header";

interface Location {
  id: string;
  name: string;
  type: 'country' | 'city' | 'site';
  code?: string;
  parentId?: string;
  parentName?: string;
  parentType?: string;
  memberCount: number;
}

interface Country {
  code: string;
  name: string;
}

interface City {
  name: string;
  code: string;
}

const LocationTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'country':
      return <Globe className="w-4 h-4 text-blue-600" />;
    case 'city':
      return <MapPin className="w-4 h-4 text-green-600" />;
    case 'site':
      return <Building2 className="w-4 h-4 text-purple-600" />;
    default:
      return <MapPin className="w-4 h-4 text-gray-600" />;
  }
};

const LocationTypeBadge = ({ type }: { type: string }) => {
  const colors = {
    country: 'bg-blue-100 text-blue-800',
    city: 'bg-green-100 text-green-800',
    site: 'bg-purple-100 text-purple-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      <LocationTypeIcon type={type} />
      <span className="ml-1 capitalize">{type}</span>
    </span>
  );
};

export default function LocationManagementPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  
  // Form states
  const [locationType, setLocationType] = useState<'country' | 'city' | 'site'>('country');
  const [locationName, setLocationName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [customLocationName, setCustomLocationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  
  // Search states
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const orgId = await loadOrgId();
      setOrgId(orgId);
      await Promise.all([
        loadLocations(orgId),
        loadCountries()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Authentication required. Please log in to continue.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgId() {
    const res = await fetch("/api/bff/auth/me", { credentials: "include" });
    if (!res.ok) {
      throw new Error('Authentication required');
    }
    const me = await res.json();
    return me.organizationId || me.organization_id || me.orgId;
  }

  async function loadLocations(orgId: string) {
    const res = await fetch(`/api/bff/directory/locations?orgId=${orgId}`, { 
      credentials: "include" 
    });
    if (!res.ok) {
      throw new Error('Failed to load locations');
    }
    const data = await res.json();
    setLocations(data);
  }

  async function loadCountries() {
    const res = await fetch('/api/bff/directory/countries', { 
      credentials: "include" 
    });
    if (!res.ok) {
      throw new Error('Failed to load countries');
    }
    const data = await res.json();
    setCountries(data);
  }

  async function loadCities(countryCode: string) {
    const res = await fetch(`/api/bff/directory/cities?countryCode=${countryCode}`, { 
      credentials: "include" 
    });
    if (!res.ok) {
      throw new Error('Failed to load cities');
    }
    const data = await res.json();
    setCities(data);
  }

  async function handleCreateLocation() {
    if (!orgId) return;
    
    try {
      setIsSubmitting(true);
      setNameError("");
      
      let name = "";
      let code = "";
      let parentId = undefined;
      
      if (locationType === 'country') {
        const country = countries.find(c => c.code === selectedCountry);
        if (!country) {
          setNameError("Please select a country");
          return;
        }
        name = country.name;
        code = country.code;
      } else if (locationType === 'city') {
        const country = countries.find(c => c.code === selectedCountry);
        const city = cities.find(c => c.name === selectedCity);
        if (!country || !city) {
          setNameError("Please select both country and city");
          return;
        }
        
        // Find or create the parent country first
        let parentCountry = locations.find(l => l.type === 'country' && l.code === selectedCountry);
        if (!parentCountry) {
          const countryRes = await fetch('/api/bff/directory/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              type: 'country',
              name: country.name,
              code: country.code
            })
          });
          if (countryRes.ok) {
            const newCountry = await countryRes.json();
            parentCountry = newCountry;
            await loadLocations(orgId); // Refresh to get the new country
          }
        }
        
        name = city.name;
        code = city.code;
        parentId = parentCountry?.id;
      } else if (locationType === 'site') {
        if (!customLocationName.trim()) {
          setNameError("Please enter a site name");
          return;
        }
        if (!selectedCountry || !selectedCity) {
          setNameError("Please select country and city for the site");
          return;
        }
        
        // Find the parent city
        const parentCity = locations.find(l => l.type === 'city' && l.name === selectedCity);
        if (!parentCity) {
          setNameError("Please create the city location first");
          return;
        }
        
        name = customLocationName.trim();
        parentId = parentCity.id;
      }

      const res = await fetch('/api/bff/directory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: locationType,
          name,
          code,
          parentId
        })
      });

      if (res.ok) {
        await loadLocations(orgId);
        setShowCreateModal(false);
        resetForm();
      } else {
        const errorText = await res.text();
        console.error('Failed to create location:', errorText);
        setNameError('Failed to create location. Please try again.');
      }
    } catch (error) {
      console.error('Error creating location:', error);
      setNameError('Failed to create location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditLocation() {
    if (!orgId || !editingLocation) return;
    
    try {
      setIsSubmitting(true);
      setNameError("");
      
      if (!locationName.trim()) {
        setNameError("Location name is required");
        return;
      }

      const res = await fetch(`/api/bff/directory/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: locationName.trim(),
          code: editingLocation.code
        })
      });

      if (res.ok) {
        await loadLocations(orgId);
        setShowEditModal(false);
        resetForm();
      } else {
        const errorText = await res.text();
        console.error('Failed to update location:', errorText);
        setNameError('Failed to update location. Please try again.');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      setNameError('Failed to update location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteLocation() {
    if (!orgId || !deletingLocation) return;
    
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/bff/directory/locations/${deletingLocation.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        await loadLocations(orgId);
        setShowDeleteModal(false);
        setDeletingLocation(null);
      } else {
        const error = await res.text();
        alert(error || 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setLocationType('country');
    setLocationName("");
    setSelectedCountry("");
    setSelectedCity("");
    setCustomLocationName("");
    setNameError("");
    setEditingLocation(null);
    setCities([]);
    setCountrySearchTerm("");
    setShowCountryDropdown(false);
  }

  function openEditModal(location: Location) {
    setEditingLocation(location);
    setLocationName(location.name);
    setShowEditModal(true);
    setShowActionMenu(null);
  }

  function openDeleteModal(location: Location) {
    setDeletingLocation(location);
    setShowDeleteModal(true);
    setShowActionMenu(null);
  }

  async function handleCountryChange(countryCode: string) {
    setSelectedCountry(countryCode);
    setSelectedCity("");
    setShowCountryDropdown(false);
    
    // Update search term to show selected country name
    const selectedCountryData = countries.find(c => c.code === countryCode);
    if (selectedCountryData) {
      setCountrySearchTerm(selectedCountryData.name);
    } else {
      setCountrySearchTerm("");
    }
    
    if (countryCode) {
      try {
        await loadCities(countryCode);
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
      }
    } else {
      setCities([]);
    }
  }
  
  // Filter countries based on search term
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );
  
  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading locations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const groupedLocations = {
    countries: locations.filter(l => l.type === 'country'),
    cities: locations.filter(l => l.type === 'city'),
    sites: locations.filter(l => l.type === 'site')
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Employee Directory
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
              <p className="text-gray-600 mt-2">Organize your workforce by countries, cities, and custom sites</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-gray-900">{groupedLocations.countries.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cities</p>
                <p className="text-2xl font-bold text-gray-900">{groupedLocations.cities.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Custom Sites</p>
                <p className="text-2xl font-bold text-gray-900">{groupedLocations.sites.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Upload className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Locations</h3>
            <p className="text-sm text-gray-500">Manage and organize your company locations</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <LocationTypeIcon type={location.type} />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LocationTypeBadge type={location.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {location.parentName ? (
                        <div className="flex items-center">
                          <LocationTypeIcon type={location.parentType || ''} />
                          <span className="ml-1">{location.parentName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {location.code || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
                        {location.memberCount} employees
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button 
                          onClick={() => setShowActionMenu(showActionMenu === location.id ? null : location.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showActionMenu === location.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => openEditModal(location)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Location
                              </button>
                              <button
                                onClick={() => openDeleteModal(location)}
                                className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Location
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <MapPin className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No locations found</p>
                        <p className="text-gray-500 mb-4">Start by adding your first location</p>
                        <button
                          onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                          }}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Location
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Add New Location</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Location Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['country', 'city', 'site'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setLocationType(type);
                        setNameError("");
                      }}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        locationType === type 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <LocationTypeIcon type={type} />
                      <div className="text-xs mt-1 capitalize">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Selection with Search (for all types) */}
              {(locationType === 'country' || locationType === 'city' || locationType === 'site') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <div className="relative" ref={countryDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={countrySearchTerm}
                        onChange={(e) => {
                          setCountrySearchTerm(e.target.value);
                          setShowCountryDropdown(true);
                          if (!e.target.value) {
                            setSelectedCountry("");
                            setCities([]);
                          }
                        }}
                        onFocus={() => setShowCountryDropdown(true)}
                        placeholder="Search for a country..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                    {showCountryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map(country => (
                            <button
                              key={country.code}
                              onClick={() => handleCountryChange(country.code)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                              <div className="flex items-center justify-between">
                                <span>{country.name}</span>
                                <span className="text-xs text-gray-500">{country.code}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No countries found matching "{countrySearchTerm}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedCountry && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: {countries.find(c => c.code === selectedCountry)?.name} ({selectedCountry})
                    </div>
                  )}
                </div>
              )}

              {/* City Selection (for city and site types) */}
              {(locationType === 'city' || locationType === 'site') && selectedCountry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a city</option>
                    {cities.map(city => (
                      <option key={city.code} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                  {cities.length === 0 && selectedCountry && (
                    <div className="mt-2 text-sm text-gray-500">
                      Loading cities for {countries.find(c => c.code === selectedCountry)?.name}...
                    </div>
                  )}
                  {cities.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {cities.length} cities available
                    </div>
                  )}
                </div>
              )}

              {/* Custom Site Name (for site type) */}
              {locationType === 'site' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="Enter custom site name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {nameError && (
                <div className="text-red-600 text-sm">{nameError}</div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLocation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && editingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Edit Location</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter location name"
                />
              </div>

              {nameError && (
                <div className="text-red-600 text-sm">{nameError}</div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLocation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Modal */}
      {showDeleteModal && deletingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-red-600">Delete Location</h3>
            </div>
            
            <div className="px-6 py-4">
              <div className="text-sm text-gray-900 mb-4">
                <h4 className="font-medium mb-2">
                  Are you sure you want to delete "{deletingLocation.name}"?
                </h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>This action cannot be undone. Once deleted:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-500">
                    <li><strong>{deletingLocation.memberCount} employees</strong> will have no location assigned</li>
                    <li>All location-related data and history will be permanently removed</li>
                    <li>Any reports or analytics tied to this location will be affected</li>
                  </ul>
                </div>
                
                {deletingLocation.memberCount > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-800">Warning</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      {deletingLocation.memberCount} team member{deletingLocation.memberCount !== 1 ? 's' : ''} will need to be reassigned to other locations.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingLocation(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLocation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}