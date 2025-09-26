'use client';

import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { MapPin, Navigation, Train } from 'lucide-react';
import { useState } from 'react';

interface MetroStation {
  id: string;
  name: string;
  line: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  color: string;
}

interface MetroStationSelectorProps {
  onStationSelect: (station: MetroStation, location: TransportationSegmentLocation) => void;
  disabled?: boolean;
  className?: string;
}

// Dubai Metro stations data
const DUBAI_METRO_STATIONS: MetroStation[] = [
  // Red Line
  {
    id: 'rashidiya',
    name: 'Rashidiya',
    line: 'Red Line',
    coordinates: { lat: 25.2514, lng: 55.3644 },
    address: 'Rashidiya Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'airport_terminal_3',
    name: 'Airport Terminal 3',
    line: 'Red Line',
    coordinates: { lat: 25.2525, lng: 55.3647 },
    address: 'Dubai International Airport Terminal 3, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'airport_terminal_1',
    name: 'Airport Terminal 1',
    line: 'Red Line',
    coordinates: { lat: 25.2531, lng: 55.3650 },
    address: 'Dubai International Airport Terminal 1, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'ggico',
    name: 'GGICO',
    line: 'Red Line',
    coordinates: { lat: 25.2537, lng: 55.3653 },
    address: 'GGICO Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'deira_city_center',
    name: 'Deira City Centre',
    line: 'Red Line',
    coordinates: { lat: 25.2543, lng: 55.3656 },
    address: 'Deira City Centre Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'al_rigga',
    name: 'Al Rigga',
    line: 'Red Line',
    coordinates: { lat: 25.2549, lng: 55.3659 },
    address: 'Al Rigga Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'union',
    name: 'Union',
    line: 'Red Line',
    coordinates: { lat: 25.2555, lng: 55.3662 },
    address: 'Union Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'burjuman',
    name: 'BurJuman',
    line: 'Red Line',
    coordinates: { lat: 25.2561, lng: 55.3665 },
    address: 'BurJuman Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'adcb',
    name: 'ADCB',
    line: 'Red Line',
    coordinates: { lat: 25.2567, lng: 55.3668 },
    address: 'ADCB Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'max',
    name: 'Max',
    line: 'Red Line',
    coordinates: { lat: 25.2573, lng: 55.3671 },
    address: 'Max Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'world_trade_center',
    name: 'World Trade Centre',
    line: 'Red Line',
    coordinates: { lat: 25.2579, lng: 55.3674 },
    address: 'World Trade Centre Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'emirates_towers',
    name: 'Emirates Towers',
    line: 'Red Line',
    coordinates: { lat: 25.2585, lng: 55.3677 },
    address: 'Emirates Towers Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'financial_centre',
    name: 'Financial Centre',
    line: 'Red Line',
    coordinates: { lat: 25.2591, lng: 55.3680 },
    address: 'Financial Centre Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'burj_khalifa_dubai_mall',
    name: 'Burj Khalifa/Dubai Mall',
    line: 'Red Line',
    coordinates: { lat: 25.2597, lng: 55.3683 },
    address: 'Burj Khalifa/Dubai Mall Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'business_bay',
    name: 'Business Bay',
    line: 'Red Line',
    coordinates: { lat: 25.2603, lng: 55.3686 },
    address: 'Business Bay Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'first_abu_dhabi_bank',
    name: 'First Abu Dhabi Bank',
    line: 'Red Line',
    coordinates: { lat: 25.2609, lng: 55.3689 },
    address: 'First Abu Dhabi Bank Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'sharaf_dg',
    name: 'Sharaf DG',
    line: 'Red Line',
    coordinates: { lat: 25.2615, lng: 55.3692 },
    address: 'Sharaf DG Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'dubai_healthcare_city',
    name: 'Dubai Healthcare City',
    line: 'Red Line',
    coordinates: { lat: 25.2621, lng: 55.3695 },
    address: 'Dubai Healthcare City Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'oud_metha',
    name: 'Oud Metha',
    line: 'Red Line',
    coordinates: { lat: 25.2627, lng: 55.3698 },
    address: 'Oud Metha Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'dubai_creek',
    name: 'Dubai Creek',
    line: 'Red Line',
    coordinates: { lat: 25.2633, lng: 55.3701 },
    address: 'Dubai Creek Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'al_ras',
    name: 'Al Ras',
    line: 'Red Line',
    coordinates: { lat: 25.2639, lng: 55.3704 },
    address: 'Al Ras Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'al_ghubaiba',
    name: 'Al Ghubaiba',
    line: 'Red Line',
    coordinates: { lat: 25.2645, lng: 55.3707 },
    address: 'Al Ghubaiba Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'al_jafiliya',
    name: 'Al Jafiliya',
    line: 'Red Line',
    coordinates: { lat: 25.2651, lng: 55.3710 },
    address: 'Al Jafiliya Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  {
    id: 'etisalat',
    name: 'Etisalat',
    line: 'Red Line',
    coordinates: { lat: 25.2657, lng: 55.3713 },
    address: 'Etisalat Metro Station, Dubai, UAE',
    color: '#E4002B',
  },
  // Green Line
  {
    id: 'etisalat_green',
    name: 'Etisalat',
    line: 'Green Line',
    coordinates: { lat: 25.2657, lng: 55.3713 },
    address: 'Etisalat Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_qusais',
    name: 'Al Qusais',
    line: 'Green Line',
    coordinates: { lat: 25.2663, lng: 55.3716 },
    address: 'Al Qusais Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'dubai_airport_free_zone',
    name: 'Dubai Airport Free Zone',
    line: 'Green Line',
    coordinates: { lat: 25.2669, lng: 55.3719 },
    address: 'Dubai Airport Free Zone Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_nahda',
    name: 'Al Nahda',
    line: 'Green Line',
    coordinates: { lat: 25.2675, lng: 55.3722 },
    address: 'Al Nahda Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'stadium',
    name: 'Stadium',
    line: 'Green Line',
    coordinates: { lat: 25.2681, lng: 55.3725 },
    address: 'Stadium Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_qiyadah',
    name: 'Al Qiyadah',
    line: 'Green Line',
    coordinates: { lat: 25.2687, lng: 55.3728 },
    address: 'Al Qiyadah Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'abu_hail',
    name: 'Abu Hail',
    line: 'Green Line',
    coordinates: { lat: 25.2693, lng: 55.3731 },
    address: 'Abu Hail Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'abu_baker_al_siddique',
    name: 'Abu Baker Al Siddique',
    line: 'Green Line',
    coordinates: { lat: 25.2699, lng: 55.3734 },
    address: 'Abu Baker Al Siddique Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'salah_al_din',
    name: 'Salah Al Din',
    line: 'Green Line',
    coordinates: { lat: 25.2705, lng: 55.3737 },
    address: 'Salah Al Din Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'union_green',
    name: 'Union',
    line: 'Green Line',
    coordinates: { lat: 25.2555, lng: 55.3662 },
    address: 'Union Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'baniyas_square',
    name: 'Baniyas Square',
    line: 'Green Line',
    coordinates: { lat: 25.2711, lng: 55.3740 },
    address: 'Baniyas Square Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'golden_souq',
    name: 'Golden Souq',
    line: 'Green Line',
    coordinates: { lat: 25.2717, lng: 55.3743 },
    address: 'Golden Souq Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_ras_green',
    name: 'Al Ras',
    line: 'Green Line',
    coordinates: { lat: 25.2639, lng: 55.3704 },
    address: 'Al Ras Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_ghubaiba_green',
    name: 'Al Ghubaiba',
    line: 'Green Line',
    coordinates: { lat: 25.2645, lng: 55.3707 },
    address: 'Al Ghubaiba Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_fahidi',
    name: 'Al Fahidi',
    line: 'Green Line',
    coordinates: { lat: 25.2723, lng: 55.3746 },
    address: 'Al Fahidi Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'burjuman_green',
    name: 'BurJuman',
    line: 'Green Line',
    coordinates: { lat: 25.2561, lng: 55.3665 },
    address: 'BurJuman Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'al_jadaf',
    name: 'Al Jadaf',
    line: 'Green Line',
    coordinates: { lat: 25.2729, lng: 55.3749 },
    address: 'Al Jadaf Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'creek',
    name: 'Creek',
    line: 'Green Line',
    coordinates: { lat: 25.2735, lng: 55.3752 },
    address: 'Creek Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'dubai_healthcare_city_green',
    name: 'Dubai Healthcare City',
    line: 'Green Line',
    coordinates: { lat: 25.2621, lng: 55.3695 },
    address: 'Dubai Healthcare City Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'oud_metha_green',
    name: 'Oud Metha',
    line: 'Green Line',
    coordinates: { lat: 25.2627, lng: 55.3698 },
    address: 'Oud Metha Metro Station, Dubai, UAE',
    color: '#00A651',
  },
  {
    id: 'dubai_creek_green',
    name: 'Dubai Creek',
    line: 'Green Line',
    coordinates: { lat: 25.2633, lng: 55.3701 },
    address: 'Dubai Creek Metro Station, Dubai, UAE',
    color: '#00A651',
  },
];

