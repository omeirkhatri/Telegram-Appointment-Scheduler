# Accessibility Testing for MediCare Scheduler

This directory contains comprehensive accessibility tests for the MediCare Scheduler application, ensuring it meets WCAG 2.1 AA standards and provides an inclusive user experience for all users, including those with disabilities.

## Accessibility Standards

The application follows these accessibility standards:
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines 2.1 Level AA
- **Section 508**: US federal accessibility requirements
- **ADA Compliance**: Americans with Disabilities Act compliance
- **Healthcare Accessibility**: Special considerations for healthcare applications

## Test Structure

### Core Accessibility Tests
- **Accessibility Audit** (`accessibility-audit.spec.ts`) - Comprehensive axe-core audits for all pages
- **Keyboard Navigation** (`keyboard-navigation.spec.ts`) - Keyboard accessibility and navigation testing
- **Screen Reader Compatibility** (`screen-reader-compatibility.spec.ts`) - Screen reader and assistive technology testing
- **Visual Accessibility** (`visual-accessibility.spec.ts`) - Visual accessibility and contrast testing

### Test Utilities
- **Accessibility Helpers** (`utils/accessibility-helpers.ts`) - Reusable accessibility testing utilities
- **Axe-Core Integration** - Automated accessibility testing with axe-core
- **Custom Accessibility Checks** - Healthcare-specific accessibility validations

## Running Accessibility Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npm run test:e2e:install`
3. Start the application: `npm run dev`
4. Start Supabase: `npx supabase start`

### Commands
```bash
# Run all accessibility tests
npm run test:accessibility

# Run accessibility tests in CI mode
npm run test:accessibility:ci

# Run specific accessibility test file
npx playwright test tests/accessibility/accessibility-audit.spec.ts --project=accessibility

# Run accessibility tests with axe-core only
npx playwright test tests/accessibility/accessibility-audit.spec.ts --project=accessibility --grep "axe-core"
```

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- **Perceivable**: Information must be presentable in ways users can perceive
- **Operable**: Interface components must be operable by all users
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough for various assistive technologies

### Key Accessibility Features
- **Keyboard Navigation**: All functionality accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 contrast ratio for normal text
- **Focus Management**: Clear focus indicators and logical tab order
- **Alternative Text**: Descriptive alt text for all images
- **Form Labels**: Proper labeling for all form elements
- **Error Handling**: Accessible error messages and validation

## Test Coverage

### Accessibility Audit Tests
- Dashboard page accessibility
- Patients page accessibility
- Staff page accessibility
- Appointments page accessibility
- Settings page accessibility
- Patient form modal accessibility
- Staff form modal accessibility
- Appointment form modal accessibility
- Copy appointment modal accessibility
- Calendar context menu accessibility
- Appointment filters accessibility
- Comprehensive cross-page audit

### Keyboard Navigation Tests
- Tab navigation through all pages
- Shift+Tab reverse navigation
- Enter key activation for buttons
- Escape key to close modals
- Arrow key navigation in select elements
- Focus management in dynamic content
- Calendar keyboard navigation
- Form keyboard navigation
- Modal keyboard navigation

### Screen Reader Compatibility Tests
- Proper heading hierarchy (h1 → h2 → h3)
- Form label associations
- ARIA landmark structure
- Table accessibility
- Button and link accessibility
- Error message accessibility
- Dynamic content announcements
- Focus management

### Visual Accessibility Tests
- Color contrast compliance
- Focus indicator visibility
- Image alt text
- Text readability
- Mobile touch targets (44x44px minimum)
- High contrast mode support
- Zoom support up to 200%
- Reduced motion preferences
- Dark mode accessibility

## Accessibility Metrics

### Violation Severity Levels
- **Critical**: Blocks core functionality
- **Serious**: Significantly impacts usability
- **Moderate**: Some impact on usability
- **Minor**: Minor impact on usability

### Success Criteria
- **Zero Critical Violations**: No critical accessibility issues
- **Zero Serious Violations**: No serious accessibility issues
- **Minimal Moderate Violations**: Few moderate issues acceptable
- **WCAG 2.1 AA Compliance**: Meets all AA level requirements

## Healthcare-Specific Accessibility

