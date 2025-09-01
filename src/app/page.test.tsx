import { render, screen } from '@/utils/test-utils'
import Home from './page'

describe('Home Page', () => {
  it('should render the main heading', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', { name: /MediCare Scheduler/i })
    expect(heading).toBeInTheDocument()
  })

  it('should render the description', () => {
    render(<Home />)
    
    const description = screen.getByText(/Healthcare appointment scheduling system for Best DOC/i)
    expect(description).toBeInTheDocument()
  })

  it('should render status indicators', () => {
    render(<Home />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('should render healthcare theme showcase cards', () => {
    render(<Home />)
    
    expect(screen.getByText('Medical Blue')).toBeInTheDocument()
    expect(screen.getByText('Health Green')).toBeInTheDocument()
    expect(screen.getByText('Emergency Red')).toBeInTheDocument()
  })

  it('should render progress indicators', () => {
    render(<Home />)
    
    expect(screen.getByText('Next.js 14 Setup')).toBeInTheDocument()
    expect(screen.getByText('Tailwind Healthcare Theme')).toBeInTheDocument()
    expect(screen.getByText('Supabase Setup')).toBeInTheDocument()
    expect(screen.getByText('Database Schema')).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<Home />)
    
    expect(screen.getByRole('button', { name: /View Calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Manage Appointments/i })).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<Home />)
    
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toBeInTheDocument()
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeInTheDocument()
    })
  })
})
