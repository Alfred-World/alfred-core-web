'use client'

import { styled, keyframes } from '@mui/material/styles'
import Box from '@mui/material/Box'

// ============================================================
// SHIMMER ANIMATION
// ============================================================

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

// ============================================================
// STYLED COMPONENTS
// ============================================================

const SkeletonRow = styled('tr')<{ delay?: number }>(({ delay = 0 }) => ({
    animation: `${fadeIn} 0.3s ease-out forwards`,
    animationDelay: `${delay}ms`,
    opacity: 0,
}))

const SkeletonCell = styled('td')({
    padding: '12px 16px',
})

const SkeletonBox = styled(Box)<{
    variant?: 'text' | 'rectangular' | 'circular'
    width?: string | number
    height?: number
}>(({ theme, variant = 'text', width = '100%', height = 20 }) => ({
    backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)',
    backgroundImage: `linear-gradient(
        90deg,
        transparent 0%,
        ${theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.5)'
        } 50%,
        transparent 100%
    )`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 1.5s ease-in-out infinite, ${pulse} 2s ease-in-out infinite`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: `${height}px`,
    borderRadius: variant === 'circular'
        ? '50%'
        : variant === 'rectangular'
            ? '4px'
            : '8px',
    display: 'inline-block',
}))

const CheckboxSkeleton = styled(Box)(({ theme }) => ({
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)',
    backgroundImage: `linear-gradient(
        90deg,
        transparent 0%,
        ${theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.5)'
        } 50%,
        transparent 100%
    )`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 1.5s ease-in-out infinite`,
}))

// ============================================================
// COMPONENT
// ============================================================

export interface TableSkeletonProps {

    /** Number of rows to display */
    rowCount?: number

    /** Number of columns to display */
    columnCount: number

    /** Whether to show checkbox column */
    showCheckbox?: boolean

    /** Custom column widths (percentages) */
    columnWidths?: (number | string)[]
}

export function TableSkeleton({
    rowCount = 5,
    columnCount,
    showCheckbox = false,
    columnWidths,
}: TableSkeletonProps) {
    // Generate random widths for variety
    const getWidth = (rowIndex: number, colIndex: number): string => {
        if (columnWidths?.[colIndex]) {
            const w = columnWidths[colIndex]


            return typeof w === 'number' ? `${w}%` : w
        }


        // Random width between 50% and 90% for text variety
        const seed = (rowIndex * 7 + colIndex * 13) % 40


        return `${50 + seed}%`
    }

    return (
        <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <SkeletonRow key={`skeleton-row-${rowIndex}`} delay={rowIndex * 50}>
                    {showCheckbox && (
                        <SkeletonCell>
                            <CheckboxSkeleton />
                        </SkeletonCell>
                    )}
                    {Array.from({ length: columnCount }).map((_, colIndex) => (
                        <SkeletonCell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                            <SkeletonBox
                                variant='text'
                                width={getWidth(rowIndex, colIndex)}
                                height={20}
                            />
                        </SkeletonCell>
                    ))}
                </SkeletonRow>
            ))}
        </tbody>
    )
}

export default TableSkeleton
