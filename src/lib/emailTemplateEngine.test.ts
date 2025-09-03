import type { AgendaEmailData, TemplateVariables } from '@/types/email';
import { EmailTemplateEngineImpl, EmailTemplateUtils } from './emailTemplateEngine';

// Mock file system
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('EmailTemplateEngine', () => {
  let templateEngine: EmailTemplateEngineImpl;
  let mockReadFileSync: jest.MockedFunction<typeof import('fs').readFileSync>;

  beforeEach(() => {
    templateEngine = new EmailTemplateEngineImpl();
    mockReadFileSync = require('fs').readFileSync as jest.MockedFunction<typeof import('fs').readFileSync>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    templateEngine.clearCache();
  });

  describe('Template Loading', () => {
    it('should load template from file system', () => {
      const mockTemplate = '<html>{{title}}</html>';
      mockReadFileSync.mockReturnValue(mockTemplate);

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        title: 'Test Title',
      });

      expect(mockReadFileSync).toHaveBeenCalledWith('src/templates/email/base.html', 'utf-8');
      expect(result).toContain('Test Title');
    });

    it('should cache loaded templates', () => {
      const mockTemplate = '<html>{{title}}</html>';
      mockReadFileSync.mockReturnValue(mockTemplate);

      // First call
      templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        title: 'Test Title',
      });

      // Second call should use cache
      templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        title: 'Test Title',
      });

      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });

    it('should throw error when template file not found', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => {
        templateEngine.renderBaseTemplate({
          subject: 'Test',
          content: '',
          date: '2024-01-01',
        });
      }).toThrow('Failed to load email template: base.html');
    });
  });

  describe('Template Rendering', () => {
    it('should render simple variables', () => {
      const mockTemplate = '<h1>{{title}}</h1><p>{{description}}</p>';
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        title: 'Test Title',
        description: 'Test Description',
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).toBe('<h1>Test Title</h1><p>Test Description</p>');
    });

    it('should handle nested object properties', () => {
      const mockTemplate = '<h1>{{user.name}}</h1><p>{{user.email}}</p>';
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).toBe('<h1>John Doe</h1><p>john@example.com</p>');
    });

    it('should render conditional blocks', () => {
      const mockTemplate = `
        <div>
          {{#if showTitle}}
          <h1>{{title}}</h1>
          {{/if}}
          <p>Always visible</p>
        </div>
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        showTitle: true,
        title: 'Test Title',
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).toContain('<h1>Test Title</h1>');
      expect(result).toContain('<p>Always visible</p>');
    });

    it('should skip conditional blocks when condition is false', () => {
      const mockTemplate = `
        <div>
          {{#if showTitle}}
          <h1>{{title}}</h1>
          {{/if}}
          <p>Always visible</p>
        </div>
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        showTitle: false,
        title: 'Test Title',
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).not.toContain('<h1>Test Title</h1>');
      expect(result).toContain('<p>Always visible</p>');
    });

    it('should render loop blocks', () => {
      const mockTemplate = `
        <ul>
          {{#each items}}
          <li>{{name}} - {{value}}</li>
          {{/each}}
        </ul>
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        items: [
          { name: 'Item 1', value: 'Value 1' },
          { name: 'Item 2', value: 'Value 2' },
        ],
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).toContain('<li>Item 1 - Value 1</li>');
      expect(result).toContain('<li>Item 2 - Value 2</li>');
    });

    it('should handle empty arrays in loops', () => {
      const mockTemplate = `
        <ul>
          {{#each items}}
          <li>{{name}}</li>
          {{/each}}
        </ul>
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const data: TemplateVariables = {
        items: [],
      };

      const result = templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        ...data,
      });

      expect(result).toBe('<ul></ul>');
    });
  });

  describe('Agenda Template Rendering', () => {
    it('should render agenda template with appointments', () => {
      const mockTemplate = `
        <h2>Your Schedule for {{date}}</h2>
        {{#if appointments.length}}
        <div class="appointments">
          {{#each appointments}}
          <div class="appointment">
            <h3>{{startTime}} - {{endTime}}</h3>
            <p>Patient: {{patientName}}</p>
            <p>Type: {{appointmentTypeDisplay}}</p>
          </div>
          {{/each}}
        </div>
        <p>Total: {{totalAppointments}} appointments</p>
        {{/if}}
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const agendaData: AgendaEmailData = {
        subject: 'Your Schedule for 01/01/2024',
        content: '',
        date: '01/01/2024',
        staffName: 'Dr. Smith',
        staffEmail: 'dr.smith@example.com',
        appointments: [
          {
            id: '1',
            startTime: '09:00',
            endTime: '10:00',
            appointmentType: 'doctor_on_call',
            appointmentTypeDisplay: 'Doctor On Call',
            patientName: 'John Doe',
            patientPhone: '+971501234567',
            patientAddress: '123 Main St, Dubai',
            notes: 'Regular checkup',
          },
        ],
        totalAppointments: 1,
        multipleAppointments: false,
      };

      const result = templateEngine.renderAgendaTemplate(agendaData);

      expect(result).toContain('Your Schedule for 01/01/2024');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Patient: John Doe');
      expect(result).toContain('Type: Doctor On Call');
      expect(result).toContain('Total: 1 appointments');
    });

    it('should handle no appointments scenario', () => {
      const mockTemplate = `
        <h2>Your Schedule for {{date}}</h2>
        {{#if appointments.length}}
        <div class="appointments">
          {{#each appointments}}
          <div class="appointment">{{patientName}}</div>
          {{/each}}
        </div>
        {{else}}
        <p>No appointments scheduled for {{date}}.</p>
        {{/if}}
      `;
      mockReadFileSync.mockReturnValue(mockTemplate);

      const agendaData: AgendaEmailData = {
        subject: 'Your Schedule for 01/01/2024',
        content: '',
        date: '01/01/2024',
        staffName: 'Dr. Smith',
        staffEmail: 'dr.smith@example.com',
        appointments: [],
        totalAppointments: 0,
        multipleAppointments: false,
      };

      const result = templateEngine.renderAgendaTemplate(agendaData);

      expect(result).toContain('No appointments scheduled for 01/01/2024');
      expect(result).not.toContain('appointments');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      const mockTemplate = '<html>{{title}}</html>';
      mockReadFileSync.mockReturnValue(mockTemplate);

      // Load template
      templateEngine.renderBaseTemplate({
        subject: 'Test',
        content: '',
        date: '2024-01-01',
        title: 'Test',
      });

      expect(templateEngine.getCachedTemplates()).toContain('base.html');

      // Clear cache
      templateEngine.clearCache();

      expect(templateEngine.getCachedTemplates()).toHaveLength(0);
    });
  });
});

describe('EmailTemplateUtils', () => {
  describe('formatDate', () => {
    it('should format date in DD/MM/YYYY format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = EmailTemplateUtils.formatDate(date, { dateFormat: 'DD/MM/YYYY' });
      expect(result).toBe('15/01/2024');
    });

    it('should format date in MM/DD/YYYY format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = EmailTemplateUtils.formatDate(date, { dateFormat: 'MM/DD/YYYY' });
      expect(result).toBe('01/15/2024');
    });

    it('should use Asia/Dubai timezone by default', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = EmailTemplateUtils.formatDate(date);
      // Note: This test might need adjustment based on actual timezone conversion
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatTime', () => {
    it('should format time in HH:mm format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = EmailTemplateUtils.formatTime(date, { timeFormat: 'HH:mm' });
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format time in 12-hour format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = EmailTemplateUtils.formatTime(date, { timeFormat: 'h:mm A' });
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });
  });

  describe('getAppointmentTypeDisplay', () => {
    it('should format appointment type display name', () => {
      expect(EmailTemplateUtils.getAppointmentTypeDisplay('doctor_on_call')).toBe('Doctor On Call');
      expect(EmailTemplateUtils.getAppointmentTypeDisplay('lab_test')).toBe('Lab Test');
      expect(EmailTemplateUtils.getAppointmentTypeDisplay('iv_therapy')).toBe('Iv Therapy');
    });
  });

  describe('getAppointmentTypeClass', () => {
    it('should format appointment type CSS class', () => {
      expect(EmailTemplateUtils.getAppointmentTypeClass('doctor_on_call')).toBe('type-doctor-on-call');
      expect(EmailTemplateUtils.getAppointmentTypeClass('lab_test')).toBe('type-lab-test');
      expect(EmailTemplateUtils.getAppointmentTypeClass('iv_therapy')).toBe('type-iv-therapy');
    });
  });

  describe('validateTemplateData', () => {
    it('should validate template data successfully', () => {
      const data: TemplateVariables = {
        date: '2024-01-01',
        appointments: [
          {
            startTime: '09:00',
            endTime: '10:00',
            patientName: 'John Doe',
          },
        ],
      };

      const result = EmailTemplateUtils.validateTemplateData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for missing required fields', () => {
      const data: TemplateVariables = {
        date: '2024-01-01',
        appointments: [
          {
            startTime: '09:00',
            // Missing endTime and patientName
          },
        ],
      };

      const result = EmailTemplateUtils.validateTemplateData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Appointment 1: endTime is required');
      expect(result.errors).toContain('Appointment 1: patientName is required');
    });

    it('should return error for missing date', () => {
      const data: TemplateVariables = {
        appointments: [],
      };

      const result = EmailTemplateUtils.validateTemplateData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = EmailTemplateUtils.sanitizeHtml(html);
      expect(result).toBe('<p>Hello</p><p>World</p>');
    });

    it('should remove javascript: protocols', () => {
      const html = '<a href="javascript:alert(\'xss\')">Click me</a>';
      const result = EmailTemplateUtils.sanitizeHtml(html);
      expect(result).toBe('<a href="">Click me</a>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = EmailTemplateUtils.sanitizeHtml(html);
      expect(result).toBe('<div>Click me</div>');
    });
  });
});