### Medical Information Accessibility
- **Clear Language**: Medical terms explained in plain language
- **Emergency Information**: Critical information prominently displayed
- **Medication Information**: Clear dosage and timing information
- **Appointment Details**: Comprehensive appointment information
- **Contact Information**: Easy access to emergency contacts

### Healthcare Workflow Accessibility
- **Patient Management**: Accessible patient data entry and retrieval
- **Staff Scheduling**: Clear staff availability and assignment
- **Appointment Booking**: Intuitive appointment scheduling
- **Calendar Navigation**: Easy calendar interaction
- **Document Management**: Accessible document upload and viewing

## CI/CD Integration

### GitHub Actions
Accessibility tests run automatically on:
- Push to main branch (full accessibility suite)
- Pull requests (accessibility regression detection)
- Scheduled runs (accessibility monitoring)

### Accessibility Reports
- JSON reports uploaded as artifacts
- Detailed violation information
- Remediation recommendations
- PR comments with accessibility results
- Accessibility trend analysis

## Accessibility Testing Tools

### Automated Testing
- **axe-core**: Primary accessibility testing engine
- **Playwright**: Browser automation for accessibility tests
- **@axe-core/playwright**: Playwright integration for axe-core

### Manual Testing
- **Screen Readers**: NVDA, JAWS, VoiceOver testing
- **Keyboard Navigation**: Tab, arrow, and function key testing
- **Voice Control**: Dragon NaturallySpeaking, Voice Control testing
- **High Contrast**: Windows High Contrast Mode testing

## Debugging Accessibility Issues

### Local Debugging
```bash
# Run accessibility tests with debug output
npx playwright test tests/accessibility --project=accessibility --debug

# Run specific test with trace
npx playwright test tests/accessibility/accessibility-audit.spec.ts --project=accessibility --trace on
```

### Accessibility Analysis
1. Check accessibility reports in `accessibility-reports/` directory
2. Review axe-core violation details
3. Test with actual screen readers
4. Verify keyboard navigation manually
5. Check color contrast with tools

### Common Accessibility Issues
- **Missing Alt Text**: Add descriptive alt text to images
- **Poor Color Contrast**: Increase contrast ratios
- **Missing Labels**: Add proper form labels
- **Keyboard Traps**: Ensure keyboard navigation works
- **Focus Management**: Implement proper focus handling

## Best Practices

### Development Guidelines
1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Add ARIA attributes where needed
3. **Keyboard Support**: Ensure keyboard accessibility
4. **Color Independence**: Don't rely solely on color
5. **Text Alternatives**: Provide text alternatives for images

### Testing Guidelines
1. **Automated First**: Use automated tools for initial testing
2. **Manual Verification**: Test with actual assistive technologies
3. **User Testing**: Include users with disabilities in testing
4. **Regular Audits**: Perform accessibility audits regularly
5. **Continuous Monitoring**: Monitor accessibility in CI/CD

### Healthcare Considerations
1. **Emergency Access**: Ensure critical functions are accessible
2. **Medical Accuracy**: Maintain accuracy while improving accessibility
3. **Privacy**: Protect patient information during accessibility testing
4. **Compliance**: Meet healthcare accessibility requirements
5. **Training**: Train staff on accessibility features

## Maintenance

### Adding New Accessibility Tests
1. Create test file in appropriate directory
2. Use existing accessibility helpers and utilities
3. Add test to CI/CD pipeline if needed
4. Update this README with new test descriptions

### Updating Accessibility Standards
1. Update WCAG compliance requirements
2. Ensure tests reflect current standards
3. Update CI/CD expectations
4. Document standard changes

### Accessibility Monitoring
1. Review accessibility reports regularly
2. Investigate accessibility regressions
3. Update accessibility requirements as needed
4. Optimize based on test results

## Resources

### Accessibility Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Section 508 Standards](https://www.section508.gov/)
- [ADA Compliance Guide](https://www.ada.gov/)

### Testing Tools
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [WebAIM Resources](https://webaim.org/)

### Healthcare Accessibility
- [Healthcare Accessibility Guidelines](https://www.hhs.gov/web/section-508/healthcare-accessibility/index.html)
- [Medical Device Accessibility](https://www.fda.gov/medical-devices/device-regulation-and-guidance/guidance-documents/medical-device-accessibility-guidance)
- [Healthcare IT Accessibility](https://www.healthit.gov/topic/accessibility)
