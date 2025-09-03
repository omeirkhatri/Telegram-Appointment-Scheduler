import { render, screen, waitFor } from '@testing-library/react';
import { SyncStatusCard } from './SyncStatusCard';

// Mock fetch
global.fetch = jest.fn();

describe('SyncStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SyncStatusCard />);

    expect(screen.getByText('Loading sync status...')).toBeInTheDocument();
    expect(screen.getByText('Loading sync status...').closest('div')).toBeInTheDocument();
  });

  it('renders sync statistics when data is loaded', async () => {
    const mockStaffData = {
      success: true,
      data: [
        { id: '1', first_name: 'John', last_name: 'Doe', google_calendar_id: 'john@example.com' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', google_calendar_id: 'jane@example.com' },
      ],
    };

    const mockValidationResponse = {
      success: true,
      data: { isValid: true, isConnected: true },
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => mockStaffData,
      })
      .mockResolvedValueOnce({
        json: async () => mockValidationResponse,
      })
      .mockResolvedValueOnce({
        json: async () => mockValidationResponse,
      });

    render(<SyncStatusCard />);

    await waitFor(() => {
      expect(screen.getByText('Sync Status')).toBeInTheDocument();
    });

    expect(screen.getByText('Google Calendar synchronization overview')).toBeInTheDocument();
    expect(screen.getByText('Overall Status')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Connections')).toBeInTheDocument();
    expect(screen.getByText('Failed Connections')).toBeInTheDocument();
  });

  it('renders error state when data loading fails', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<SyncStatusCard />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load sync status')).toBeInTheDocument();
    });
  });

  it('displays correct status indicators', async () => {
    const mockStaffData = {
      success: true,
      data: [
        { id: '1', first_name: 'John', last_name: 'Doe', google_calendar_id: 'john@example.com' },
      ],
    };

    const mockValidationResponse = {
      success: true,
      data: { isValid: true, isConnected: true },
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => mockStaffData,
      })
      .mockResolvedValueOnce({
        json: async () => mockValidationResponse,
      });

    render(<SyncStatusCard />);

    await waitFor(() => {
      expect(screen.getByText('Sync Status')).toBeInTheDocument();
    });

    // Check for status indicators
    expect(screen.getByText('Events Synced Today')).toBeInTheDocument();
    expect(screen.getByText('Events This Week')).toBeInTheDocument();
    expect(screen.getByText('Avg Sync Time')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const mockStaffData = {
      success: true,
      data: [],
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => mockStaffData,
      })
      .mockResolvedValueOnce({
        json: async () => mockStaffData,
      });

    render(<SyncStatusCard />);

    await waitFor(() => {
      expect(screen.getByText('Sync Status')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle('Refresh Status');
    expect(refreshButton).toBeInTheDocument();
  });
});
