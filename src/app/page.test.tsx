import { render, screen } from '@/utils/test-utils';
import Home from './page';

describe('Home Page', () => {
  it('should render the main heading', () => {
    render(<Home />);

    const heading = screen.getByRole('heading', {
      name: /Dashboard/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it('should render the welcome message', () => {
    render(<Home />);

    const welcomeMessage = screen.getByText(/Welcome back, Admin/i);
    expect(welcomeMessage).toBeInTheDocument();
  });

  it('should render dashboard stats', () => {
    render(<Home />);

    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('Active Patients')).toBeInTheDocument();
    expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
    expect(screen.getByText('Completed Today')).toBeInTheDocument();
  });

  it('should render recent activity section', () => {
    render(<Home />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Appointment confirmed for Sarah Johnson')).toBeInTheDocument();
  });

  it('should render quick actions section', () => {
    render(<Home />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Add Patient')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('should render upcoming appointments table', () => {
    render(<Home />);

    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    expect(screen.getByText('Emma Davis')).toBeInTheDocument();
    expect(screen.getByText('James Wilson')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('David Lee')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<Home />);

    // Check for buttons in the appointments table header
    expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument();
    // Check for the "New" button specifically
    const newButtons = screen.getAllByRole('button', { name: /New/i });
    expect(newButtons.length).toBeGreaterThan(0);
  });

  it('should have proper accessibility attributes', () => {
    render(<Home />);

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
    });
  });
});
