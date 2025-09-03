import type {
    AgendaEmailData,
    EmailTemplateData,
    EmailTemplateEngine,
    TemplateRenderOptions,
    TemplateVariables,
} from '@/types/email';
import { readFileSync } from 'fs';
import { join } from 'path';

export class EmailTemplateEngineImpl implements EmailTemplateEngine {
  private templateCache = new Map<string, string>();
  private readonly templateDir: string;

  constructor(templateDir: string = join(process.cwd(), 'src', 'templates', 'email')) {
    this.templateDir = templateDir;
  }

  /**
   * Render the agenda email template with appointment data
   */
  renderAgendaTemplate(data: AgendaEmailData): string {
    const template = this.loadTemplate('agenda.html');
    return this.renderTemplate(template, data);
  }

  /**
   * Render the base email template
   */
  renderBaseTemplate(data: EmailTemplateData): string {
    const template = this.loadTemplate('base.html');
    return this.renderTemplate(template, data);
  }

  /**
   * Load template from file system with caching
   */
  private loadTemplate(filename: string): string {
    if (this.templateCache.has(filename)) {
      return this.templateCache.get(filename)!;
    }

    try {
      const templatePath = join(this.templateDir, filename);
      const template = readFileSync(templatePath, 'utf-8');
      this.templateCache.set(filename, template);
      return template;
    } catch (error) {
      throw new Error(`Failed to load email template: ${filename}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render template with data using simple template engine
   */
  private renderTemplate(template: string, data: TemplateVariables): string {
    let rendered = template;

    // Replace simple variables {{variable}}
    rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = this.renderConditionals(rendered, data);

    // Handle loops {{#each array}}...{{/each}}
    rendered = this.renderLoops(rendered, data);

    return rendered;
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Render conditional blocks
   */
  private renderConditionals(template: string, data: TemplateVariables): string {
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, condition, content) => {
      const trimmedCondition = condition.trim();
      const value = this.getNestedValue(data, trimmedCondition);

      // Check if condition is truthy
      if (this.isTruthy(value)) {
        return this.renderTemplate(content, data);
      }

      return '';
    });
  }

  /**
   * Render loop blocks
   */
  private renderLoops(template: string, data: TemplateVariables): string {
    const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayPath, content) => {
      const trimmedPath = arrayPath.trim();
      const array = this.getNestedValue(data, trimmedPath);

      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        const itemData = {
          ...data,
          ...item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1,
        };
        return this.renderTemplate(content, itemData);
      }).join('');
    });
  }

  /**
   * Check if value is truthy for conditional rendering
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.length > 0;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return true;
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get cached template names
   */
  getCachedTemplates(): string[] {
    return Array.from(this.templateCache.keys());
  }
}

// Default template engine instance
export const emailTemplateEngine = new EmailTemplateEngineImpl();

// Utility functions for common template operations
export class EmailTemplateUtils {
  /**
   * Format date for email templates
   */
  static formatDate(date: Date, options: TemplateRenderOptions = {}): string {
    const { dateFormat = 'DD/MM/YYYY', timezone = 'Asia/Dubai' } = options;

    // Convert to Dubai timezone
    const dubaiDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return dubaiDate.toLocaleDateString('en-GB');
      case 'MM/DD/YYYY':
        return dubaiDate.toLocaleDateString('en-US');
      case 'YYYY-MM-DD':
        return dubaiDate.toISOString().split('T')[0];
      default:
        return dubaiDate.toLocaleDateString('en-GB');
    }
  }

  /**
   * Format time for email templates
   */
  static formatTime(date: Date, options: TemplateRenderOptions = {}): string {
    const { timeFormat = 'HH:mm', timezone = 'Asia/Dubai' } = options;

    // Convert to Dubai timezone
    const dubaiDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    switch (timeFormat) {
      case 'HH:mm':
        return dubaiDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      case 'h:mm A':
        return dubaiDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      default:
        return dubaiDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
    }
  }

  /**
   * Get appointment type display name
   */
  static getAppointmentTypeDisplay(type: string): string {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get appointment type CSS class
   */
  static getAppointmentTypeClass(type: string): string {
    return `type-${type.replace(/_/g, '-')}`;
  }

  /**
   * Validate email template data
   */
  static validateTemplateData(data: TemplateVariables): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.date) {
      errors.push('Date is required');
    }

    if (data.appointments && Array.isArray(data.appointments)) {
      data.appointments.forEach((appointment: any, index: number) => {
        if (!appointment.startTime) {
          errors.push(`Appointment ${index + 1}: startTime is required`);
        }
        if (!appointment.endTime) {
          errors.push(`Appointment ${index + 1}: endTime is required`);
        }
        if (!appointment.patientName) {
          errors.push(`Appointment ${index + 1}: patientName is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML content for email
   */
  static sanitizeHtml(html: string): string {
    // Basic HTML sanitization for email templates
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

// Export default instance
export default emailTemplateEngine;
