import type { ButtonHTMLAttributes } from 'react'

export function GameButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`primary-button ${className}`} {...props}><span className="windsor">{children}</span></button>
}