export function MetroStationSelector({
  onStationSelect,
  disabled = false,
  className = '',
}: MetroStationSelectorProps) {
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter stations based on search term
  const filteredStations = DUBAI_METRO_STATIONS.filter(station =>
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.line.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStation = DUBAI_METRO_STATIONS.find(
    station => station.id === selectedStationId
  );

  const handleStationChange = (stationId: string) => {
    if (!stationId) {
      setSelectedStationId('');
      return;
    }

    setSelectedStationId(stationId);
    const station = DUBAI_METRO_STATIONS.find(s => s.id === stationId);

    if (station) {
      const location: TransportationSegmentLocation = {
        lat: station.coordinates.lat,
        lng: station.coordinates.lng,
        address: station.address,
        formatted_address: station.address,
        city: 'Dubai',
        area: station.name,
        building_name: `${station.name} Metro Station`,
        place_id: `metro_${station.id}`,
      };

      onStationSelect(station, location);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Metro Station
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by station name or line..."
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            border-gray-300
          `}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Metro Station
        </label>
        <select
          value={selectedStationId}
          onChange={(e) => handleStationChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            border-gray-300
          `}
        >
          <option value="">Choose a metro station...</option>
          {filteredStations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} ({station.line})
            </option>
          ))}
        </select>
      </div>

      {selectedStation && (
        <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Train className="w-5 h-5 text-purple-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-purple-900">
                  {selectedStation.name}
                </h4>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: selectedStation.color }}
                >
                  {selectedStation.line}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-purple-900 font-medium">Address</div>
                    <div className="text-sm text-purple-800">{selectedStation.address}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-purple-900 font-medium">Coordinates</div>
                    <div className="text-sm text-purple-800">
                      {selectedStation.coordinates.lat.toFixed(6)}, {selectedStation.coordinates.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-purple-100 rounded border border-purple-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-xs font-medium text-purple-800">
                    Metro station pickup location selected
                  </span>
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  Station ID: {selectedStation.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredStations.length === 0 && searchTerm && (
        <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-center space-x-2">
            <Train className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              No metro stations found matching "{searchTerm}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
