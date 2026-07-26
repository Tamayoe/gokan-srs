interface JlptChipProps {
    level: number;
}

export function JlptChip({ level }: JlptChipProps) {
    return (
        <span className="px-2 py-0.5 text-xs rounded border border-accent/30 text-accent font-gothic font-medium whitespace-nowrap">
            N{level}
        </span>
    );
}
