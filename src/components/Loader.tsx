
export type LoaderProps = {
    title: string;
    description?: string;
}

export function Loader({ title, description }: LoaderProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200">
            <div className="flex flex-col items-center gap-8">
                {/* Animated Kanji Logo */}
                <div className="relative">
                    <svg
                        width="120"
                        height="120"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="animate-pulse-slow"
                    >
                        <rect
                            x="2"
                            y="2"
                            width="96"
                            height="96"
                            className="stroke-primary"
                            strokeWidth="3"
                            fill="none"
                        />
                        <text
                            x="50"
                            y="50"
                            fontSize="42"
                            fontFamily="'Noto Serif JP', serif"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-primary"
                            fontWeight="400"
                        >
                            語感
                        </text>
                    </svg>

                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin-slow">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full opacity-60"></div>
                    </div>
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDelay: '0.5s' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full opacity-60"></div>
                    </div>
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDelay: '1s' }}>
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 bg-primary rounded-full opacity-60"></div>
                    </div>
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDelay: '1.5s' }}>
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 bg-primary rounded-full opacity-60"></div>
                    </div>
                </div>

                {/* Loading text */}
                <div className="flex flex-col items-center gap-2">
                    <p className="text-primary font-serif text-lg animate-fade-in">
                        {title}
                    </p>
                    {description && <p className="text-secondary text-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {description}
                    </p>}
                </div>
            </div>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.7;
                        transform: scale(0.98);
                    }
                }

                @keyframes spin-slow {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-pulse-slow {
                    animation: pulse-slow 2s ease-in-out infinite;
                }

                .animate-spin-slow {
                    animation: spin-slow 4s linear infinite;
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
}
