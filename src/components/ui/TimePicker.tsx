
interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, disabled = false, className = '' }: TimePickerProps) {
  // Parse the time value
  const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0];

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));

  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = [
    { value: 0, label: '00' },
    { value: 15, label: '15' },
    { value: 30, label: '30' },
    { value: 45, label: '45' }
  ];

  const handleHourChange = (newHours: number) => {
    const timeString = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleMinuteChange = (newMinutes: number) => {
    const timeString = `${hours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {/* Hours Selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-gray-500 mb-2 text-center font-medium">Hour</label>
        <select
          value={hours}
          onChange={(e) => handleHourChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-24 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium text-center text-lg shadow-sm"
        >
          {hourOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="flex flex-col items-center">
        <div className="h-8"></div>
        <div className="text-4xl font-bold text-gray-400">:</div>
      </div>

      {/* Minutes Selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-gray-500 mb-2 text-center font-medium">Min</label>
        <select
          value={minutes}
          onChange={(e) => handleMinuteChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-24 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium text-center text-lg shadow-sm"
        >
          {minuteOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
