import { useTheme } from '@/hooks/useTheme'
import { Button } from './Button'
import { Tooltip } from './Tooltip'
import { Sun, Moon, Monitor } from '@phosphor-icons/react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const icons = {
    light: <Sun className="w-5 h-5" aria-hidden="true" />,
    dark: <Moon className="w-5 h-5" aria-hidden="true" />,
    system: <Monitor className="w-5 h-5" aria-hidden="true" />,
  }

  const labels = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System preference',
  }

  return (
    <Tooltip content={labels[theme]} position="bottom" delay={300}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        aria-label={labels[theme]}
        aria-pressed={theme !== 'system'}
        className="p-2"
      >
        {icons[theme]}
        <span className="sr-only">{labels[theme]}</span>
      </Button>
    </Tooltip>
  )
}