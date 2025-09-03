import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services', () => ({
  appointmentService: {
    getAppointmentStatistics: jest.fn(),
  },
  auditTrailService: {
    getAuditStatistics: jest.fn(),
  },
  emailDeliveryService: {
    getDeliveryStatistics: jest.fn(),
  },
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('/api/reports/statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return statistics with default date range', async () => {
    const { appointmentService, auditTrailService, emailDeliveryService } = require('@/services');

    // Mock service responses
    appointmentService.getAppointmentStatistics.mockResolvedValue({
      total: 100,
      byStatus: { scheduled: 50, completed: 30, cancelled: 20 },
      byType: { consultation: 60, follow_up: 40 },
    });

    auditTrailService.getAuditStatistics.mockResolvedValue({
      success: true,
      data: { statistics: [] },
    });

    emailDeliveryService.getDeliveryStatistics.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/reports/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('appointments');
    expect(data.data).toHaveProperty('patients');
    expect(data.data).toHaveProperty('staff');
    expect(data.data).toHaveProperty('emailDelivery');
    expect(data.data).toHaveProperty('auditTrail');
    expect(data.data).toHaveProperty('systemHealth');
  });

  it('should return statistics with custom date range', async () => {
    const { appointmentService, auditTrailService, emailDeliveryService } = require('@/services');

    // Mock service responses
    appointmentService.getAppointmentStatistics.mockResolvedValue({
      total: 50,
      byStatus: { scheduled: 25, completed: 15, cancelled: 10 },
      byType: { consultation: 30, follow_up: 20 },
    });

    auditTrailService.getAuditStatistics.mockResolvedValue({
      success: true,
      data: { statistics: [] },
    });

    emailDeliveryService.getDeliveryStatistics.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/reports/statistics?dateFrom=2024-01-01&dateTo=2024-01-31');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.dateRange).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
    });
  });

  it('should handle service errors gracefully', async () => {
    const { appointmentService } = require('@/services');

    // Mock service error
    appointmentService.getAppointmentStatistics.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/reports/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database connection failed');
  });

  it('should include generatedAt timestamp', async () => {
    const { appointmentService, auditTrailService, emailDeliveryService } = require('@/services');

    // Mock service responses
    appointmentService.getAppointmentStatistics.mockResolvedValue({
      total: 100,
      byStatus: {},
      byType: {},
    });

    auditTrailService.getAuditStatistics.mockResolvedValue({
      success: true,
      data: { statistics: [] },
    });

    emailDeliveryService.getDeliveryStatistics.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/reports/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generatedAt).toBeDefined();
    expect(new Date(data.generatedAt)).toBeInstanceOf(Date);
  });
});
